#!/usr/bin/env node

/**
 * WCAG AA Contrast Checker
 * 
 * Validates color combinations in the OSS Wishlist design system.
 * WCAG AA requires:
 * - 4.5:1 ratio for normal text (under 18pt / 14pt bold)
 * - 3:1 ratio for large text (18pt+ or 14pt+ bold)
 * - 3:1 ratio for UI components (buttons, form inputs, etc.)
 */

// RGB to relative luminance (WCAG formula)
function getLuminance(r, g, b) {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLum = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLum = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLum = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
}

// Calculate contrast ratio between two colors
function getContrastRatio(rgb1, rgb2) {
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Color palette (from Tailwind and global.css)
const colors = {
  white: { r: 255, g: 255, b: 255 },
  'gray-50': { r: 249, g: 250, b: 251 },
  'gray-100': { r: 243, g: 244, b: 246 },
  'gray-200': { r: 229, g: 231, b: 235 },
  'gray-300': { r: 209, g: 213, b: 219 },
  'gray-400': { r: 156, g: 163, b: 175 },
  'gray-500': { r: 107, g: 114, b: 128 },
  'gray-600': { r: 75, g: 85, b: 99 },
  'gray-700': { r: 55, g: 65, b: 81 },
  'gray-800': { r: 31, g: 41, b: 55 },
  'gray-900': { r: 17, g: 24, b: 39 },
  'purple-500': { r: 168, g: 85, b: 247 },
  'purple-600': { r: 147, g: 51, b: 234 },
  'violet-700': { r: 109, g: 40, b: 217 },
};

// Test combinations used in the design
const tests = [
  // Body text
  { name: 'Body text (gray-900 on gray-50)', fg: 'gray-900', bg: 'gray-50', type: 'normal', context: 'Body text' },
  { name: 'Body text (gray-900 on white)', fg: 'gray-900', bg: 'white', type: 'normal', context: 'Card body text' },
  { name: 'Subtle text (gray-600 on white)', fg: 'gray-600', bg: 'white', type: 'normal', context: 'Secondary text' },
  { name: 'Subtle text (gray-600 on gray-50)', fg: 'gray-600', bg: 'gray-50', type: 'normal', context: 'Timestamps, metadata' },
  { name: 'Muted text (gray-500 on white)', fg: 'gray-500', bg: 'white', type: 'normal', context: 'Placeholder text' },
  
  // Buttons
  { name: '.btn-primary (white on gray-700)', fg: 'white', bg: 'gray-700', type: 'large', context: 'Primary button text' },
  { name: '.btn-primary hover (white on gray-800)', fg: 'white', bg: 'gray-800', type: 'large', context: 'Primary button hover' },
  { name: '.btn-secondary (gray-800 on white)', fg: 'gray-800', bg: 'white', type: 'large', context: 'Secondary button text' },
  
  // Sparkle button
  { name: '.btn-sparkle base (white on gray-700)', fg: 'white', bg: 'gray-700', type: 'large', context: 'Sparkle button (gradient start)' },
  { name: '.btn-sparkle hover (white on purple-600)', fg: 'white', bg: 'purple-600', type: 'large', context: 'Sparkle button hover' },
  
  // Links
  { name: '.link-secondary (gray-700 on white)', fg: 'gray-700', bg: 'white', type: 'normal', context: 'Secondary link' },
  { name: '.link-secondary hover (violet-700 on white)', fg: 'violet-700', bg: 'white', type: 'normal', context: 'Secondary link hover' },
  
  // Badges
  { name: '.badge-neutral (gray-700 on gray-200)', fg: 'gray-700', bg: 'gray-200', type: 'large', context: 'Neutral badge' },
  { name: '.badge-muted (gray-500 on gray-100)', fg: 'gray-500', bg: 'gray-100', type: 'large', context: 'Muted badge' },
  { name: '.badge-pending (violet-700 on purple-light)', fg: 'violet-700', bg: 'white', type: 'large', context: 'Pending badge (approximation)' },
  
  // Alerts
  { name: '.alert-info (gray-700 on gray-100)', fg: 'gray-700', bg: 'gray-100', type: 'normal', context: 'Info alert text' },
  { name: '.alert-warning (approx)', fg: 'gray-800', bg: 'white', type: 'normal', context: 'Warning alert (using gray-800)' },
  
  // Focus states
  { name: 'Focus outline (purple-600 on white)', fg: 'purple-600', bg: 'white', type: 'ui', context: 'Focus ring' },
];

console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                         WCAG AA Contrast Analysis                              ║');
console.log('║                          OSS Wishlist Design System                            ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

console.log('WCAG AA Requirements:');
console.log('  • Normal text (< 18pt): 4.5:1 minimum');
console.log('  • Large text (≥ 18pt / 14pt bold): 3:1 minimum');
console.log('  • UI components: 3:1 minimum\n');
console.log('─'.repeat(80) + '\n');

let passCount = 0;
let failCount = 0;

tests.forEach((test) => {
  const fgColor = colors[test.fg];
  const bgColor = colors[test.bg];
  const ratio = getContrastRatio(fgColor, bgColor);
  
  // Determine pass/fail based on type
  let required;
  if (test.type === 'normal') {
    required = 4.5;
  } else if (test.type === 'large') {
    required = 3.0;
  } else if (test.type === 'ui') {
    required = 3.0;
  }
  
  const pass = ratio >= required;
  if (pass) passCount++;
  else failCount++;
  
  const status = pass ? '✅ PASS' : '❌ FAIL';
  const emoji = pass ? '' : ' ⚠️';
  
  console.log(`${status}${emoji}`);
  console.log(`  ${test.name}`);
  console.log(`  Context: ${test.context}`);
  console.log(`  Ratio: ${ratio.toFixed(2)}:1 (requires ${required.toFixed(1)}:1 for ${test.type} text)`);
  console.log('');
});

console.log('─'.repeat(80));
console.log(`\nSummary: ${passCount} passed, ${failCount} failed out of ${tests.length} tests\n`);

if (failCount === 0) {
  console.log('🎉 All color combinations meet WCAG AA standards!\n');
} else {
  console.log('⚠️  Some color combinations need adjustment for WCAG AA compliance.\n');
  process.exit(1);
}
