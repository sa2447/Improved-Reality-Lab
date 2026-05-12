import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.userProfile.findUnique({
    where: { userId },
  });

  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
  }

  const data = parsed.data;

  const profile = await db.userProfile.upsert({
    where: { userId },
    update: {
      salary: data.salary,
      hourlyWage: data.hourlyWage,
      rent: data.rent,
      transportation: data.transportation,
      healthcare: data.healthcare,
      food: data.food,
      debt: data.debt,
      dependents: data.dependents,
    },
    create: {
      userId,
      salary: data.salary,
      hourlyWage: data.hourlyWage,
      rent: data.rent,
      transportation: data.transportation,
      healthcare: data.healthcare,
      food: data.food,
      debt: data.debt,
      dependents: data.dependents,
    },
  });

  return NextResponse.json({ profile });
}
