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
  Star,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { APP_NAME } from '@/utils/constants';

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
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-primary-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700 text-sm font-bold text-white">
              A
            </div>
            <span className="text-xl font-bold text-primary-800">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button variant="accent" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center lg:py-28">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-sm font-medium text-accent-700">
            <Star className="h-3.5 w-3.5" />
            AI-Powered Financial Intelligence
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-primary-800 sm:text-5xl lg:text-6xl">
            Take control of your
            <span className="text-accent-500"> finances</span>
          </h1>
          <p className="mt-6 text-lg text-primary-400 sm:text-xl">
            {APP_NAME} is the AI-powered personal finance system that tracks your spending,
            scans receipts, detects anomalies, and gives you insights that actually help
            you save money.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button variant="primary" size="lg">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">
                Sign in to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-primary-100 bg-primary-700">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-sm text-primary-200">{stat.label}</p>
            </div>
          ))}
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
