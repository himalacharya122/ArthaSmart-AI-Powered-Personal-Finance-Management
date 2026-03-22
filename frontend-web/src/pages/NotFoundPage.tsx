import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { APP_NAME } from '@/utils/constants';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 text-center">
      <h1 className="text-7xl font-extrabold text-primary-200">404</h1>
      <h2 className="mt-4 text-xl font-semibold text-primary-800">Page not found</h2>
      <p className="mt-2 max-w-md text-primary-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link to="/dashboard" className="mt-8">
        <Button variant="primary">Back to {APP_NAME}</Button>
      </Link>
    </div>
  );
}
