import { createStackNavigator } from '@react-navigation/stack';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { CategoriesScreen } from '../screens/settings/CategoriesScreen';
import { ExportDataScreen } from '../screens/settings/ExportDataScreen';
import { AboutScreen } from '../screens/settings/AboutScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/settings/TermsOfServiceScreen';
import { MonthlyBudgetScreen } from '../screens/settings/MonthlyBudgetScreen';
import { CategoryBudgetsScreen } from '../screens/settings/CategoryBudgetsScreen';
import { SCREEN_NAMES } from '../utils/constants';

const Stack = createStackNavigator();

export function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={SCREEN_NAMES.SETTINGS} component={SettingsScreen} />
      <Stack.Screen name={SCREEN_NAMES.PROFILE} component={ProfileScreen} />
      <Stack.Screen name={SCREEN_NAMES.CATEGORIES} component={CategoriesScreen} />
      <Stack.Screen name={SCREEN_NAMES.EXPORT_DATA} component={ExportDataScreen} />
      <Stack.Screen name={SCREEN_NAMES.ABOUT} component={AboutScreen} />
      <Stack.Screen name={SCREEN_NAMES.PRIVACY_POLICY} component={PrivacyPolicyScreen} />
      <Stack.Screen name={SCREEN_NAMES.TERMS_OF_SERVICE} component={TermsOfServiceScreen} />
      <Stack.Screen name={SCREEN_NAMES.MONTHLY_BUDGET} component={MonthlyBudgetScreen} />
      <Stack.Screen name={SCREEN_NAMES.CATEGORY_BUDGETS} component={CategoryBudgetsScreen} />
    </Stack.Navigator>
  );
}
