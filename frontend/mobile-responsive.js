#!/usr/bin/env node

/**
 * Mobile Responsive Patch Script for Matrix Delivery App
 * This script applies mobile-friendly design improvements to App.js
 * 
 * Usage: node patch-mobile.js
 */

const fs = require('fs');
const path = require('path');

const APP_FILE = './src/App.js';
const BACKUP_FILE = './src/App.js.backup';

// CSS additions for mobile responsiveness
const MOBILE_CSS = `
<style>
/* Mobile Responsive Styles */
@media (max-width: 768px) {
  /* Grid layouts to single column */
  .order-form-grid {
    grid-template-columns: 1fr !important;
  }
  
  .location-grid {
    grid-template-columns: 1fr !important;
  }
  
  .address-fields-grid {
    grid-template-columns: 1fr !important;
  }
  
  /* Header responsive */
  .header-content {
    flex-direction: column !important;
    gap: 0.75rem !important;
  }
  
  .header-actions {
    width: 100% !important;
    justify-content: space-between !important;
  }
  
  /* Buttons full width on mobile */
  .mobile-full-width {
    width: 100% !important;
  }
  
  /* Modal full screen on mobile */
  .modal-content {
    margin: 0 !important;
    max-width: 100% !important;
    max-height: 100vh !important;
    border-radius: 0 !important;
  }
  
  /* Reduce padding on mobile */
  .mobile-padding {
    padding: 0.75rem !important;
  }
  
  /* Font size adjustments */
  .mobile-text {
    font-size: 0.875rem !important;
  }
  
  /* Notification panel full width */
  .notification-panel {
    width: 100vw !important;
    left: 0 !important;
    right: 0 !important;
    border-radius: 0 !important;
  }
  
  /* Order cards */
  .order-card {
    padding: 1rem !important;
  }
  
  /* Map container height */
  .map-container {
    height: 300px !important;
  }
  
  /* Bid inputs stack */
  .bid-inputs {
    grid-template-columns: 1fr !important;
  }
  
  /* Driver view tabs */
  .driver-tabs {
    flex-direction: column !important;
  }
  
  .driver-tabs button {
    border-radius: 0.375rem !important;
    width: 100% !important;
  }
}

/* Tablet responsive */
@media (min-width: 769px) and (max-width: 1024px) {
  .order-form-grid {
    grid-template-columns: 1fr 1fr !important;
  }
  
  .location-grid {
    grid-template-columns: 1fr !important;
  }
}

/* Touch-friendly buttons */
@media (hover: none) and (pointer: coarse) {
  button, .button {
    min-height: 44px !important;
    padding: 0.75rem 1rem !important;
  }
  
  input, select, textarea {
    min-height: 44px !important;
    font-size: 16px !important; /* Prevents zoom on iOS */
  }
}
</style>`;

function createBackup() {
  console.log('📦 Creating backup...');
  if (fs.existsSync(APP_FILE)) {
    fs.copyFileSync(APP_FILE, BACKUP_FILE);
    console.log('✅ Backup created: ' + BACKUP_FILE);
  } else {
    console.error('❌ App.js not found!');
    process.exit(1);
  }
}

