"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../../lib/api";

export default function GithubCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell message="Connecting GitHub" />}>
      <CallbackContent />
    </Suspense>
  );
}

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Connecting GitHub");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const expectedState = window.sessionStorage.getItem("github_oauth_state");

    if (!code) {
      setMessage("GitHub did not return a code.");
      return;
    }

    if (!state || !expectedState || state !== expectedState) {
      setMessage("GitHub state check failed.");
      return;
    }

    api
      .exchangeGithubCode(code)
      .then(() => {
        window.sessionStorage.removeItem("github_oauth_state");
        setMessage("GitHub connected.");
        window.setTimeout(() => router.push("/"), 700);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "GitHub connection failed.");
      });
  }, [params, router]);

  return <CallbackShell message={message} />;
}

function CallbackShell({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <section className="w-full max-w-sm rounded-md border border-neutral-800 bg-neutral-900 p-5 text-center">
        <p className="text-sm text-neutral-300">{message}</p>
      </section>
    </main>
  );
}
