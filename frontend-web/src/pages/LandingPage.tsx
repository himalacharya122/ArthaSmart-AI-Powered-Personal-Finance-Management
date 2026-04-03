import { Link } from 'react-router-dom';
import {
  BarChart3,
  Brain,
  Camera,
  Shield,
  Smartphone,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Zap,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { APP_NAME } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';

const features = [
  {
    icon: Wallet,
    title: 'Smart Expense Tracking',
    description:
      'Log expenses and incomes in seconds. Set budgets, track categories, and never lose sight of where your money goes.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description:
      'Our AI analyzes your spending patterns, detects anomalies, predicts overspending, and gives you a personalized financial personality.',
  },
  {
    icon: Camera,
    title: 'Receipt OCR Scanner',
    description:
      'Snap a photo of any receipt. Our OCR engine extracts merchant, amount, date, and line items automatically.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description:
      'Beautiful charts showing spending by category, income vs expenses over time, and exportable CSV reports.',
  },
  {
    icon: Shield,
    title: 'Bank-Grade Security',
    description:
      'JWT authentication with token rotation, encrypted data storage, and owner-only data access. Your finances stay private.',
  },
  {
    icon: Smartphone,
    title: 'Mobile & Web',
    description:
      'Access your finances from anywhere. Full-featured web dashboard and native mobile apps for iOS and Android.',
  },
] as const;

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '2M+', label: 'Transactions Tracked' },
  { value: 'AI', label: 'Powered Insights' },
  { value: '4.9', label: 'User Rating' },
] as const;

