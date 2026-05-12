import ChatPanel from "@/components/chat-panel";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <section className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-sky-50 to-emerald-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Cost of living tool</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">Compare cost of living across states and get affordability insights</h1>
      </section>

      <ChatPanel isAuthenticated={isAuthenticated} />
    </main>
  );
}
