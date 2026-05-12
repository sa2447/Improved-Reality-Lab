"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <input
        className="rounded border border-zinc-300 px-3 py-2"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <input
        className="rounded border border-zinc-300 px-3 py-2"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <button
        className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        type="submit"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
