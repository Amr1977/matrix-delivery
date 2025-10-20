const fs = require('fs');
const path = require('path');

// Cleanup function to prepare for tests
function cleanup() {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up backend database files
  const backendDbDir = path.join(__dirname, '../../backend/database');
  if (fs.existsSync(backendDbDir)) {
    const files = fs.readdirSync(backendDbDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(backendDbDir, file));
      console.log(`   Deleted: ${file}`);
    });
  }
  
  // Clean up reports directory
  const reportsDir = path.join(__dirname, '../../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Clean up screenshots directory
  const screenshotsDir = path.join(reportsDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  console.log('✅ Cleanup complete\n');
}

cleanup();
