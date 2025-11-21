const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const seederInstance = require('../utils/dbSeeder');

Given('a vendor user exists', async function() {
  this.seeder = seederInstance;
  await this.seeder.waitForServer();
  const email = `vendor_${Date.now()}@example.com`;
  this.vendor = await this.seeder.createUserViaDB('Vendor User', email, 'password123', '+100000001', 'vendor');
});

When('the vendor creates self vendor with name {string} city {string} country {string}', async function(name, city, country) {
  const response = await fetch(`${this.apiUrl}/vendors/self`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-admin': '1', 'x-test-user-id': this.vendor.user.id },
    body: JSON.stringify({ name, city, country })
  });
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.selfVendor = data;
});

Then('the vendor self profile shows name {string}', async function(name) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.selfVendor.id}`);
  expect(response.ok).to.be.true;
  const data = await response.json();
  expect(data.name).to.equal(name);
});

When('the vendor updates self profile city to {string}', async function(city) {
  const response = await fetch(`${this.apiUrl}/vendors/self`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-test-admin': '1', 'x-test-user-id': this.vendor.user.id },
    body: JSON.stringify({ city })
  });
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.selfVendor = data;
});

Then('the vendor self profile shows city {string}', async function(city) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.selfVendor.id}`);
  expect(response.ok).to.be.true;
  const data = await response.json();
  expect(data.city).to.equal(city);
});

When('the vendor adds self item {string} price {string}', async function(name, price) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.selfVendor.id}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-admin': '1' },
    body: JSON.stringify({ item_name: name, price: parseFloat(price) })
  });
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.selfItem = data;
});

Then('the vendor self items include {string}', async function(name) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.selfVendor.id}/items`);
  expect(response.ok).to.be.true;
  const list = await response.json();
  const match = list.find(i => i.item_name === name);
  expect(!!match).to.be.true;
});

When('the vendor updates self item price to {string}', async function(price) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.selfVendor.id}/items/${this.selfItem.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-test-admin': '1' },
    body: JSON.stringify({ price: parseFloat(price) })
  });
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.selfItem = data;
});

Then('the vendor self items include name {string} with price {string}', async function(name, price) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.selfVendor.id}/items`);
  expect(response.ok).to.be.true;
  const list = await response.json();
  const match = list.find(i => i.item_name === name);
  expect(!!match).to.be.true;
  expect(parseFloat(match.price)).to.equal(parseFloat(price));
});

When('the vendor deactivates self item', async function() {
  const response = await fetch(`${this.apiUrl}/vendors/${this.selfVendor.id}/items/${this.selfItem.id}`, {
    method: 'DELETE',
    headers: { 'x-test-admin': '1' }
  });
  expect(response.ok).to.be.true;
});

Then('the vendor self items do not include {string}', async function(name) {
  const response = await fetch(`${this.apiUrl}/vendors/${this.selfVendor.id}/items`);
  expect(response.ok).to.be.true;
  const list = await response.json();
  const match = list.find(i => i.item_name === name);
  expect(!!match).to.be.false;
});
