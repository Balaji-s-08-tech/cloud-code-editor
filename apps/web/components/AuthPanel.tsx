"use client";

import { FormEvent, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function AuthPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setIsSubmitting(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(mode === "signin" ? "Signed in." : "Account created. Check your email if confirmation is enabled.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <section className="w-full max-w-sm rounded-md border border-neutral-800 bg-neutral-900 p-5 shadow-xl">
        <div className="mb-5">
          <p className="text-xs uppercase text-emerald-300">Cloud Code Editor</p>
          <h1 className="mt-2 text-2xl font-semibold">{mode === "signin" ? "Sign in" : "Create account"}</h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-neutral-300">
            Email
            <input
              className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-emerald-400"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm text-neutral-300">
            Password
            <input
              className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-emerald-400"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>

          <button
            className="w-full rounded-md bg-emerald-500 px-3 py-2 font-medium text-neutral-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            type="submit"
            disabled={isSubmitting || !isSupabaseConfigured}
          >
            {isSubmitting ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {!isSupabaseConfigured ? (
          <p className="mt-4 text-sm text-amber-200">Add Supabase values to apps/web/.env.local.</p>
        ) : null}

        {message ? <p className="mt-4 text-sm text-amber-200">{message}</p> : null}

        <button
          className="mt-5 text-sm text-neutral-300 underline-offset-4 hover:text-neutral-50 hover:underline"
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account?" : "Already have an account?"}
        </button>
      </section>
    </main>
  );
}
