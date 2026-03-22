import { Link } from 'react-router-dom';
import { APP_NAME } from '@/utils/constants';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-primary-100">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700 text-sm font-bold text-white">
              A
            </div>
            <span className="text-xl font-bold text-primary-800">{APP_NAME}</span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-bold text-primary-800">Privacy Policy</h1>
        <p className="mt-2 text-sm text-primary-400">Last updated: March 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-primary-600">
          <section>
            <h2 className="text-lg font-semibold text-primary-800">1. Information We Collect</h2>
            <p className="mt-3">
              When you create an account, we collect your name, email address, and password. As you use {APP_NAME}, we collect financial data you provide, including expenses, incomes, budgets, and categories. We also collect device information and usage analytics to improve our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">2. How We Use Your Information</h2>
            <p className="mt-3">
              Your data is used to provide and improve {APP_NAME}'s services, including AI-powered financial insights, spending analysis, and personalized recommendations. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">3. Data Storage & Security</h2>
            <p className="mt-3">
              All financial data is encrypted in transit and at rest. We use industry-standard security measures including JWT-based authentication with token rotation, strict data isolation between accounts, and regular security audits. Your data is stored on secure servers with restricted access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">4. AI & Data Processing</h2>
            <p className="mt-3">
              {APP_NAME} uses artificial intelligence to analyze your spending patterns and provide personalized insights. This processing happens on our servers. Your data is never used to train general AI models and is only used to improve your personal experience within the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">5. Data Sharing</h2>
            <p className="mt-3">
              We do not share your personal financial data with third parties except as necessary to operate our services (e.g., cloud hosting providers bound by data processing agreements). We may share anonymized, aggregated statistics that cannot identify individual users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">6. Your Rights</h2>
            <p className="mt-3">
              You have the right to access, export, and delete your data at any time. You can export your expenses and incomes as CSV files from the Reports page. You can delete your account from the Settings page, which will permanently remove all your data from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">7. Cookies & Tracking</h2>
            <p className="mt-3">
              {APP_NAME} uses essential cookies for authentication and session management. We use privacy-respecting analytics to understand how our service is used. We do not use third-party advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">8. Changes to This Policy</h2>
            <p className="mt-3">
              We may update this privacy policy from time to time. We will notify you of any material changes by email or through a notice within the application. Continued use of {APP_NAME} after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">9. Contact Us</h2>
            <p className="mt-3">
              If you have questions about this privacy policy or how we handle your data, please contact us at{' '}
              <a href="mailto:privacy@arthasmart.com" className="text-primary-700 underline hover:text-primary-800">
                privacy@arthasmart.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-primary-100 pt-6 text-center">
          <Link to="/" className="text-sm text-primary-400 hover:text-primary-600">
            &larr; Back to {APP_NAME}
          </Link>
        </div>
      </div>
    </div>
  );
}
