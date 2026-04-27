import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/home/HomeScreen';
import { NotificationsScreen } from '../screens/home/NotificationsScreen';
import { SCREEN_NAMES } from '../utils/constants';

const Stack = createStackNavigator();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={SCREEN_NAMES.HOME} component={HomeScreen} />
      <Stack.Screen name={SCREEN_NAMES.NOTIFICATION_LIST} component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
