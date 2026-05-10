import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Shield } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#010828]">
      {/* Video background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#010828]/70 via-[#010828]/40 to-[#010828]/80" />

      {/* Navbar */}
      <div className="relative z-20 flex items-center justify-between px-5 md:px-10 pt-6 max-w-[1831px] mx-auto w-full">
        <span className="font-grotesk text-[#EFF4FF] text-sm md:text-base uppercase tracking-widest">Helmet.io</span>
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/login" className="font-grotesk text-[#EFF4FF]/80 text-xs uppercase tracking-widest hover:text-[#6FFF00] transition-colors">Sign In</Link>
          <Link href="/signup" className="liquid-glass rounded-full px-4 py-2 font-grotesk text-[#EFF4FF]/80 text-xs uppercase tracking-widest hover:text-[#6FFF00] transition-colors">Get Started</Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative z-10 flex flex-col min-h-screen items-center justify-center px-5 text-center">
        <div className="w-14 h-14 md:w-20 md:h-20 liquid-glass rounded-2xl md:rounded-[1.5rem] flex items-center justify-center mb-6 md:mb-8 shield-pulse">
          <Shield className="w-7 h-7 md:w-10 md:h-10 text-[#6FFF00]" />
        </div>

        <h1 className="font-grotesk text-[#EFF4FF] text-4xl sm:text-6xl md:text-8xl lg:text-[7rem] uppercase tracking-tight leading-none mb-3 md:mb-4">
          Helmet.io
        </h1>

        <p className="font-mono text-[#6FFF00] text-sm sm:text-base md:text-xl mt-3 opacity-90 max-w-xs sm:max-w-md md:max-w-xl leading-relaxed tracking-wide">
          So that you dont crash hard on your ai journey
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 md:mt-12 w-full max-w-xs sm:max-w-none sm:w-auto">
          <Link
            href="/signup"
            className="bg-[#6FFF00] rounded-full px-8 py-3 text-[#010828] font-grotesk uppercase text-xs sm:text-sm tracking-widest font-bold hover:bg-[#6FFF00]/90 transition-all shadow-lg shadow-[#6FFF00]/20 text-center"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="liquid-glass rounded-full px-8 py-3 text-[#EFF4FF] font-grotesk uppercase text-xs sm:text-sm tracking-widest hover:bg-white/10 transition-all text-center"
          >
            Sign In
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-10 md:mt-16 px-4">
          {["EU AI Act", "GDPR", "Copyright Law", "Content Safety", "30+ Rules"].map((tag) => (
            <span key={tag} className="liquid-glass rounded-full px-3 py-1.5 md:px-5 md:py-2 text-[#EFF4FF]/60 font-mono text-[10px] md:text-xs uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
