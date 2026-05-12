import { NextResponse } from "next/server";
import {
  deleteSavedComparison,
  getSavedComparison,
  renameSavedComparison,
} from "@/lib/saved-comparisons";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;

  try {
    const record = await getSavedComparison(id);
    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load record";
    const status = message === "Unauthorized" ? 401 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  try {
    const record = await renameSavedComparison(id, body);
    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to rename record";
    const status = message === "Unauthorized" ? 401 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;

  try {
    const result = await deleteSavedComparison(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete record";
    const status = message === "Unauthorized" ? 401 : message === "Not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
