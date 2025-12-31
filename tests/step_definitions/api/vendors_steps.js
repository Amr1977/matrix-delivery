const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const crypto = require('crypto');

Given('an admin user exists', async function () {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId: `admin_${Date.now()}`,
    email: `admin_${Date.now()}@example.com`,
    name: 'Admin User',
    primary_role: 'admin'
  };
  const secret = process.env.JWT_SECRET || 'test-secret-key-12345';
  const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = `${base64url(header)}.${base64url(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  this.admin = { user: payload, token: `${data}.${signature}` };
});

When('the admin creates a vendor with name {string} city {string} country {string}', async function (name, city, country) {
  const response = await fetch(`${this.apiUrl}/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.admin.token}`, 'x-test-admin': '1' },
    body: JSON.stringify({ name, city, country })
  });
  if (!response.ok) {
    const txt = await response.text();
    console.log('Create vendor error:', txt);
  }
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.vendor = data;
});

Then('the vendor list includes {string}', async function (name) {
  const response = await fetch(`${this.apiUrl}/vendors`);
  expect(response.ok).to.be.true;
  const list = await response.json();
  const match = list.find(v => v.name === name);
  expect(!!match).to.be.true;
});

Given('a vendor exists with name {string} city {string} country {string}', async function (name, city, country) {
  const response = await fetch(`${this.apiUrl}/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.admin.token}`, 'x-test-admin': '1' },
    body: JSON.stringify({ name, city, country })
  });
  if (!response.ok) {
    const txt = await response.text();
    console.log('Create vendor error:', txt);
  }
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.vendor = data;
});

When('the admin adds item {string} price {string} to that vendor', async function (itemName, price) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.vendor.id}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.admin.token}`, 'x-test-admin': '1' },
    body: JSON.stringify({ item_name: itemName, price: parseFloat(price) })
  });
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.item = data;
});

Then('the vendor items include {string}', async function (itemName) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.vendor.id}/items`);
  expect(response.ok).to.be.true;
  const list = await response.json();
  const match = list.find(i => i.item_name === itemName);
  expect(!!match).to.be.true;
});

When('the admin renames that vendor to {string}', async function (newName) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.vendor.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.admin.token}`, 'x-test-admin': '1' },
    body: JSON.stringify({ name: newName })
  });
  if (!response.ok) {
    const txt = await response.text();
    console.log('Update vendor error:', txt);
  }
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.vendor = data;
});

Then('the vendor details show name {string}', async function (expectedName) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.vendor.id}`);
  expect(response.ok).to.be.true;
  const vendor = await response.json();
  expect(vendor.name).to.equal(expectedName);
});

When('the admin deactivates that vendor', async function () {
  const response = await fetch(`${this.apiUrl}/vendors/${this.vendor.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${this.admin.token}`, 'x-test-admin': '1' }
  });
  if (!response.ok) {
    const txt = await response.text();
    console.log('Deactivate vendor error:', txt);
  }
  expect(response.ok).to.be.true;
});

Then('the vendor is no longer in the active list', async function () {
  const response = await fetch(`${this.apiUrl}/vendors`);
  expect(response.ok).to.be.true;
  const list = await response.json();
  const match = list.find(v => v.id === this.vendor.id);
  expect(!!match).to.be.false;
});

When('the admin updates that item price to {string}', async function (price) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.vendor.id}/items/${this.item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.admin.token}`, 'x-test-admin': '1' },
    body: JSON.stringify({ price: parseFloat(price) })
  });
  if (!response.ok) {
    const txt = await response.text();
    console.log('Update item error:', txt);
  }
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.item = data;
});

Then('the vendor items include name {string} with price {string}', async function (itemName, price) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.vendor.id}/items`);
  expect(response.ok).to.be.true;
  const list = await response.json();
  const match = list.find(i => i.item_name === itemName);
  expect(!!match).to.be.true;
  expect(parseFloat(match.price)).to.equal(parseFloat(price));
});

When('the admin deactivates that item', async function () {
  const response = await fetch(`${this.apiUrl}/vendors/${this.vendor.id}/items/${this.item.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${this.admin.token}`, 'x-test-admin': '1' }
  });
  if (!response.ok) {
    const txt = await response.text();
    console.log('Deactivate item error:', txt);
  }
  expect(response.ok).to.be.true;
});

Then('the vendor items do not include {string}', async function (itemName) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.vendor.id}/items`);
  expect(response.ok).to.be.true;
  const list = await response.json();
  const match = list.find(i => i.item_name === itemName);
  expect(!!match).to.be.false;
});



