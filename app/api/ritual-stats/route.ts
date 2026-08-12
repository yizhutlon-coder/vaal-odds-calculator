import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { ritualStats } from "../../../db/schema";

const RITUALS = ["toucan", "kuduku", "chris"] as const;
type RitualKey = (typeof RITUALS)[number];

const responseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: { ...responseHeaders, ...init.headers },
  });
}

async function readStats() {
  const db = getDb();
  const rows = await db.select().from(ritualStats);
  return RITUALS.map((ritual) => {
    const row = rows.find((entry) => entry.ritual === ritual);
    return {
      ritual,
      choices: row?.choices ?? 0,
      successes: row?.successes ?? 0,
    };
  });
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return message.includes("no such table")
    ? "Community ritual totals are being prepared. Please try again shortly."
    : message;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: responseHeaders });
}

export async function GET() {
  try {
    return json({ stats: await readStats() });
  } catch (error) {
    return json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { ritual?: string; success?: boolean };
    if (!RITUALS.includes(payload.ritual as RitualKey) || typeof payload.success !== "boolean") {
      return json({ error: "A valid ritual and success result are required." }, { status: 400 });
    }

    const ritual = payload.ritual as RitualKey;
    const success = payload.success ? 1 : 0;
    const db = getDb();
    await db
      .insert(ritualStats)
      .values({ ritual, choices: 1, successes: success })
      .onConflictDoUpdate({
        target: ritualStats.ritual,
        set: {
          choices: sql`${ritualStats.choices} + 1`,
          successes: sql`${ritualStats.successes} + ${success}`,
        },
      });

    const [updated] = await db.select().from(ritualStats).where(eq(ritualStats.ritual, ritual));
    return json({ ritual: updated, stats: await readStats() }, { status: 201 });
  } catch (error) {
    return json({ error: errorMessage(error) }, { status: 500 });
  }
}
