/**
 * Google OAuth service for ArthaSmart.
 *
 * Two distinct runtime environments:
 *
 *  1. Expo Go (development)
 *     - Bundle is `host.exp.exponent`, not our `com.arthasmart.app`, so the
 *       Android/iOS native client IDs would mismatch.
 *     - Solution: force the Web client + the auth.expo.io proxy redirect URI.
 *       The proxy URI MUST be registered in the Web client's Authorized
 *       redirect URIs.
 *
 *  2. EAS-built standalone (dev-client / production)
 *     - Real bundle identifier, so the platform-native client IDs work via
 *       custom-scheme deep links.
 *
 *  Constants.appOwnership === 'expo' is the documented way to distinguish
 *  Expo Go from a built app.
 */
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { config } from '../utils/config';
import api from './api';

WebBrowser.maybeCompleteAuthSession();

// Update both ends together if you ever change Expo account or app slug:
//   1. These constants
//   2. The redirect URI in Google Cloud Console → Web OAuth client
const EXPO_OWNER = 'himal-acharya';
const APP_SLUG = 'arthasmart';
const PROXY_REDIRECT = `https://auth.expo.io/@${EXPO_OWNER}/${APP_SLUG}`;

const isExpoGo = Constants.appOwnership === 'expo';

export function useGoogleAuthRequest() {
  if (isExpoGo) {
    // In Expo Go, only the Web client + proxy redirect URI works.
    // Crucially we do NOT pass androidClientId/iosClientId — if we do, the
    // Google provider auto-selects the platform-native client (which lacks
    // the https://auth.expo.io/... redirect URI and triggers
    // redirect_uri_mismatch).
    return Google.useAuthRequest({
      clientId: config.GOOGLE_WEB_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: PROXY_REDIRECT,
    });
  }

  // Real built app: native client IDs handle the deep-link round-trip.
  return Google.useAuthRequest({
    webClientId: config.GOOGLE_WEB_CLIENT_ID,
    androidClientId: config.GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: config.GOOGLE_IOS_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });
}

/**
 * Send Google token to our backend for verification and JWT exchange.
 */
export async function authenticateWithGoogle(accessToken) {
  const { data } = await api.post('/api/v1/auth/google/', { token: accessToken });
  return data;
}
