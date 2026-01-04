const http = require('http');
const serverManager = require('./utils/serverManager');

function request(method, url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      method,
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      headers: { 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: {} });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const backend = process.env.BACKEND_URL || 'http://localhost:5000';
  const api = `${backend}/api`;

  try {
    // Start backend server if not already running
    try {
      await request('GET', `${api}/health`);
      console.log('✅ Backend already running');
    } catch (e) {
      console.log('🚀 Starting backend server...');
      await serverManager.startBackend();
    }

    const health = await request('GET', `${api}/health`);
    if (health.status !== 200 || health.body?.status !== 'healthy') {
      console.error('❌ Health check failed', health);
      await serverManager.stop();
      process.exit(1);
    }
    console.log('✅ Health check passed');

    const geocode = await request('GET', `${api}/locations/reverse-geocode?lat=30.0444&lng=31.2357`);
    if (geocode.status !== 200 || !geocode.body?.coordinates || !geocode.body?.address) {
      console.error('❌ Reverse geocode check failed', geocode.status);
      await serverManager.stop();
      process.exit(1);
    }
    console.log('✅ Geocode check passed');

    console.log('✅ All smoke health checks passed');
    await serverManager.stop();
    process.exit(0);
  } catch (err) {
    console.error('❌ Smoke health error', err.message);
    await serverManager.stop();
    process.exit(1);
  }
}

run();

