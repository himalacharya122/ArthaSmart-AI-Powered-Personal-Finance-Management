import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { APP_NAME } from '@/utils/constants';
import { useAuthStore } from '@/store/authStore';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By creating an account or using ${APP_NAME}, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.`,
  },
  {
    id: 'description',
    title: '2. Description of Service',
    content: `${APP_NAME} is an AI-powered personal finance management platform that provides expense tracking, income management, budgeting, receipt scanning, financial insights, and analytics. The service is available through our web dashboard and mobile applications.`,
  },
  {
    id: 'registration',
    title: '3. Account Registration',
    content: `You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 16 years old to use ${APP_NAME}.`,
  },
  {
    id: 'user-data',
    title: '4. User Data & Ownership',
    content: `You retain full ownership of any data you enter into ${APP_NAME}. We do not claim ownership over your financial data. You grant us a limited license to process your data solely for the purpose of providing and improving our services.`,
  },
  {
    id: 'acceptable-use',
    title: '5. Acceptable Use',
    content: `You agree not to misuse ${APP_NAME}'s services. This includes attempting to access other users' data, interfering with the service's operation, reverse-engineering our software, or using the service for any illegal purpose.`,
  },
  {
    id: 'ai-insights',
    title: '6. AI-Generated Insights',
    content: `${APP_NAME}'s AI features provide suggestions and insights based on your financial data. These are informational only and should not be considered professional financial advice. We recommend consulting a qualified financial advisor for major financial decisions.`,
  },
  {
    id: 'availability',
    title: '7. Service Availability',
    content: `We strive to maintain high availability but do not guarantee uninterrupted service. We may perform maintenance, updates, or experience outages. We will make reasonable efforts to notify users of planned downtime in advance.`,
  },
  {
    id: 'termination',
    title: '8. Account Termination',
    content: `You may delete your account at any time from the Settings page. We reserve the right to suspend or terminate accounts that violate these terms. Upon account deletion, your data will be permanently removed from our systems within 30 days.`,
  },
  {
    id: 'liability',
    title: '9. Limitation of Liability',
    content: `${APP_NAME} is provided "as is" without warranties of any kind. We are not liable for any financial decisions made based on information provided by our service. Our total liability shall not exceed the amount paid by you for the service in the preceding 12 months.`,
  },
  {
    id: 'changes',
    title: '10. Changes to Terms',
    content: `We may update these terms from time to time. Material changes will be communicated via email or in-app notification. Your continued use of ${APP_NAME} after changes constitutes acceptance of the updated terms.`,
  },
  {
    id: 'contact',
    title: '11. Contact',
    content: '',
  },
];

export function TermsPage() {
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
              <Link to="/privacy" className="text-sm font-medium text-primary-950/80 transition-colors hover:text-primary-950">Privacy</Link>
              <Link to="/terms" className="text-sm font-medium text-primary-950 transition-colors">Terms</Link>
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
          <h1 className="text-2xl font-bold tracking-tight text-primary-950 lg:text-3xl">Terms of Service</h1>
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
                    For questions about these terms, contact us at{' '}
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
