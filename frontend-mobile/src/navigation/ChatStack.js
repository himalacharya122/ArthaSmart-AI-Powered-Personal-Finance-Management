/**
 * Chat / AI stack navigator.
 *
 * ChatTab --> AIHubScreen (hub with insights + quick actions)
 *         --> AIChatScreen (conversation)
 *         --> SpendingInsightsScreen (category breakdown + charts)
 *         --> FinancialReportScreen (monthly health report)
 *         --> AnomalyAlertsScreen (anomaly + budget alerts)
 */
import { createStackNavigator } from '@react-navigation/stack';
import { AIHubScreen } from '../screens/ai/AIHubScreen';
import { AIChatScreen } from '../screens/ai/AIChatScreen';
import { SpendingInsightsScreen } from '../screens/ai/SpendingInsightsScreen';
import { FinancialReportScreen } from '../screens/ai/FinancialReportScreen';
import { AnomalyAlertsScreen } from '../screens/ai/AnomalyAlertsScreen';
import { SCREEN_NAMES } from '../utils/constants';

const Stack = createStackNavigator();

export function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={SCREEN_NAMES.AI_HUB} component={AIHubScreen} />
      <Stack.Screen name={SCREEN_NAMES.AI_CHAT} component={AIChatScreen} />
      <Stack.Screen name={SCREEN_NAMES.INSIGHTS} component={SpendingInsightsScreen} />
      <Stack.Screen name={SCREEN_NAMES.FINANCIAL_REPORT} component={FinancialReportScreen} />
      <Stack.Screen name={SCREEN_NAMES.ANOMALIES} component={AnomalyAlertsScreen} />
    </Stack.Navigator>
  );
}
