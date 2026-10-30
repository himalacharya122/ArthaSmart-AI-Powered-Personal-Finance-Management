/**
 * Biometric authentication service.
 *
 * Uses expo-local-authentication for fingerprint/face unlock.
 * Provides: check availability, enroll, authenticate.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from '../utils/storage';

/**
 * Check if the device supports biometric authentication.
 * @returns {{ available: boolean, types: number[], enrolled: boolean }}
 */
export async function checkBiometricSupport() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return { available: false, types: [], enrolled: false };
  }

  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  return {
    available: true,
    types: supportedTypes,
    enrolled: isEnrolled,
  };
}

/**
 * Get a human-readable label for the biometric type available.
 */
export async function getBiometricLabel() {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'Biometric';
}

/**
 * Authenticate using biometrics.
 * @param {string} promptMessage — Message shown to the user
 * @returns {{ success: boolean, error?: string }}
 */
export async function authenticate(promptMessage = 'Unlock Squirrel') {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Use Password',
    disableDeviceFallback: false,
    fallbackLabel: 'Use Passcode',
  });

  return {
    success: result.success,
    error: result.error || null,
  };
}

/**
 * Enable biometric lock for the app.
 */
export async function enableBiometric() {
  await storage.setBiometricEnabled(true);
}

/**
 * Disable biometric lock.
 */
export async function disableBiometric() {
  await storage.setBiometricEnabled(false);
}

/**
 * Check if user has enabled biometric lock.
 */
export async function isBiometricEnabled() {
  return storage.isBiometricEnabled();
}
