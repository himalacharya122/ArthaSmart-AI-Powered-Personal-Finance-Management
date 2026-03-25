/**
 * Bottom tab navigator.
 *
 * Tabs: Home | Transactions | Scan | Chat | Settings
 *
 * - Clean, minimal icons
 * - Thin top border instead of shadow
 */
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { HomeStack } from './HomeStack';
import { TransactionsStack } from './TransactionsStack';
import { ScannerStack } from './ScannerStack';
import { ChatStack } from './ChatStack';
import { SettingsStack } from './SettingsStack';
import { SCREEN_NAMES } from '../utils/constants';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const Tab = createBottomTabNavigator();


export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary[800],
        tabBarInactiveTintColor: colors.primary[500],
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name={SCREEN_NAMES.HOME_TAB}
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home-filled" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.TRANSACTIONS_TAB}
        component={TransactionsStack}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.SCAN_TAB}
        component={ScannerStack}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="photo-camera" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.CHAT_TAB}
        component={ChatStack}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat-bubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={SCREEN_NAMES.SETTINGS_TAB}
        component={SettingsStack}
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
    fontWeight: '600',
    marginTop: 2,
  },
});
