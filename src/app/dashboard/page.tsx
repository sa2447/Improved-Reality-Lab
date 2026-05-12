import { auth } from "@/auth";
import ChatPanel from "@/components/chat-panel";
import { listSavedComparisons } from "@/lib/saved-comparisons";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const saved = await listSavedComparisons("createdAt");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Saved comparisons</h1>
      <p className="text-sm text-zinc-600">Signed in as {session?.user?.email}</p>

      <section className="rounded border border-zinc-200 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Your saved chat snapshots</h2>

        {saved.length === 0 ? (
          <p className="text-sm text-zinc-600">No saved comparisons yet.</p>
        ) : (
          <ul className="space-y-3">
            {saved.map((item) => (
              <li key={item.id} className="rounded border border-zinc-200 p-3">
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-zinc-600">
                  {item.primaryState ?? "Multi-state"} | score {Number(item.affordabilityScore ?? 0)} | {" "}
                  {item.createdAt.toISOString()}
                </p>
                <Link className="mt-2 inline-block text-sm underline" href={`/dashboard/saved/${item.id}`}>
                  Open snapshot
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChatPanel isAuthenticated={true} />
    </main>
  );
}