function applyPatches() {
  console.log('🔧 Applying mobile responsive patches...');
  let content = fs.readFileSync(APP_FILE, 'utf8');
  let patchCount = 0;

  // Patch 1: Add mobile CSS to the component
  if (!content.includes('Mobile Responsive Styles')) {
    content = content.replace(
      'export default DeliveryApp;',
      `${MOBILE_CSS}\n\nexport default DeliveryApp;`
    );
    patchCount++;
    console.log('✅ Patch 1: Added mobile CSS');
  }

  // Patch 2: Add viewport meta tag helper
  const viewportHelper = `
// Add viewport meta tag if not present
useEffect(() => {
  let metaTag = document.querySelector('meta[name="viewport"]');
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.name = 'viewport';
    document.head.appendChild(metaTag);
  }
  metaTag.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
}, []);`;

  if (!content.includes('viewport meta tag')) {
    content = content.replace(
      'const [showLiveTracking, setShowLiveTracking] = useState(false);',
      `const [showLiveTracking, setShowLiveTracking] = useState(false);\n${viewportHelper}`
    );
    patchCount++;
    console.log('✅ Patch 2: Added viewport helper');
  }

  // Patch 3: Update header to be responsive
  content = content.replace(
    /style=\{\{ maxWidth: '80rem', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' \}\}/g,
    `className="header-content" style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}`
  );
  patchCount++;
  console.log('✅ Patch 3: Updated header');

  // Patch 4: Add responsive class to order form grid
  content = content.replace(
    /style=\{\{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' \}\}/g,
    `className="order-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}`
  );
  patchCount++;
  console.log('✅ Patch 4: Updated order form grid');

  // Patch 5: Add responsive class to location sections
  content = content.replace(
    /style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' \}\}/g,
    `className="location-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}`
  );
  patchCount++;
  console.log('✅ Patch 5: Updated location grid');

  // Patch 6: Add responsive class to address fields
  content = content.replace(
    /style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' \}\}/g,
    `className="address-fields-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}`
  );
  patchCount++;
  console.log('✅ Patch 6: Updated address fields');

  // Patch 7: Update notification panel
  content = content.replace(
    /style=\{\{ position: 'absolute', right: '1rem', top: '4rem', background: 'white', borderRadius: '0\.5rem', boxShadow: '0 10px 15px -3px rgba\(0, 0, 0, 0\.1\)', width: '24rem'/g,
    `className="notification-panel" style={{ position: 'absolute', right: '1rem', top: '4rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '24rem'`
  );
  patchCount++;
  console.log('✅ Patch 7: Updated notification panel');

  // Patch 8: Add responsive class to order cards
  content = content.replace(
    /style=\{\{ background: 'white', borderRadius: '0\.5rem', boxShadow: '0 1px 3px 0 rgba\(0, 0, 0, 0\.1\)', padding: '1\.5rem' \}\}/g,
    `className="order-card" style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}`
  );
  patchCount++;
  console.log('✅ Patch 8: Updated order cards');

  // Patch 9: Update modal content
  content = content.replace(
    /style=\{\{ background: 'white', borderRadius: '0\.5rem', maxWidth: '[^']+', width: '100%', maxHeight: '90vh', overflowY: 'auto' \}\}/g,
    `className="modal-content" style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}`
  );
  patchCount++;
  console.log('✅ Patch 9: Updated modals');

  // Patch 10: Update bid inputs
  content = content.replace(
    /style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0\.5rem', marginBottom: '0\.5rem' \}\}/g,
    `className="bid-inputs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}`
  );
  patchCount++;
  console.log('✅ Patch 10: Updated bid inputs');

  // Patch 11: Update driver tabs
  content = content.replace(
    /style=\{\{ display: 'flex', gap: '0\.25rem', marginBottom: '1rem' \}\}/g,
    `className="driver-tabs" style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}`
  );
  patchCount++;
  console.log('✅ Patch 11: Updated driver tabs');

  // Patch 12: Add touch-friendly spacing
  const touchFriendlyHelper = `
// Mobile touch optimization
const isMobile = () => window.innerWidth <= 768;
const [mobileView, setMobileView] = useState(isMobile());

useEffect(() => {
  const handleResize = () => setMobileView(isMobile());
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);`;

  if (!content.includes('Mobile touch optimization')) {
    content = content.replace(
      viewportHelper,
      `${viewportHelper}\n${touchFriendlyHelper}`
    );
    patchCount++;
    console.log('✅ Patch 12: Added mobile detection helper');
  }

  // Patch 13: Update main container padding
  content = content.replace(
    /style=\{\{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1rem' \}\}/g,
    `style={{ maxWidth: '80rem', margin: '0 auto', padding: mobileView ? '1rem 0.5rem' : '2rem 1rem' }}`
  );
  patchCount++;
  console.log('✅ Patch 13: Updated main container padding');

  // Patch 14: Add responsive button text helper
  const buttonTextHelper = `
const getButtonText = (fullText, shortText) => mobileView ? shortText : fullText;`;

  if (!content.includes('getButtonText')) {
    content = content.replace(
      touchFriendlyHelper,
      `${touchFriendlyHelper}\n${buttonTextHelper}`
    );
    patchCount++;
    console.log('✅ Patch 14: Added button text helper');
  }

  // Write patched content
  fs.writeFileSync(APP_FILE, content);
  console.log(`\n✨ Applied ${patchCount} patches successfully!`);
}

function printSummary() {
  console.log('\n📋 Summary of Changes:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✓ Added mobile-responsive CSS media queries');
  console.log('✓ Added viewport meta tag management');
  console.log('✓ Made header responsive with flex-wrap');
  console.log('✓ Converted grids to single column on mobile');
  console.log('✓ Made forms stack vertically on small screens');
  console.log('✓ Full-screen modals on mobile devices');
  console.log('✓ Touch-friendly button sizes (44px minimum)');
  console.log('✓ Prevented zoom on iOS form inputs');
  console.log('✓ Responsive notification panel');
  console.log('✓ Mobile-optimized order cards');
  console.log('✓ Responsive bid inputs');
  console.log('✓ Adaptive padding and spacing');
  console.log('✓ Mobile detection utilities');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📱 Mobile Breakpoints:');
  console.log('  • Mobile: ≤ 768px (single column)');
  console.log('  • Tablet: 769px - 1024px (2 columns)');
  console.log('  • Desktop: > 1024px (full layout)');
  console.log('\n💡 To restore original file:');
  console.log(`  cp ${BACKUP_FILE} ${APP_FILE}`);
}

// Main execution
try {
  console.log('🚀 Matrix Delivery Mobile Patch Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  createBackup();
  applyPatches();
  printSummary();
  
  console.log('\n✅ Patching complete!\n');
} catch (error) {
  console.error('\n❌ Error during patching:', error.message);
  console.error('\n💡 Restore backup with:');
  console.error(`  cp ${BACKUP_FILE} ${APP_FILE}`);
  process.exit(1);
}