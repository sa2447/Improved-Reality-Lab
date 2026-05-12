import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration payload" }, { status: 400 });
  }

  const exists = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (exists) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      profile: {
        create: {},
      },
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
