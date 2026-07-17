/**
 * Push notification utilities — Expo Notifications integration.
 *
 * Handles:
 *  - Requesting permission
 *  - Getting Expo push token
 *  - Registering token with backend (when endpoint exists)
 *  - Setting up notification handlers
 *  - Configuring notification channels (Android)
 */
import { Platform } from 'react-native';
import { storage } from './storage';

let Notifications;
try {
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

let Device;
try {
  Device = require('expo-device');
} catch {
  Device = null;
}

/**
 * Set up notification handlers and channels.
 * Call once at app startup.
 */
export async function setupPushNotifications() {
  if (!Notifications) {
    console.warn('expo-notifications not available');
    return;
  }

  // Set notification handler — how to display when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'ArthaSmart',
      importance: Notifications.AndroidImportance?.MAX || 4,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    });

    await Notifications.setNotificationChannelAsync('budget-alerts', {
      name: 'Budget Alerts',
      importance: Notifications.AndroidImportance?.HIGH || 3,
      description: 'Alerts when you approach or exceed budget limits',
    });

    await Notifications.setNotificationChannelAsync('insights', {
      name: 'AI Insights',
      importance: Notifications.AndroidImportance?.DEFAULT || 2,
      description: 'Smart spending insights and recommendations',
    });
  }
}

/**
 * Request notification permissions and get the Expo push token.
 * @returns {string|null} Expo push token or null
 */
export async function registerForPushNotifications() {
  if (!Notifications) return null;

  // Physical device check (push doesn't work on emulators without Expo)
  if (Device && !Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  try {
    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Set Expo project ID here after running `eas init`
    });

    const token = tokenResponse.data;

    // Store token locally
    await storage.set('expoPushToken', token);

    // Register token with backend (when endpoint is available)
    // await registerDeviceToken(token);

    return token;
  } catch (err) {
    console.warn('Failed to register for push notifications:', err);
    return null;
  }
}

/**
 * Register device token with backend.
 * NOTE: Backend needs a device token endpoint, implement when ready.
 */
// async function registerDeviceToken(token) {
//   try {
//     const api = require('../services/api').default;
//     await api.post('/api/v1/notifications/register-device/', {
//       token,
//       platform: Platform.OS,
//       device_type: 'expo',
//     });
//   } catch (err) {
//     console.warn('Failed to register device token:', err);
//   }
// }

/**
 * Add a listener for received notifications (foreground).
 * @param {function} callback
 * @returns {object} subscription — call .remove() to unsubscribe
 */
export function onNotificationReceived(callback) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for notification taps (background/killed).
 * @param {function} callback — receives the notification response
 * @returns {object} subscription
 */
export function onNotificationTapped(callback) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Schedule a local notification (useful for reminders).
 */
export async function scheduleLocalNotification({ title, body, data, seconds = 1 }) {
  if (!Notifications) return;
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: { seconds },
  });
}

/**
 * Get the badge count.
 */
export async function getBadgeCount() {
  if (!Notifications) return 0;
  return Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count.
 */
export async function setBadgeCount(count) {
  if (!Notifications) return;
  return Notifications.setBadgeCountAsync(count);
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications() {
  if (!Notifications) return;
  return Notifications.cancelAllScheduledNotificationsAsync();
}
