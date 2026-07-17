import { useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Shield,
  Smartphone,
  Globe,
  Users,
  Zap,
  Target,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { APP_NAME } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';

/* Scroll reveal hook */
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

/* Component */
export function AboutPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const revealMission = useScrollReveal();
  const revealDifference = useScrollReveal();
  const revealCta = useScrollReveal();

  const differences = [
    {
      icon: Brain,
      title: 'AI-First Design',
      description: 'Every feature is enhanced by machine learning — from auto-categorization to anomaly detection.',
    },
    {
      icon: Globe,
      title: 'Multi-Currency Support',
      description: 'Support for currencies worldwide with localized patterns and international merchant ecosystems.',
    },
    {
      icon: Shield,
      title: 'Privacy by Design',
      description: 'Owner-only data access, JWT with rotation, no third-party tracking or data selling.',
    },
    {
      icon: Smartphone,
      title: 'Cross-Platform',
      description: 'Web dashboard, iOS app, Android app — all connected to the same secure backend.',
    },
    {
      icon: Zap,
      title: 'Real-Time Alerts',
      description: 'Budget warnings before you overspend, unusual transaction detection, and saving streaks.',
    },
    {
      icon: Users,
      title: 'Open & Transparent',
      description: 'Built by a team of BSc AI students at The British College, Kathmandu.',
    },
  ];



  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-primary-950/20 bg-white/80 backdrop-blur-lg">
        <div className="flex h-16 w-full items-center justify-between px-6">
          {/* Left: logo + nav links */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <span className="text-lg font-bold text-primary-950">{APP_NAME}</span>
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              <Link to="/" className="text-sm font-medium leading-relaxed text-primary-950/80 transition-colors hover:text-primary-950">Home</Link>
              <Link to="/about" className="text-sm font-medium leading-relaxed text-primary-950 transition-colors">About</Link>
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

      {/* Header */}
      <section className="bg-white border-b border-primary-950/20 py-12 lg:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h1 className="text-3xl font-bold tracking-tight text-primary-950 lg:text-4xl">About {APP_NAME}</h1>
          <p className="mt-4 max-w-2xl text-base text-primary-950/70 lg:text-lg">
            {APP_NAME} is an AI-powered personal finance management system built to help individuals
            and families in Nepal and South Asia take control of their money — intelligently.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section
        ref={revealMission}
        className="border-b border-primary-950/20 bg-white py-16 opacity-0 translate-y-8 transition-all duration-700 ease-out lg:py-20"
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-primary-950 lg:text-3xl">
                Our Mission
              </h2>
              <p className="mt-6 text-base leading-relaxed text-primary-950/80">
                Financial literacy shouldn&apos;t require a finance degree. We believe that with the right
                tools — powered by artificial intelligence — anyone can understand their spending habits,
                avoid overspending, and build a path toward financial independence.
              </p>
              <p className="mt-4 text-base leading-relaxed text-primary-950/80">
                {APP_NAME} is built as both a college capstone project and a real startup product, combining
                academic rigor with startup ambition. We&apos;re not just solving a problem—we&apos;re building
                the future of personal finance for South Asia.
              </p>
            </div>
            <div className="flex h-80 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50/50 p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary-800">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <p className="text-center text-sm font-medium text-primary-700">
                  Making financial clarity accessible to everyone
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section
        ref={revealDifference}
        className="bg-white py-16 opacity-0 translate-y-8 transition-all duration-700 ease-out lg:py-20"
      >
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-primary-950 lg:text-3xl">
            What Makes Us Different
          </h2>
          <p className="mt-4 text-base text-primary-950/70">
            We combine cutting-edge AI with deep understanding of local financial ecosystems.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {differences.map((item) => (
              <div key={item.title} className="flex flex-col gap-4 rounded-xl border border-primary-100 bg-white p-6 transition-all hover:border-primary-200 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-950">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-950">{item.title}</h3>
                  <p className="mt-2 text-sm text-primary-950/70">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* CTA */}
      <section
        ref={revealCta}
        className="bg-white py-16 opacity-0 translate-y-8 transition-all duration-700 ease-out lg:py-20"
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-3xl border border-primary-200 bg-primary-50/50 px-8 py-16 text-center sm:px-16">
            <h2 className="text-3xl font-bold tracking-tight text-primary-950 lg:text-4xl">
              Ready to Take Control?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-primary-950/70">
              Join us on our mission to make personal finance clear, simple, and accessible for everyone.
            </p>
            <div className="mt-8 flex flex-col gap-3 items-center justify-center sm:flex-row">
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
                  <Link to="/login" className="text-sm font-medium text-primary-950">
                    Already have an account? <span className="font-semibold text-primary-700 underline underline-offset-2">Sign in</span>
                  </Link>
                </>
              )}
            </div>
          </div>
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
