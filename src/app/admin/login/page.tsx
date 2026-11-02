"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crown, Mail, Lock, Eye, EyeOff, Trophy, AlertCircle, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#191820] relative overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-[#EAE7F2] px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm relative z-20">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FFB800] text-[#191820] font-black text-base flex items-center justify-center tracking-tighter shadow-sm">
            Q
          </div>
          <span className="font-black text-base tracking-tight text-[#191820]">QUIZBET</span>
        </Link>
        <div className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white border border-[#DDD6FE] text-xs font-bold text-[#6C5CE7] shadow-sm">
          <Crown className="w-3.5 h-3.5 text-[#6C5CE7]" />
          <span>Host Portal</span>
        </div>
      </header>

      {/* Decorative Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none opacity-40 overflow-hidden">
        <svg
          viewBox="0 0 1440 320"
          className="absolute bottom-0 w-full h-full text-[#6C5CE7]"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0,192L48,197.3C96,203,192,213,288,202.7C384,192,480,160,576,160C672,160,768,192,864,202.7C960,213,1056,203,1152,181.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="relative max-w-md w-full">
          {/* Left HOST lanyard badge illustration */}
          <div className="hidden lg:flex flex-col items-center absolute -left-48 top-12 pointer-events-none select-none">
            <div className="w-28 h-36 rounded-2xl bg-[#6C5CE7] text-white p-3 flex flex-col justify-between shadow-xl transform -rotate-12 border-2 border-white/20">
              <div className="w-10 h-3 bg-white/40 rounded-full mx-auto" />
              <div className="text-center font-black text-xl tracking-wider">HOST</div>
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-white/30 rounded" />
                <div className="w-3/4 h-1.5 bg-white/30 rounded" />
              </div>
            </div>
          </div>

          {/* Right Trophy illustration */}
          <div className="hidden lg:flex flex-col items-center absolute -right-48 top-12 pointer-events-none select-none">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#FFF3E8] to-[#E9E5FF] border border-[#DDD6FE] p-4 flex items-center justify-center shadow-lg transform rotate-6">
              <Trophy className="w-16 h-16 text-[#FFB800]" />
            </div>
          </div>

          {/* Admin Authentication Card */}
          <div className="w-full bg-white border border-[#EAE7F2] rounded-3xl p-6 sm:p-9 shadow-xl shadow-purple-950/5 text-center">
            {/* Top Crown Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#FF7417] text-white flex items-center justify-center mx-auto mb-4 text-2xl shadow-md shadow-orange-500/20">
              <Crown className="w-7 h-7 text-white" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#191820]">Admin Authentication</h1>
            <p className="text-xs text-[#6B6A78] mt-1 mb-6 font-medium">Authorized game host access only</p>

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-[#FDEEEC] border border-[#FCA5A5] text-[#EF5350] text-xs font-bold flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-[#EF5350] shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#191820] mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#6C5CE7]" />
                  <span>Email Address</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6A78] text-sm pointer-events-none">
                    <Mail className="w-4 h-4 text-[#A09EB1]" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="name@domain.com"
                    className="w-full h-12 pl-10 pr-4 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] text-sm font-semibold text-[#191820] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 outline-none transition-all placeholder:text-[#A09EB1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191820] mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#6C5CE7]" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6A78] text-sm pointer-events-none">
                    <Lock className="w-4 h-4 text-[#A09EB1]" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className="w-full h-12 pl-10 pr-11 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] text-sm font-semibold text-[#191820] focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 outline-none transition-all placeholder:text-[#A09EB1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6A78] hover:text-[#191820] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-[#6B6A78]" />
                    ) : (
                      <Eye className="w-4 h-4 text-[#6B6A78]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 sm:h-13 rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] active:scale-[0.99] disabled:opacity-50 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
