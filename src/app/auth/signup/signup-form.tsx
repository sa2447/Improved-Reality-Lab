"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to create account");
      return;
    }

    router.push("/auth/signin");
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
        placeholder="Password (min 8 chars)"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={8}
        required
      />
      <button
        className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        type="submit"
        disabled={loading}
      >
        {loading ? "Creating..." : "Create account"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
