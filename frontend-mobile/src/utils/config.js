/**
 * App configuration, centralized access to environment variables.
 *
 * Expo SDK 54 auto-loads EXPO_PUBLIC_* vars from .env via @expo/env.
 * Access them via process.env.EXPO_PUBLIC_<KEY>.
 *
 * To add a new config value:
 *   1. Add EXPO_PUBLIC_MY_KEY=value to .env
 *   2. Add EXPO_PUBLIC_MY_KEY=placeholder to .env.example
 *   3. Export it below: MY_KEY: process.env.EXPO_PUBLIC_MY_KEY || ''
 */

export const config = {
  // OCR Service
  OCR_SPACE_API_KEY: process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY || '',
  OCR_SPACE_URL: 'https://api.ocr.space/parse/image',

  // Future: Google Cloud Vision
  GOOGLE_VISION_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '',

  // Google OAuth
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
};
