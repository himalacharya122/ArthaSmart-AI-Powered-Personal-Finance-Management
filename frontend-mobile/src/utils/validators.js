/**
 * Form validation rules for react-hook-form.
 */

export const emailRules = {
  required: 'Email is required',
  pattern: {
    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
    message: 'Invalid email address',
  },
};

export const passwordRules = {
  required: 'Password is required',
  minLength: {
    value: 8,
    message: 'Password must be at least 8 characters',
  },
};

export const nameRules = {
  required: 'Name is required',
  minLength: {
    value: 2,
    message: 'Name must be at least 2 characters',
  },
};

export const amountRules = {
  required: 'Amount is required',
  min: {
    value: 0.01,
    message: 'Amount must be greater than 0',
  },
};

/**
 * Check password strength (0-4).
 * @param {string} password
 * @returns {{ score: number, label: string, color: string }}
 */
export function checkPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '#CED4DA' };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Weak', color: '#EF4444' },
    { label: 'Fair', color: '#F59E0B' },
    { label: 'Good', color: '#FBBF24' },
    { label: 'Strong', color: '#34D399' },
    { label: 'Very Strong', color: '#10B981' },
  ];

  return { score, ...levels[score] };
}

/**
 * Password requirement checks for the checklist UI.
 */
export function getPasswordChecks(password) {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase & lowercase letters', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'At least one number', met: /\d/.test(password) },
    { label: 'At least one special character', met: /[^a-zA-Z0-9]/.test(password) },
  ];
}
