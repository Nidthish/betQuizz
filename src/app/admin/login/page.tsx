"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Invalid administrative credentials.");
        setLoading(false);
        return;
      }

      router.push("/admin");
    } catch {
      setError("Network error connecting to authentication service.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950">
      <header className="border-b border-zinc-850 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center">
            Q
          </div>
          <span className="font-bold text-sm tracking-tight text-white">QUIZ BETTING</span>
        </Link>
        <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
          HOST PORTAL
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-6 sm:p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-xl font-black text-white">Admin Authentication</h1>
            <p className="text-xs text-zinc-400 mt-1">Authorized game host access only</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <span className="font-bold">!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@domain.com"
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm font-medium text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm font-medium text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all placeholder:text-zinc-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] disabled:opacity-50 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Sign In →</span>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
