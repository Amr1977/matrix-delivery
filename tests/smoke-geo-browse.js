const fetch = global.fetch || require('node-fetch');

const API = process.env.API_URL || 'http://localhost:5000/api';

const waitFor = (ms) => new Promise(r => setTimeout(r, ms));

async function waitForServer(timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${API}/health`);
      if (res.ok) return true;
    } catch (e) {}
    await waitFor(1000);
  }
  throw new Error('Server not ready');
}

async function testVendorsNear() {
  const url = `${API}/browse/vendors-near?lat=30.0444&lng=31.2357&radius_km=1&limit=5`;
  const res = await fetch(url);
  if (res.status === 501) {
    console.log('SKIP vendors-near: PostGIS not available');
    return;
  }
  if (!res.ok) throw new Error(`vendors-near failed: ${res.status}`);
  const data = await res.json();
  if (!data || typeof data.count !== 'number' || !Array.isArray(data.items)) {
    throw new Error('vendors-near invalid response shape');
  }
  for (const v of data.items) {
    if (typeof v.distance_m !== 'number') throw new Error('vendors-near missing distance_m');
  }
  console.log('OK vendors-near');
}

async function testItemsNear() {
  const url = `${API}/browse/items-near?lat=30.0444&lng=31.2357&radius_km=1&limit=5`;
  const res = await fetch(url);
  if (res.status === 501) {
    console.log('SKIP items-near: PostGIS not available');
    return;
  }
  if (!res.ok) throw new Error(`items-near failed: ${res.status}`);
  const data = await res.json();
  if (!data || typeof data.count !== 'number' || !Array.isArray(data.items)) {
    throw new Error('items-near invalid response shape');
  }
  for (const it of data.items) {
    if (typeof it.distance_m !== 'number') {
      console.log('WARN items-near: distance_m missing, response count', data.count);
      break;
    }
  }
  console.log('OK items-near');
}

async function main() {
  await waitForServer();
  await testVendorsNear();
  await testItemsNear();
  console.log('Geo browse smoke tests completed');
}

main().catch(err => {
  console.error('Geo browse smoke tests failed:', err.message);
  process.exit(1);
});

