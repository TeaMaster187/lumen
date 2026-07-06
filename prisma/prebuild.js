// prisma/prebuild.js
// Runs before prisma generate / prisma db push.
// Detects whether DATABASE_URL is SQLite (file:) or PostgreSQL (postgres:)
// and copies the matching schema file into prisma/schema.prisma.

const fs = require('fs')
const path = require('path')

const url = process.env.DATABASE_URL || ''
const isPostgres = url.startsWith('postgres')

const sourceSchema = isPostgres
  ? path.join(__dirname, 'schema-postgres.prisma')
  : path.join(__dirname, 'schema-sqlite.prisma')
const targetSchema = path.join(__dirname, 'schema.prisma')

if (!fs.existsSync(sourceSchema)) {
  console.error(`[prebuild] ERROR: source schema not found: ${sourceSchema}`)
  process.exit(1)
}

fs.copyFileSync(sourceSchema, targetSchema)
console.log(`[prebuild] DATABASE_URL starts with ${isPostgres ? 'postgres' : 'file'} → using ${isPostgres ? 'PostgreSQL' : 'SQLite'} schema`)

// Make sure DATABASE_URL is set (fall back to local SQLite for dev)
if (!url) {
  const envPath = path.join(__dirname, '..', '.env')
  const envLine = 'DATABASE_URL=file:./dev.db\n'
  if (fs.existsSync(envPath)) {
    fs.appendFileSync(envPath, envLine)
  } else {
    fs.writeFileSync(envPath, envLine)
  }
  console.log('[prebuild] set DATABASE_URL=file:./dev.db (default for local dev)')
}
