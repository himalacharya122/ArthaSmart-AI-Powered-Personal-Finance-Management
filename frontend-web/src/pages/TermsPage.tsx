import { Link } from 'react-router-dom';
import { APP_NAME } from '@/utils/constants';

export function TermsPage() {
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
        <h1 className="text-3xl font-bold text-primary-800">Terms of Service</h1>
        <p className="mt-2 text-sm text-primary-400">Last updated: March 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-primary-600">
          <section>
            <h2 className="text-lg font-semibold text-primary-800">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By creating an account or using {APP_NAME}, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">2. Description of Service</h2>
            <p className="mt-3">
              {APP_NAME} is an AI-powered personal finance management platform that provides expense tracking, income management, budgeting, receipt scanning, financial insights, and analytics. The service is available through our web dashboard and mobile applications.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">3. Account Registration</h2>
            <p className="mt-3">
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 16 years old to use {APP_NAME}.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">4. User Data & Ownership</h2>
            <p className="mt-3">
              You retain full ownership of any data you enter into {APP_NAME}. We do not claim ownership over your financial data. You grant us a limited license to process your data solely for the purpose of providing and improving our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">5. Acceptable Use</h2>
            <p className="mt-3">
              You agree not to misuse {APP_NAME}'s services. This includes attempting to access other users' data, interfering with the service's operation, reverse-engineering our software, or using the service for any illegal purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">6. AI-Generated Insights</h2>
            <p className="mt-3">
              {APP_NAME}'s AI features provide suggestions and insights based on your financial data. These are informational only and should not be considered professional financial advice. We recommend consulting a qualified financial advisor for major financial decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">7. Service Availability</h2>
            <p className="mt-3">
              We strive to maintain high availability but do not guarantee uninterrupted service. We may perform maintenance, updates, or experience outages. We will make reasonable efforts to notify users of planned downtime in advance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">8. Account Termination</h2>
            <p className="mt-3">
              You may delete your account at any time from the Settings page. We reserve the right to suspend or terminate accounts that violate these terms. Upon account deletion, your data will be permanently removed from our systems within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">9. Limitation of Liability</h2>
            <p className="mt-3">
              {APP_NAME} is provided "as is" without warranties of any kind. We are not liable for any financial decisions made based on information provided by our service. Our total liability shall not exceed the amount paid by you for the service in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">10. Changes to Terms</h2>
            <p className="mt-3">
              We may update these terms from time to time. Material changes will be communicated via email or in-app notification. Your continued use of {APP_NAME} after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-primary-800">11. Contact</h2>
            <p className="mt-3">
              For questions about these terms, contact us at{' '}
              <a href="mailto:legal@arthasmart.com" className="text-primary-700 underline hover:text-primary-800">
                legal@arthasmart.com
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
