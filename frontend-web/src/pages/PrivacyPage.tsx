import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { APP_NAME } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';

const sections = [
  {
    id: 'information-we-collect',
    title: '1. Information We Collect',
    content: `When you create an account, we collect your name, email address, and password. As you use ${APP_NAME}, we collect financial data you provide, including expenses, incomes, budgets, and categories. We also collect device information and usage analytics to improve our services.`,
  },
  {
    id: 'how-we-use',
    title: '2. How We Use Your Information',
    content: `Your data is used to provide and improve ${APP_NAME}'s services, including AI-powered financial insights, spending analysis, and personalized recommendations. We do not sell your personal information to third parties.`,
  },
  {
    id: 'data-storage',
    title: '3. Data Storage & Security',
    content: `All financial data is encrypted in transit and at rest. We use industry-standard security measures including JWT-based authentication with token rotation, strict data isolation between accounts, and regular security audits. Your data is stored on secure servers with restricted access.`,
  },
  {
    id: 'ai-processing',
    title: '4. AI & Data Processing',
    content: `${APP_NAME} uses artificial intelligence to analyze your spending patterns and provide personalized insights. This processing happens on our servers. Your data is never used to train general AI models and is only used to improve your personal experience within the app.`,
  },
  {
    id: 'data-sharing',
    title: '5. Data Sharing',
    content: `We do not share your personal financial data with third parties except as necessary to operate our services (e.g., cloud hosting providers bound by data processing agreements). We may share anonymized, aggregated statistics that cannot identify individual users.`,
  },
  {
    id: 'your-rights',
    title: '6. Your Rights',
    content: `You have the right to access, export, and delete your data at any time. You can export your expenses and incomes as CSV files from the Reports page. You can delete your account from the Settings page, which will permanently remove all your data from our systems.`,
  },
  {
    id: 'cookies',
    title: '7. Cookies & Tracking',
    content: `${APP_NAME} uses essential cookies for authentication and session management. We use privacy-respecting analytics to understand how our service is used. We do not use third-party advertising trackers.`,
  },
  {
    id: 'policy-changes',
    title: '8. Changes to This Policy',
    content: `We may update this privacy policy from time to time. We will notify you of any material changes by email or through a notice within the application. Continued use of ${APP_NAME} after changes constitutes acceptance of the updated policy.`,
  },
  {
    id: 'contact',
    title: '9. Contact Us',
    content: '',
  },
];

export function PrivacyPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeId, setActiveId] = useState(sections[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    for (const section of sections) {
      const el = sectionRefs.current[section.id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-primary-950/20 bg-white/80 backdrop-blur-lg">
        <div className="flex h-16 w-full items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <span className="text-lg font-bold text-primary-950">{APP_NAME}</span>
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              <Link to="/" className="text-sm font-medium text-primary-950/80 transition-colors hover:text-primary-950">Home</Link>
              <Link to="/about" className="text-sm font-medium text-primary-950/80 transition-colors hover:text-primary-950">About</Link>
              <Link to="/privacy" className="text-sm font-medium text-primary-950 transition-colors">Privacy</Link>
              <Link to="/terms" className="text-sm font-medium text-primary-950/80 transition-colors hover:text-primary-950">Terms</Link>
            </div>
          </div>
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
      <section className="bg-white border-b border-primary-950/20 py-8 lg:py-12">
        <div className="mx-auto max-w-5xl px-6">
          <h1 className="text-2xl font-bold tracking-tight text-primary-950 lg:text-3xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-primary-950/80">Last updated: March 2026</p>
        </div>
      </section>

      {/* TOC + Content */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto flex max-w-5xl gap-12 px-6">

          {/* TOC sidebar — desktop */}
          <aside className="hidden w-56 flex-shrink-0 lg:block">
            <nav className="sticky top-24">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-primary-950">On this page</p>
              <ul className="space-y-1">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                        activeId === section.id
                          ? 'bg-primary-950/5 font-medium text-primary-950'
                          : 'text-primary-950/80 hover:text-primary-700'
                      }`}
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-10">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
                className="scroll-mt-24"
              >
                <h2 className="text-lg font-semibold text-primary-950">{section.title}</h2>
                {section.id === 'contact' ? (
                  <p className="mt-3 text-sm leading-relaxed text-primary-900">
                    If you have questions about this privacy policy or how we handle your data, please contact us at{' '}
                    <a href="mailto:support@example.com" className="font-medium text-primary-800 underline underline-offset-2 hover:text-primary-950">
                      support@example.com
                    </a>.
                  </p>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-primary-950">{section.content}</p>
                )}
              </section>
            ))}
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
