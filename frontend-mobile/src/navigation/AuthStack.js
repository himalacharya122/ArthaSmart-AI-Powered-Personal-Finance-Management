import { createStackNavigator } from '@react-navigation/stack';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { VerifyEmailScreen } from '../screens/auth/VerifyEmailScreen';
import { SCREEN_NAMES } from '../utils/constants';
import { useAuthStore } from '../store/authStore';

const Stack = createStackNavigator();

export function AuthStack() {
  const hasSeenOnboarding = useAuthStore((s) => s.hasSeenOnboarding);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={hasSeenOnboarding ? SCREEN_NAMES.LOGIN : SCREEN_NAMES.ONBOARDING}
    >
      <Stack.Screen name={SCREEN_NAMES.ONBOARDING} component={OnboardingScreen} />
      <Stack.Screen name={SCREEN_NAMES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={SCREEN_NAMES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={SCREEN_NAMES.VERIFY_EMAIL} component={VerifyEmailScreen} />
      <Stack.Screen name={SCREEN_NAMES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
