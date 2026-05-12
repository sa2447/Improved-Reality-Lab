import { NextResponse } from "next/server";
import { compareStates } from "@/lib/compare-service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  try {
    const result = await compareStates(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid compare request";

    if (
      message.includes("Authentication required") ||
      message.includes("User profile")
    ) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
