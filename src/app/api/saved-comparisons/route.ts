import { NextResponse } from "next/server";
import { createSavedComparison, listSavedComparisons } from "@/lib/saved-comparisons";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sortParam = searchParams.get("sort");
  const sort = sortParam === "affordabilityScore" ? "affordabilityScore" : "createdAt";

  try {
    const records = await listSavedComparisons(sort);
    return NextResponse.json({ records });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list records";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  try {
    const record = await createSavedComparison(body);
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create record";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
