import { NextResponse } from "next/server";
import { getPool } from "@/db";
import { SETUP_STATEMENTS } from "@/db/setup-sql";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getPool();
    for (const stmt of SETUP_STATEMENTS) {
      await pool.query(stmt);
    }
    return NextResponse.json({
      ok: true,
      mensaje: "Base de datos lista. Ya puedes usar la app.",
    });
  } catch (err) {
    console.error("Error en /api/setup:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
