import { colors } from './colors';

export const typography = {
  h1: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 30, // Increased from 28
    color: colors.primary[800],
    letterSpacing: -1.0, // Even tighter for larger sizes
  },
  h2: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 24, // Increased from 22
    color: colors.primary[800],
    letterSpacing: -0.6,
  },
  h3: {
    fontFamily: 'Manrope-ExtraBold', // Shifted from Bold to ExtraBold
    fontSize: 20, // Increased from 18
    color: colors.primary[800],
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: 'Manrope-SemiBold', // Shifted from Medium to SemiBold for a "chunky" feel
    fontSize: 16, // Increased from 15
    color: colors.primary[800], // Slightly darker for more "ink" weight
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: 'Manrope-SemiBold', // SemiBold for small body
    fontSize: 14, // Increased from 13
    color: colors.primary[700],
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Manrope-Bold', // Shifted from SemiBold to Bold
    fontSize: 12,
    color: colors.primary[500],
    lineHeight: 16,
  },
  label: {
    fontFamily: 'Manrope-ExtraBold', // ExtraBold labels
    fontSize: 14,
    color: colors.primary[800],
  },
  button: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 16,
  },
  buttonSmall: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 14,
  },
};
