import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HelmetLogo } from "@/components/HelmetLogo";
import { Shield, Video, CheckCircle, Zap, Scale, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelmetLogo className="w-9 h-9 text-sky-600" />
            <span className="font-bold text-foreground text-xl tracking-tight">Helmet.io</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <Shield className="w-4 h-4" />
              AI-Powered Legal Compliance
            </div>

            {/* Logo */}
            <div className="mb-8 animate-float">
              <div className="w-24 h-24 relative">
                <div className="absolute inset-0 bg-sky-400/20 rounded-full blur-2xl" />
                <HelmetLogo className="w-24 h-24 text-sky-600 relative z-10 drop-shadow-xl" />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground max-w-4xl leading-[1.1] mb-6">
              Generate{" "}
              <span className="text-gradient">Legally Compliant</span>
              {" "}AI Videos
            </h1>

            {/* Subheading */}
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10">
              Helmet.io automatically checks your video content against EU AI Act, GDPR, copyright laws, 
              and international regulations before generation. Create with confidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
              <Link href="/signup">
                <Button size="lg" className="bg-sky-500 hover:bg-sky-600 text-white shadow-xl shadow-sky-500/30 h-14 px-8 text-lg">
                  Start Creating Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground">25+</div>
                <div className="text-sm text-muted-foreground mt-1">Legal Rules Checked</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground">6</div>
                <div className="text-sm text-muted-foreground mt-1">Compliance Categories</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground">5s</div>
                <div className="text-sm text-muted-foreground mt-1">Video Generation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Complete Legal Protection for Your AI Content
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our AI agents analyze your content against comprehensive legal frameworks before any video is generated.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-card border border-border rounded-2xl p-8 card-hover">
              <div className="w-14 h-14 bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-xl flex items-center justify-center mb-6">
                <Scale className="w-7 h-7 text-sky-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">EU AI Act Compliance</h3>
              <p className="text-muted-foreground leading-relaxed">
                Automatic checking against the EU AI Act requirements for high-risk AI systems and content generation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card border border-border rounded-2xl p-8 card-hover">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">GDPR Protection</h3>
              <p className="text-muted-foreground leading-relaxed">
                Content is analyzed for personal data usage, consent requirements, and privacy compliance under GDPR.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card border border-border rounded-2xl p-8 card-hover">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">International Standards</h3>
              <p className="text-muted-foreground leading-relaxed">
                Compliance with international regulations including copyright laws, content safety, and defamation rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How Helmet.io Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to create legally compliant AI videos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-500/30">
                <Video className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-medium text-sky-500 mb-2">Step 1</div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Describe Your Video</h3>
              <p className="text-muted-foreground">
                Enter a text description or upload a reference image for your desired video content.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-500/30">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-medium text-sky-500 mb-2">Step 2</div>
              <h3 className="text-xl font-semibold text-foreground mb-3">AI Legal Review</h3>
              <p className="text-muted-foreground">
                Our Lawyer Agent checks your content against 25+ legal rules and regulations automatically.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-500/30">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-medium text-sky-500 mb-2">Step 3</div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Generate Safely</h3>
              <p className="text-muted-foreground">
                If compliant, your video is generated. If not, our Planner Agent suggests compliant alternatives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"30\" height=\"30\" viewBox=\"0 0 30 30\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z\" fill=\"rgba(255,255,255,0.1)\"%2F%3E%3C%2Fsvg%3E')] opacity-50" />
            <div className="relative z-10">
              <HelmetLogo className="w-16 h-16 text-white mx-auto mb-6 drop-shadow-lg" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Create Compliant Videos?
              </h2>
              <p className="text-sky-100 text-lg mb-8 max-w-xl mx-auto">
                Join Helmet.io today and get 10,000 free tokens to start generating legally safe AI content.
              </p>
              <Link href="/signup">
                <Button size="lg" className="bg-white text-sky-600 hover:bg-sky-50 shadow-xl h-14 px-10 text-lg font-semibold">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HelmetLogo className="w-8 h-8 text-sky-600" />
            <span className="font-semibold text-foreground">Helmet.io</span>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-Compliant Video Generation Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
