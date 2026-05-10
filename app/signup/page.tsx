"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Gift, Shield, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelmetLogo } from "@/components/HelmetLogo";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-sky-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden py-12">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-sky-400/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0ea5e910_1px,transparent_1px),linear-gradient(to_bottom,#0ea5e910_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="group">
            <div className="w-20 h-20 relative mb-4">
              <div className="absolute inset-0 bg-sky-400/20 rounded-full blur-xl group-hover:bg-sky-400/30 transition-colors" />
              <HelmetLogo className="w-20 h-20 text-sky-600 relative z-10 drop-shadow-lg shield-pulse" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Helmet.io</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI-Compliant Video Generation</p>
        </div>

        {/* Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl shadow-sky-500/5">
          <h2 className="text-2xl font-semibold text-foreground mb-1">Create your account</h2>
          <p className="text-muted-foreground text-sm mb-4">Start generating compliant AI videos today</p>

          {/* Free tokens banner */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-950/50 dark:to-emerald-950/50 border border-sky-200 dark:border-sky-800 rounded-xl px-4 py-3 mb-6">
            <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-foreground text-sm">10,000 Free Tokens</div>
              <div className="text-muted-foreground text-xs">Enough for 200 video generations</div>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                className="h-12 bg-background border-border focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className="h-12 bg-background border-border focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  className="h-12 pr-12 bg-background border-border focus:border-sky-500 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 mt-2 bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-lg shadow-sky-500/25" 
              disabled={loading}
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating account...</> : "Create account"}
            </Button>
          </form>

          {/* Benefits */}
          <div className="mt-6 pt-6 border-t border-border space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Automatic EU AI Act compliance checking</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>GDPR and copyright law protection</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>AI-powered legal modifications when needed</span>
            </div>
          </div>

          <p className="text-center text-muted-foreground text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-sky-500 hover:text-sky-600 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-muted-foreground text-xs mt-8">
          By creating an account, you agree to Helmet.io&apos;s Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
