import { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Camera,
  BarChart3,
  Sparkles,
  Smartphone,
  Wallet,
  TrendingUp,
  Shield,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { APP_NAME } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';

/* data */

const heroStats = [
  { value: '10K+', label: 'Active Users' },
  { value: '2M+', label: 'Transactions' },
  { value: '4.9', label: 'Rating' },
] as const;

const features = [
  {
    icon: Brain,
    title: 'AI That Understands Your Money',
    description:
      'Spending pattern analysis, anomaly detection, and a personalized financial personality. Insights that actually help you save.',
    visual: 'ai',
  },
  {
    icon: Camera,
    title: 'Snap, Scan, Done',
    description:
      'Point your camera at any receipt. Our OCR extracts merchant, amount, date, and line items in seconds.',
    visual: 'receipt',
  },
  {
    icon: BarChart3,
    title: 'Reports That Tell a Story',
    description:
      'Beautiful breakdowns by category, income vs expenses over time, and exportable CSV reports.',
    visual: 'chart',
  },
] as const;

const steps = [
  { title: 'Create your account', desc: 'Sign up in under a minute with just your email.' },
  { title: 'Log your first transaction', desc: 'Add an expense manually, or scan a receipt with your camera.' },
  { title: 'Let AI do the rest', desc: 'Automatic categorization, anomaly alerts, and savings insights.' },
];

/*keyframes (injected once) */

const animationCSS = `
@keyframes heroFloat1 {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-14px) rotate(1deg); }
}
@keyframes heroFloat2 {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(-1.5deg); }
}
@keyframes heroFloat3 {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-18px); }
}
@keyframes heroPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
`;

/*feature visuals (CSS-only) */

function FeatureVisual({ type }: { type: string }) {
  if (type === 'ai') {
    return (
      <div className="flex h-full flex-col justify-between rounded-2xl border border-primary-100 bg-primary-950/80 p-8">
        <div className="space-y-3">
          <div className="h-3 w-3/4 rounded-full bg-primary-200/70" />
          <div className="h-3 w-1/2 rounded-full bg-primary-200/50" />
          <div className="h-3 w-2/3 rounded-full bg-accent-300/40" />
        </div>
        <div className="mt-8 flex items-end gap-2">
          {[35, 55, 40, 70, 50, 85, 60, 45, 75, 55].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                background: i === 5 ? '#4DB86A' : 'rgba(21,67,96,0.12)',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'receipt') {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-primary-950/20 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 border-b border-primary-100 pb-4">
          <div className="h-8 w-8 rounded-lg bg-primary-950/70" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-2/3 rounded-full bg-primary-700/50" />
            <div className="h-2 w-1/3 rounded-full bg-primary-700/40" />
          </div>
        </div>
        <div className="mt-5 flex-1 space-y-3">
          {[80, 60, 70, 45, 90].map((w, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-2 rounded-full bg-primary-600/50" style={{ width: `${w}%` }} />
              <div className="h-2 w-10 rounded-full bg-primary-600/40" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-primary-950/20 pt-4">
          <div className="h-2.5 w-12 rounded-full bg-primary-600/60" />
          <div className="h-3 w-16 rounded-full bg-accent-700/50" />
        </div>
      </div>
    );
  }

  // chart
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-primary-100 bg-primary-50/50 p-8">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-accent-400" />
        <div className="h-2 w-20 rounded-full bg-primary-200/60" />
        <div className="h-3 w-3 rounded-full bg-primary-300" />
        <div className="h-2 w-16 rounded-full bg-primary-200/40" />
      </div>
      <div className="mt-6 flex flex-1 items-end gap-3">
        {[40, 65, 45, 80, 55, 90, 70, 50].map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${h * 1.2}px`,
                background: i % 2 === 0 ? 'rgba(21,67,96,0.10)' : '#4DB86A',
                opacity: i % 2 === 0 ? 1 : 0.6,
              }}
            />
            <div className="h-1.5 w-4 rounded-full bg-primary-200/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* hero animated visual */

function HeroVisual() {
  return (
    <div className="relative h-[420px] w-full lg:h-[480px]">
      {/* Soft gradient backdrop */}
      <div
        className="absolute inset-0 rounded-3xl"
        style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(77,184,106,0.06) 0%, rgba(232,240,245,0.4) 50%, transparent 80%)' }}
        aria-hidden="true"
      />

      {/* Main card — spending overview */}
      <div
        className="absolute left-[8%] top-[10%] w-[65%] rounded-2xl border border-primary-100 bg-white p-5 shadow-lg"
        style={{ animation: 'heroFloat1 6s ease-in-out infinite' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-800">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[11px] text-primary-400">Monthly Spending</p>
              <p className="text-base font-bold text-primary-800">NPR 45,200</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5">
            <TrendingUp className="h-3 w-3 text-accent-600" />
            <span className="text-[10px] font-semibold text-accent-600">12%</span>
          </div>
        </div>
        {/* Mini chart */}
        <div className="mt-4 flex items-end gap-1">
          {[30, 50, 35, 65, 45, 70, 55, 80, 60, 48, 72, 58].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h * 0.5}px`,
                background: i >= 9 ? '#4DB86A' : 'rgba(21,67,96,0.08)',
              }}
            />
          ))}
        </div>
      </div>

      {/* AI insight floating card */}
      <div
        className="absolute right-[4%] top-[5%] w-[44%] rounded-xl border border-primary-100 bg-white p-4 shadow-md"
        style={{ animation: 'heroFloat2 5s ease-in-out 0.5s infinite' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-50">
            <Sparkles className="h-3.5 w-3.5 text-accent-500" />
          </div>
          <p className="text-[11px] font-semibold text-primary-700">AI Insight</p>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-primary-400">
          You spent 23% less on dining this week. Great progress!
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-primary-100">
          <div className="h-full w-3/4 rounded-full bg-accent-400" style={{ animation: 'heroPulse 3s ease-in-out infinite' }} />
        </div>
      </div>

      {/* Receipt scan card */}
      <div
        className="absolute bottom-[8%] left-[12%] w-[48%] rounded-xl border border-primary-100 bg-white p-4 shadow-md"
        style={{ animation: 'heroFloat3 7s ease-in-out 1s infinite' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50">
            <Receipt className="h-3.5 w-3.5 text-primary-600" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-primary-700">Receipt Scanned</p>
            <p className="text-[10px] text-primary-400">Bhat-Bhateni Store</p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-primary-400">Groceries</span>
            <span className="text-[10px] font-medium text-primary-700">NPR 1,250</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-primary-400">Snacks</span>
            <span className="text-[10px] font-medium text-primary-700">NPR 480</span>
          </div>
          <div className="mt-1 border-t border-primary-100 pt-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-primary-700">Total</span>
              <span className="text-[10px] font-bold text-accent-600">NPR 1,730</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security badge */}
      <div
        className="absolute bottom-[12%] right-[6%] rounded-xl border border-primary-100 bg-white px-4 py-3 shadow-md"
        style={{ animation: 'heroFloat2 6s ease-in-out 2s infinite' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-800">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-primary-700">Bank-Grade</p>
            <p className="text-[10px] text-primary-400">256-bit encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* scroll reveal hook */

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  const observe = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    ref.current = node;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('opacity-100', 'translate-y-0');
          node.classList.remove('opacity-0', 'translate-y-8');
          observer.unobserve(node);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
  }, []);

  return observe;
}

/* component */

export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Hero load animation
  const heroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    heroRef.current?.classList.remove('opacity-0', 'translate-y-6');
    heroRef.current?.classList.add('opacity-100', 'translate-y-0');
  }, []);

  const revealFeatures = [useScrollReveal(), useScrollReveal(), useScrollReveal()];
  const revealSteps = useScrollReveal();
  const revealMobile = useScrollReveal();
  const revealCta = useScrollReveal();

  return (
    <div className="min-h-screen bg-white">
      {/* Inject hero animations */}
      <style>{animationCSS}</style>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-primary-950/20 bg-white/80 backdrop-blur-lg">
        <div className="flex h-16 w-full items-center justify-between px-6">
          {/* Left: logo + nav links */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <span className="text-lg font-bold text-primary-950">{APP_NAME}</span>
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              <Link to="/about" className="text-sm font-medium leading-relaxed text-primary-950/80 transition-colors hover:text-primary-950">About</Link>
              <Link to="/privacy" className="text-sm font-medium leading-relaxed text-primary-950/80 transition-colors hover:text-primary-950">Privacy</Link>
              <Link to="/terms" className="text-sm font-medium leading-relaxed text-primary-950/80 transition-colors hover:text-primary-950">Terms</Link>
            </div>
          </div>

          {/* Right: auth buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="primary" size="sm" className="rounded-full px-4 py-1.5">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="rounded-full text-primary-950/80 hover:text-primary-950">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" className="rounded-full px-4 py-1.5">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div
          ref={heroRef}
          className="mx-auto grid max-w-full grid-cols-1 items-center gap-8 px-6 py-16 opacity-0 translate-y-6 transition-all duration-1000 ease-out lg:grid-cols-2 lg:gap-12 lg:px-28 lg:py-20"
        >
          {/* Left - text */}
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-transparent px-4 py-1.5">
              <span className="text-xs font-medium text-primary-600">AI-Powered Finance</span>
            </div>

            {/* Headline */}
            <h1
              className="font-bold tracking-tight text-primary-950"
              style={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', lineHeight: 1.1 }}
            >
              Understanding Your Money,{' '}
              <span className="text-accent-800">Made Easy.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base leading-relaxed text-primary-950/70 lg:text-lg">
              {APP_NAME} uses AI to track your spending, scan receipts, detect anomalies,
              and give you insights that actually help you save money.
            </p>

            {/* CTA */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button variant="primary" size="md" className="px-8 py-3">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button variant="primary" size="md" className="px-8 py-3">
                      Get Started Free
                    </Button>
                  </Link>
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary-950"
                  >
                    Already have an account? <span className="font-semibold text-primary-700 underline underline-offset-2">Sign in</span>
                  </Link>
                </>
              )}
            </div>

            {/* Inline stats */}
            <div className="mt-10 flex items-center gap-8 border-t border-primary-100 pt-6">
              {heroStats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold tracking-tight text-primary-800">{stat.value}</p>
                  <p className="text-xs text-primary-800/80">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — animated visual */}
          <div className="hidden lg:block">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white border-t border-primary-950/20 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl space-y-12 px-6 lg:space-y-16">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              ref={revealFeatures[i]}
              className="grid grid-cols-1 items-center gap-12 opacity-0 translate-y-8 transition-all duration-700 ease-out lg:grid-cols-2 lg:gap-20"
            >
              {/* Text */}
              <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <h3 className="text-2xl font-bold tracking-tight text-primary-900 lg:text-3xl">
                  {feature.title}
                </h3>
                <p className="mt-4 max-w-md text-base leading-relaxed text-primary-900/80">
                  {feature.description}
                </p>
              </div>

              {/* Visual */}
              <div className={`aspect-[4/3] ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                <FeatureVisual type={feature.visual} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        ref={revealSteps}
        className="bg-primary-600/10 py-20 opacity-0 translate-y-8 transition-all duration-700 ease-out lg:py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-900 lg:text-4xl">
              Three steps to financial clarity
            </h2>
            <p className="mt-4 text-base text-primary-900/80">
              Get up and running in under a minute.
            </p>
          </div>

          <div className="relative mt-16 grid grid-cols-1 gap-12 lg:mt-20 lg:grid-cols-3 lg:gap-0">
            {/* Connecting line (desktop) */}
            <div className="absolute left-[16.67%] right-[16.67%] top-6 hidden h-px bg-primary-800/80 lg:block" aria-hidden="true" />

            {steps.map((step, i) => (
              <div key={i} className="relative text-center lg:px-8">
                <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-800/80 bg-white text-sm font-bold text-primary-800">
                  {i + 1}
                </div>
                <h3 className="mt-6 text-lg font-semibold text-primary-800">{step.title}</h3>
                <p className="mt-2 text-sm text-primary-800/80">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App */}
      <section
        ref={revealMobile}
        className="bg-white py-20 opacity-0 translate-y-8 transition-all duration-700 ease-out lg:py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl bg-primary-800 px-8 py-16 text-center sm:px-16">
            <Smartphone className="mx-auto h-12 w-12 text-white" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-white lg:text-4xl">
              Take {APP_NAME} on the go
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/60">
              Download the mobile app for iOS and Android. Log expenses on the spot,
              scan receipts with your camera, and get real-time AI alerts.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button className="inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-sm font-medium text-primary-900 transition-colors hover:bg-primary-50">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                App Store
              </button>
              <button className="inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-sm font-medium text-primary-900 transition-colors hover:bg-primary-50">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.834 1.64a1 1 0 010 1.726l-2.834 1.64-2.536-2.536 2.536-2.47zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z" /></svg>
                Google Play
              </button>
            </div>
            <p className="mt-4 text-xs text-white/50">Coming soon to both platforms</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        ref={revealCta}
        className="bg-primary-900 py-24 opacity-0 translate-y-8 transition-all duration-700 ease-out lg:py-32"
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Start making smarter financial decisions
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
            Join thousands who track, analyze, and optimize their money with AI.
          </p>
          <div className="mt-10">
            <Link to="/register">
              <Button variant="accent" size="lg" className="px-8">
                Get Started Free
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/60">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black">
        <div className="mx-auto max-w-full px-6 py-6">
          <div className="flex flex-col items-center justify-between sm:flex-row">
            <Link to="/" className="flex items-center">
              <span className="font-semibold text-white">{APP_NAME}</span>
            </Link>
            <p className="text-sm text-white/70">
              &copy; 2026 {APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
