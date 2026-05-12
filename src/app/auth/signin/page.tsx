import Link from "next/link";
import { SignInForm } from "./signin-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <SignInForm />
      <p className="text-sm text-zinc-600">
        No account yet? <Link className="underline" href="/auth/signup">Create one</Link>
      </p>
    </main>
  );
}
