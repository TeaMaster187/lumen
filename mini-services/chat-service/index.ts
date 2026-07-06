import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { Server } from 'socket.io'
// Use the project's generated Prisma client — resolve via the parent project's node_modules
// (the chat-service lives in mini-services/chat-service, so go up 3 levels)
import { PrismaClient } from '../../node_modules/@prisma/client'

const db = new PrismaClient({ log: ['error'] })

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// socket.id -> userId
const socketToUser = new Map<string, string>()
// userId -> Set<socket.id>  (multi-device)
const userToSockets = new Map<string, Set<string>>()

function userOnline(userId: string) {
  return (userToSockets.get(userId)?.size ?? 0) > 0
}

async function emitToUser(userId: string, event: string, payload: unknown) {
  const sockets = userToSockets.get(userId)
  if (!sockets || sockets.size === 0) return
  for (const sid of sockets) {
    io.to(sid).emit(event, payload)
  }
}

async function getChatMemberIds(chatId: string): Promise<string[]> {
  const members = await db.chatMember.findMany({ where: { chatId }, select: { userId: true } })
  return members.map((m) => m.userId)
}

async function getUserChats(userId: string): Promise<string[]> {
  const members = await db.chatMember.findMany({ where: { userId }, select: { chatId: true } })
  return members.map((m) => m.chatId)
}

// Separate HTTP server for internal API (so socket.io's path '/' doesn't swallow it)
const internalPort = 3004
const internalServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'POST' && req.url === '/internal/broadcast') {
    let body = ''
    for await (const chunk of req) body += chunk.toString()
    try {
      const { chatId, message, memberIds } = JSON.parse(body) as {
        chatId: string
        message: unknown
        memberIds: string[]
      }
      for (const uid of memberIds) {
        emitToUser(uid, 'message', { chatId, message })
        emitToUser(uid, 'chat-updated', { chatId })
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, delivered: memberIds.length }))
    } catch (e) {
      console.error('[internal/broadcast] error', e)
      res.writeHead(400)
      res.end('bad request')
    }
    return
  }
  // Broadcast a reaction event to all members of a chat
  if (req.method === 'POST' && req.url === '/internal/reaction') {
    let body = ''
    for await (const chunk of req) body += chunk.toString()
    try {
      const { chatId, messageId, message, memberIds } = JSON.parse(body) as {
        chatId: string
        messageId: string
        message: unknown
        memberIds: string[]
      }
      for (const uid of memberIds) {
        emitToUser(uid, 'reaction', { chatId, messageId, message })
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, delivered: memberIds.length }))
    } catch (e) {
      console.error('[internal/reaction] error', e)
      res.writeHead(400)
      res.end('bad request')
    }
    return
  }
  // Broadcast a message-updated event (e.g. edit)
  if (req.method === 'POST' && req.url === '/internal/message-updated') {
    let body = ''
    for await (const chunk of req) body += chunk.toString()
    try {
      const { chatId, message, memberIds } = JSON.parse(body) as {
        chatId: string
        message: unknown
        memberIds: string[]
      }
      for (const uid of memberIds) {
        emitToUser(uid, 'message-updated', { chatId, message })
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, delivered: memberIds.length }))
    } catch (e) {
      console.error('[internal/message-updated] error', e)
      res.writeHead(400)
      res.end('bad request')
    }
    return
  }
  // Broadcast a message-deleted event
  if (req.method === 'POST' && req.url === '/internal/message-deleted') {
    let body = ''
    for await (const chunk of req) body += chunk.toString()
    try {
      const { chatId, messageId, memberIds } = JSON.parse(body) as {
        chatId: string
        messageId: string
        memberIds: string[]
      }
      for (const uid of memberIds) {
        emitToUser(uid, 'message-deleted', { chatId, messageId })
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, delivered: memberIds.length }))
    } catch (e) {
      console.error('[internal/message-deleted] error', e)
      res.writeHead(400)
      res.end('bad request')
    }
    return
  }
  // Return the list of currently online user IDs
  if (req.method === 'GET' && req.url === '/internal/online') {
    const userIds = Array.from(userToSockets.keys())
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ userIds }))
    return
  }
  if (req.method === 'POST' && req.url === '/internal/presence-ping') {
    let body = ''
    for await (const chunk of req) body += chunk.toString()
    try {
      const { userIds } = JSON.parse(body) as { userIds: string[] }
      const online = userIds.filter(userOnline)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ online }))
    } catch (e) {
      res.writeHead(400)
      res.end('bad request')
    }
    return
  }
  if (req.url === '/health') {
    res.writeHead(200)
    res.end('ok')
    return
  }
  res.writeHead(404)
  res.end('not found')
})

