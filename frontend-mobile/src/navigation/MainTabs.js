/**
 * Bottom tab navigator.
 *
 * Tabs: Home | Transactions | Scan | Chat | Settings
 *
 * - Clean, minimal icons
 * - Center "Scan" tab is slightly larger/highlighted
 * - Thin top border instead of shadow
 */
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/home/HomeScreen';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { ScannerScreen } from '../screens/scanner/ScannerScreen';
import { AIChatScreen } from '../screens/ai/AIChatScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { SCREEN_NAMES } from '../utils/constants';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const Tab = createBottomTabNavigator();

function ScanTabIcon({ focused }) {
  return (
    <View style={styles.scanButton}>
      <MaterialIcons
        name="qr-code-scanner"
        size={26}
        color={colors.white}
      />
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary[900],
        tabBarInactiveTintColor: colors.primary[400],
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name={SCREEN_NAMES.HOME_TAB}
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.TRANSACTIONS_TAB}
        component={TransactionsScreen}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.SCAN_TAB}
        component={ScannerScreen}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ focused }) => <ScanTabIcon focused={focused} />,
          tabBarLabelStyle: [styles.tabLabel, { color: colors.primary[900] }],
        }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.CHAT_TAB}
        component={AIChatScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat-bubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.SETTINGS_TAB}
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 0.5,
    borderTopColor: colors.primary[200],
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg + 4 : spacing.sm,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[900],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 0 : 4,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