export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-primary-100">
        <div className="mx-auto flex h-16 max-w-full bg-primary-950 items-center justify-between px-4 lg:px-16">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700 text-sm font-bold text-white">
              A
            </div>
            <span className="text-xl font-bold text-white">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="accent" size="sm">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className='text-white hover:text-primary-950'>Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button variant="accent" size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-full px-4 xl:px-36 py-10 lg:py-14">
        <div className="grid grid-cols-1 gap-4 xl:gap-8 lg:grid-cols-2 lg:grid-rows-[auto_auto]">
 
          {/* Left Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-primary-100 bg-white p-8 lg:row-span-2 lg:min-h-[520px]">
            <div>
              {/* Headline */}
              <h1 className="font-semibold tracking-tight text-primary-800" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.1 }}>
                Take control of your{' '}
                <span className="text-accent-500">finances</span>{' '}
                with innovations
              </h1>
 
              <p className="mt-4 text-sm leading-relaxed text-black/70">
                {APP_NAME} is the AI-powered personal finance system that tracks your spending,
                scans receipts, detects anomalies, and gives you insights that actually help
                you save money.
              </p>
 
              {/* Stats */}
              <div className="mt-8 grid grid-cols-2 gap-3">
                {stats.slice(0, 2).map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-primary-50 p-4">
                    <p className="text-2xl font-bold tracking-tight text-primary-800">{stat.value}</p>
                    <p className="mt-1 text-xs text-primary-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
 
            {/* CTA */}
            <div className="mt-8">
              {isAuthenticated ? (
                <Link to="/dashboard" className="block">
                  <Button variant="primary" size="lg" className="w-full justify-center">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register" className="block">
                    <Button variant="primary" size="lg" className="w-full justify-center">
                      Start Free
                    </Button>
                  </Link>
                  <Link to="/login" className="mt-3 block text-center text-sm text-black/70">
                    Already have an account? <span className="text-accent-600 font-semibold">Sign in</span>
                  </Link>
                </>
              )}
            </div>
          </div>
 
          {/* Right top */}
          <div className="relative overflow-hidden rounded-2xl bg-primary-700 p-8 text-white lg:min-h-[260px]">
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary-600 opacity-40" />
            <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-accent-500 opacity-20" />
 
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <Zap className="h-3 w-3" />
                AI - Assistant
              </span>
              <h2 className="mt-4 text-2xl font-bold leading-tight text-white">
                AI-Powered<br />Insights
              </h2>
              <p className="mt-2 text-sm text-primary-200">
                Spending patterns, anomaly detection &amp; personalised advice.
              </p>
 
              {/* Mini animated waveform */}
              <div className="mt-6 flex items-end gap-1" aria-hidden="true">
                {[18, 32, 24, 40, 28, 16, 36, 22, 38, 26].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-sm bg-accent-400 opacity-80"
                    style={{
                      height: `${h}px`,
                      animation: `waveBar 1.4s ease-in-out ${i * 0.12}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
            </div>
 
            {/* Floating pill badges */}
            <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-primary-800 shadow-sm">
                <TrendingUp className="h-3 w-3 text-accent-500" />
                Smart Budgeting
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-primary-800 shadow-sm">
                <Sparkles className="h-3 w-3 text-accent-500" />
                Receipt Scanner
              </div>
            </div>
          </div>
 
          {/* Right Bottom */}
          <div className="grid grid-cols-2 gap-4">
 
            {/* Mini stats card */}
            <div className="flex flex-col justify-between rounded-2xl border border-primary-100 bg-primary-50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-700">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              {/* Mock mini bar chart */}
              <div className="my-4 flex items-end gap-1" aria-hidden="true">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${h * 0.6}px`,
                      background: i === 5 ? 'var(--color-accent-500, #f59e0b)' : '#cbd5e1',
                    }}
                  />
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-primary-800">Reports &amp; Analytics</p>
                <p className="mt-0.5 text-xs text-primary-400">Visual spending breakdowns</p>
              </div>
            </div>
 
            {/* Security card */}
            <div className="flex flex-col justify-between rounded-2xl bg-primary-800 p-5 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Shield className="h-5 w-5 text-white" />
              </div>
              {/* Mock "phone screen" feel */}
              <div className="my-3 space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-white/20" />
                <div className="h-1.5 w-4/5 rounded-full bg-white/15" />
                <div className="h-1.5 w-3/5 rounded-full bg-accent-400/60" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Bank-Grade Security</p>
                <p className="mt-0.5 text-xs text-primary-300">Encrypted &amp; private</p>
              </div>
            </div>
 
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary-800">Everything you need to master your money</h2>
          <p className="mt-3 text-primary-400">
            From daily tracking to AI-driven predictions — all in one place.
          </p>
        </div>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-primary-100 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-primary-800">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-primary-800">Get started in 3 steps</h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Create your account', desc: 'Sign up in under a minute with just your email.' },
              { step: '2', title: 'Log your first transaction', desc: 'Add an expense or income manually, or scan a receipt.' },
              { step: '3', title: 'Let AI do the rest', desc: 'Get automatic categorization, anomaly alerts, and savings insights.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-500 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-primary-800">{item.title}</h3>
                <p className="mt-2 text-sm text-primary-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile app CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="rounded-2xl bg-primary-700 px-8 py-14 text-center sm:px-16">
          <Smartphone className="mx-auto h-12 w-12 text-accent-400" />
          <h2 className="mt-6 text-3xl font-bold text-white">Take {APP_NAME} on the go</h2>
          <p className="mx-auto mt-3 max-w-lg text-primary-200">
            Download the mobile app for iOS and Android. Log expenses on the spot, scan receipts
            with your camera, and get real-time AI alerts.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-primary-800 transition-colors hover:bg-primary-50">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              App Store
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-primary-800 transition-colors hover:bg-primary-50">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.834 1.64a1 1 0 010 1.726l-2.834 1.64-2.536-2.536 2.536-2.47zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z"/></svg>
              Google Play
            </button>
          </div>
          <p className="mt-4 text-xs text-primary-300">Coming soon to both platforms</p>
        </div>
      </section>

      {/* Why ArthaSmart */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-primary-800">
            Why {APP_NAME}?
          </h2>
          <div className="mx-auto mt-10 max-w-2xl space-y-4">
            {[
              'Supports multiple currencies — switch anytime from your settings',
              'AI that learns your patterns and gives actionable advice, not just charts',
              'Receipt scanning that actually works — OCR with 94%+ accuracy',
              'Enterprise-grade security with encrypted data and strict access control',
              'Smart budgeting with real-time alerts before you overspend',
              'Cross-platform: web dashboard + iOS + Android, all in sync',
            ].map((point) => (
              <div key={point} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-500" />
                <p className="text-primary-600">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-primary-800">
          Ready to take control?
        </h2>
        <p className="mt-3 text-primary-400">
          Join thousands tracking their finances smarter with AI.
        </p>
        <Link to="/register" className="mt-8 inline-block">
          <Button variant="accent" size="lg">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-700 text-xs font-bold text-white">
                A
              </div>
              <span className="font-semibold text-primary-800">{APP_NAME}</span>
            </div>
            <div className="flex gap-6 text-sm text-primary-400">
              <Link to="/about" className="hover:text-primary-600">About</Link>
              <Link to="/privacy" className="hover:text-primary-600">Privacy</Link>
              <Link to="/terms" className="hover:text-primary-600">Terms</Link>
            </div>
            <p className="text-sm text-primary-300">
              &copy; 2026 {APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