io.on('connection', (socket) => {
  console.log(`[ws] connected ${socket.id}`)

  socket.on('auth', async (payload: { token?: string }) => {
    try {
      const token = payload?.token
      if (!token) {
        socket.emit('auth-error', { message: 'No token provided' })
        return
      }
      const session = await db.session.findUnique({
        where: { token },
        include: { user: true },
      })
      if (!session) {
        socket.emit('auth-error', { message: 'Invalid token' })
        return
      }
      const userId = session.userId

      socketToUser.set(socket.id, userId)
      if (!userToSockets.has(userId)) userToSockets.set(userId, new Set())
      userToSockets.get(userId)!.add(socket.id)

      // Notify this user's chats' peers that they're online now
      const chatIds = await getUserChats(userId)
      for (const chatId of chatIds) {
        const memberIds = await getChatMemberIds(chatId)
        for (const uid of memberIds) {
          if (uid !== userId) emitToUser(uid, 'presence', { userId, online: true })
        }
      }

      socket.emit('auth-ok', { userId, name: session.user.name })
      console.log(`[ws] authed ${socket.id} -> ${session.user.name}`)
    } catch (e) {
      console.error('[ws] auth error', e)
      socket.emit('auth-error', { message: 'Server error' })
    }
  })

  socket.on('typing', async (payload: { chatId?: string; isTyping?: boolean }) => {
    try {
      const userId = socketToUser.get(socket.id)
      if (!userId || !payload?.chatId) return
      const membership = await db.chatMember.findUnique({
        where: { chatId_userId: { chatId: payload.chatId, userId } },
      })
      if (!membership) return
      const memberIds = await getChatMemberIds(payload.chatId)
      const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } })
      for (const uid of memberIds) {
        if (uid !== userId) {
          emitToUser(uid, 'typing', {
            chatId: payload.chatId,
            userId,
            name: user?.name,
            isTyping: !!payload.isTyping,
          })
        }
      }
    } catch (e) {
      console.error('[ws] typing error', e)
    }
  })

  socket.on('read', async (payload: { chatId?: string }) => {
    try {
      const userId = socketToUser.get(socket.id)
      if (!userId || !payload?.chatId) return
      await db.chatMember.update({
        where: { chatId_userId: { chatId: payload.chatId, userId } },
        data: { lastReadAt: new Date() },
      })
    } catch (e) {
      console.error('[ws] read error', e)
    }
  })

  socket.on('disconnect', () => {
    const userId = socketToUser.get(socket.id)
    socketToUser.delete(socket.id)
    if (userId) {
      const sockets = userToSockets.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          userToSockets.delete(userId)
          // Notify peers user went offline
          getUserChats(userId).then((chatIds) => {
            for (const chatId of chatIds) {
              getChatMemberIds(chatId).then((memberIds) => {
                for (const uid of memberIds) {
                  if (uid !== userId) emitToUser(uid, 'presence', { userId, online: false })
                }
              })
            }
          })
        }
      }
    }
    console.log(`[ws] disconnected ${socket.id}`)
  })

  socket.on('error', (err) => console.error('[ws] socket error', err))
})

const PORT = parseInt(process.env.CHAT_SERVICE_PORT || '3003', 10)
httpServer.listen(PORT, () => {
  console.log(`Lumen chat-service (socket.io) listening on port ${PORT}`)
})
internalServer.listen(internalPort, () => {
  console.log(`Lumen internal API listening on port ${internalPort}`)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => httpServer.close(() => process.exit(0)))
