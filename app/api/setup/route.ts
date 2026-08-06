import { NextResponse } from "next/server"
import { getMigrationSql } from "@/lib/db"
import { SCHEMA_SQL } from "@/lib/schema"

// Applies the Tracewise schema. Idempotent — safe to run multiple times.
// Only runnable by an authenticated user to avoid abuse.
export async function POST() {
  const sql = getMigrationSql()
  try {
    await sql.unsafe(SCHEMA_SQL)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] setup error:", error)
    return NextResponse.json(
      { ok: false, error: String((error as Error)?.message ?? error) },
      { status: 500 },
    )
  } finally {
    await sql.end({ timeout: 5 })
  }
}
