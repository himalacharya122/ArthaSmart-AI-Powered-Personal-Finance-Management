/**
 * Google OAuth service for ArthaSmart.
 *
 * Uses expo-auth-session with Google provider for Expo Go compatibility.
 * After getting a Google access token, sends it to our backend
 * which verifies and returns JWT tokens.
 */
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { config } from '../utils/config';
import api from './api';

// Ensure web browser auth sessions complete properly
WebBrowser.maybeCompleteAuthSession();

/**
 * Get the Google auth request hook config.
 * Call this inside a component: const [request, response, promptAsync] = useGoogleAuth();
 */
export function useGoogleAuthRequest() {
  return Google.useAuthRequest({
    androidClientId: config.GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: config.GOOGLE_IOS_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });
}

/**
 * Send Google token to our backend for verification and JWT exchange.
 * @param {string} accessToken — Google access token or ID token
 * @returns {{ user: object, tokens: { access: string, refresh: string } }}
 */
export async function authenticateWithGoogle(accessToken) {
  const { data } = await api.post('/api/v1/auth/google/', { token: accessToken });
  return data;
}
