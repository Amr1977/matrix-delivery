#!/usr/bin/env node

/**
 * Simple translation test script
 * Tests that translation keys exist and are properly formatted
 */

const fs = require('fs');
const path = require('path');

// Load the locales file
const localesPath = path.join(__dirname, '../frontend/src/i18n/locales.js');
const localesContent = fs.readFileSync(localesPath, 'utf8');

// Extract the translations object
let translations;
try {
  // Remove the export and just evaluate the object
  const match = localesContent.match(/const translations = ({[\s\S]*?});/);
  if (match) {
    translations = eval(`(${match[1]})`);
  } else {
    throw new Error('Could not find translations object');
  }
} catch (error) {
  console.error('❌ Error loading translations:', error.message);
  process.exit(1);
}

// Test data
const testCases = [
  { key: 'messages.reviewSubmitted', description: 'Review submitted message' },
  { key: 'orders.createOrder', description: 'Create order button' },
  { key: 'auth.signIn', description: 'Sign in button' },
  { key: 'common.appName', description: 'App name' },
  { key: 'reviews.submitReview', description: 'Submit review button' }
];

const languages = ['en', 'ar', 'es', 'fr', 'zh', 'de', 'pt', 'ru', 'ja', 'tr', 'ur', 'hi'];

console.log('🧪 Testing Translation Keys\n');

// Test each language
let totalTests = 0;
let passedTests = 0;

for (const lang of languages) {
  console.log(`🌍 Testing ${lang.toUpperCase()} translations:`);

  if (!translations[lang]) {
    console.log(`  ❌ Language ${lang} not found in translations`);
    continue;
  }

  for (const testCase of testCases) {
    totalTests++;
    const keys = testCase.key.split('.');
    let value = translations[lang];

    // Navigate through nested object
    for (const key of keys) {
      value = value && value[key];
    }

    if (value && typeof value === 'string' && value.trim().length > 0) {
      console.log(`  ✅ ${testCase.description}: "${value}"`);
      passedTests++;
    } else {
      console.log(`  ❌ ${testCase.description}: Missing or empty translation for key "${testCase.key}"`);
    }
  }

  console.log(''); // Empty line between languages
}

// Summary
console.log('📊 Test Results:');
console.log(`  Total tests: ${totalTests}`);
console.log(`  Passed: ${passedTests}`);
console.log(`  Failed: ${totalTests - passedTests}`);
console.log(`  Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 All translation tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some translation tests failed.');
  process.exit(1);
}
