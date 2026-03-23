/**
 * Root navigator — switches between Auth and Main flows based on auth state.
 */
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

export function RootNavigator() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isLoading) {
    return <LoadingSpinner message="Loading ArthaSmart..." />;
  }

  return isAuthenticated ? <MainTabs /> : <AuthStack />;
}
