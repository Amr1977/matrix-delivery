const http = require('http');

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
    const health = await request('GET', `${api}/health`);
    if (health.status !== 200 || health.body?.status !== 'healthy') {
      console.error('❌ Health check failed', health);
      process.exit(1);
    }

    const geocode = await request('GET', `${api}/locations/reverse-geocode?lat=30.0444&lng=31.2357`);
    if (geocode.status !== 200 || !geocode.body?.coordinates || !geocode.body?.address) {
      console.error('❌ Reverse geocode check failed', geocode.status);
      process.exit(1);
    }

    console.log('✅ Smoke health checks passed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Smoke health error', err.message);
    process.exit(1);
  }
}

run();
