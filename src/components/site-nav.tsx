import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function SiteNav() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900">
          Cost of Living Toolkit
        </Link>

        <div className="flex items-center gap-2 text-sm">
          <Link className="rounded border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50" href="/">
            Homepage
          </Link>
          <Link
            className="rounded border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
            href="/dashboard"
          >
            Dashboard
          </Link>

          {isAuthenticated ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-800"
              >
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link
                className="rounded border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
                href="/auth/signin"
              >
                Sign in
              </Link>
              <Link
                className="rounded bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-800"
                href="/auth/signup"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
