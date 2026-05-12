import Link from "next/link";
import { SignUpForm } from "./signup-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <SignUpForm />
      <p className="text-sm text-zinc-600">
        Already registered? <Link className="underline" href="/auth/signin">Sign in</Link>
      </p>
    </main>
  );
}
