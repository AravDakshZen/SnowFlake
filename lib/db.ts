import postgres from "postgres"

// Lazily-created singleton Postgres client (server-only).
// Uses the non-pooling connection string for DDL/migrations and the pooled
// connection for regular queries when available.
declare global {
  // eslint-disable-next-line no-var
  var __snowflake_sql__: ReturnType<typeof postgres> | undefined
}

function resolveConnectionString() {
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  )
}

export function getSql() {
  const connectionString = resolveConnectionString()
  if (!connectionString) {
    throw new Error(
      "Database is not configured. Add the Supabase/Postgres connection string to the project environment.",
    )
  }

  if (!globalThis.__snowflake_sql__) {
    globalThis.__snowflake_sql__ = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      prepare: false,
    })
  }

  return globalThis.__snowflake_sql__
}

export function getMigrationSql() {
  // Non-pooling connection is preferred for DDL statements.
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ?? resolveConnectionString()
  if (!connectionString) {
    throw new Error("Database is not configured.")
  }
  return postgres(connectionString, { max: 1, prepare: false })
}
