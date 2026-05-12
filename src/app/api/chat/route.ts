import { NextResponse } from "next/server";
import { getChatHistory, sendChat } from "@/lib/chat";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const history = await getChatHistory(sessionId);
    return NextResponse.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch history";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  try {
    const response = await sendChat(body);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process chat";
    const status = message.includes("Rate limit") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
