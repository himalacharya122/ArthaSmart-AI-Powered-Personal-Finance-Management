import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, Shield, Smartphone, Globe, Users, Zap } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { APP_NAME } from '@/utils/constants';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-primary-100">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-primary-400 hover:text-primary-600">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 text-xs font-bold text-white">
              A
            </div>
            <span className="font-bold text-primary-800">{APP_NAME}</span>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-extrabold text-primary-800">About {APP_NAME}</h1>
        <p className="mt-4 text-lg text-primary-500">
          {APP_NAME} is an AI-powered personal finance management system built to help individuals
          and families in Nepal and South Asia take control of their money — intelligently.
        </p>

        <div className="mt-12 space-y-10">
          <section>
            <h2 className="text-2xl font-bold text-primary-800">Our Mission</h2>
            <p className="mt-3 text-primary-500 leading-relaxed">
              Financial literacy shouldn&apos;t require a finance degree. We believe that with the right
              tools — powered by artificial intelligence — anyone can understand their spending habits,
              avoid overspending, and build a path toward financial independence. {APP_NAME} is built
              as both a college capstone project and a real startup product, combining academic rigor
              with startup ambition.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary-800">What Makes Us Different</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {[
                { icon: Brain, title: 'AI-First Design', desc: 'Every feature is enhanced by machine learning — from auto-categorization to anomaly detection.' },
                { icon: Globe, title: 'Nepal-First', desc: 'NPR default currency, localized for South Asian financial patterns and merchant names.' },
                { icon: Shield, title: 'Privacy by Design', desc: 'Owner-only data access, JWT with rotation, no third-party tracking or data selling.' },
                { icon: Smartphone, title: 'Cross-Platform', desc: 'Web dashboard, iOS app, Android app — all connected to the same secure backend.' },
                { icon: Zap, title: 'Real-Time Alerts', desc: 'Budget warnings before you overspend, unusual transaction detection, and saving streaks.' },
                { icon: Users, title: 'Open & Transparent', desc: 'Built by a team of BSc AI students at The British College, Kathmandu.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-800">{item.title}</h3>
                    <p className="mt-1 text-sm text-primary-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary-800">Tech Stack</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                'Django REST Framework', 'React', 'TypeScript', 'Tailwind CSS',
                'FastAPI', 'React Native', 'PostgreSQL', 'scikit-learn',
                'Tesseract OCR', 'Docker', 'JWT Auth',
              ].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-sm text-primary-600"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-primary-800">Version</h2>
            <p className="mt-2 text-primary-500">
              {APP_NAME} v1.0.0 &mdash; Sprint 4 (Web Frontend)
            </p>
            <p className="mt-1 text-sm text-primary-400">
              &copy; 2026 {APP_NAME}. All rights reserved.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <Link to="/register">
            <Button variant="accent" size="lg">Get Started Free</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
