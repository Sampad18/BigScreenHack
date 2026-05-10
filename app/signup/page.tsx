"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !email || !password) { toast.error("Please fill in all fields"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Account created! Signing you in...");
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
      <div className="absolute inset-0 bg-gradient-to-b from-[#010828]/60 via-[#010828]/50 to-[#010828]/70" />

      <div className="relative z-10 w-full max-w-md px-5 py-10 mx-auto md:mx-0 md:ml-16 lg:ml-32">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 liquid-glass rounded-2xl flex items-center justify-center mb-5 shield-pulse">
            <Shield className="w-8 h-8 text-[#6FFF00]" />
          </div>
          <h1 className="font-grotesk text-[#EFF4FF] text-4xl uppercase tracking-tight">Helmet.io</h1>
          <p className="font-mono text-[#6FFF00] mt-1 text-sm tracking-wide opacity-80">So that you dont crash hard on your ai journey</p>
        </div>

        <div className="liquid-glass rounded-2xl p-8">
          <h2 className="font-grotesk text-[#EFF4FF] text-xl uppercase tracking-wide mb-1">Create account</h2>
          <p className="text-[#EFF4FF]/50 font-mono text-xs uppercase tracking-wider mb-2">Join Helmet.io and get 10,000 tokens free</p>

          <div className="flex items-center gap-2 bg-[#6FFF00]/10 border border-[#6FFF00]/20 rounded-lg px-3 py-2 mb-6">
            <CheckCircle className="w-4 h-4 text-[#6FFF00] flex-shrink-0" />
            <span className="text-[#6FFF00]/80 font-mono text-xs">10,000 tokens included on signup (200 generations)</span>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[#EFF4FF]/70 font-mono text-xs uppercase tracking-wider">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Sam Papadopoulos"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                className="bg-white/5 border-white/10 text-[#EFF4FF] placeholder:text-[#EFF4FF]/30 focus:ring-[#6FFF00]/40 focus:border-[#6FFF00]/40"
              />
            </div>

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
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
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
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : "Create account"}
            </Button>
          </form>

          <p className="text-center text-[#EFF4FF]/40 font-mono text-xs uppercase tracking-wider mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-[#6FFF00] hover:text-[#6FFF00]/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
