"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); return; }
      toast.success("Welcome back!");
      window.location.href = "/dashboard";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center md:justify-start relative overflow-hidden bg-[#010828]">
      {/* Video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#010828]/90 via-[#010828]/60 to-transparent" />

      <div className="relative z-10 w-full max-w-md px-5 py-10 mx-auto md:mx-0 md:ml-16 lg:ml-32">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 liquid-glass rounded-2xl flex items-center justify-center mb-4 shield-pulse">
            <Shield className="w-7 h-7 text-[#6FFF00]" />
          </div>
          <h1 className="font-grotesk text-[#EFF4FF] text-3xl md:text-4xl uppercase tracking-tight">Helmet.io</h1>
          <p className="font-mono text-[#6FFF00] mt-1 text-xs tracking-wide opacity-80 text-center">So that you dont crash hard on your ai journey</p>
        </div>

        {/* Card */}
        <div className="liquid-glass rounded-2xl p-6 md:p-8">
          <h2 className="font-grotesk text-[#EFF4FF] text-xl uppercase tracking-wide mb-1">Sign in</h2>
          <p className="text-[#EFF4FF]/50 font-mono text-xs uppercase tracking-wider mb-5">Enter your credentials to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#EFF4FF]/70 font-mono text-xs uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className="bg-white/5 border-white/10 text-[#EFF4FF] placeholder:text-[#EFF4FF]/30 focus:ring-[#6FFF00]/40 focus:border-[#6FFF00]/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[#EFF4FF]/70 font-mono text-xs uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  className="pr-10 bg-white/5 border-white/10 text-[#EFF4FF] placeholder:text-[#EFF4FF]/30 focus:ring-[#6FFF00]/40 focus:border-[#6FFF00]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#EFF4FF]/40 hover:text-[#EFF4FF] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2 bg-[#6FFF00] text-[#010828] hover:bg-[#6FFF00]/90 font-grotesk uppercase tracking-widest" disabled={loading} size="lg">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-[#EFF4FF]/40 font-mono text-xs uppercase tracking-wider mt-5">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#6FFF00] hover:text-[#6FFF00]/80 transition-colors">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-[#EFF4FF]/20 font-mono text-[10px] uppercase tracking-wider mt-5">
          By signing in, you agree to Helmet.io&apos;s Terms of Service
        </p>
      </div>
    </div>
  );
}
