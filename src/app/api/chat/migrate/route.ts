import { NextResponse } from "next/server";
import { migrateSessionToUser } from "@/lib/chat";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { sessionId?: string } | null;

  if (!body?.sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const result = await migrateSessionToUser(body.sessionId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to migrate session";
    const status = message.includes("Authentication required") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
