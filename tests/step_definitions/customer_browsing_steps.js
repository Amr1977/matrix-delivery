const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const seederInstance = require('../utils/dbSeeder');

Given('the customer browses vendors city {string} q {string}', async function(city, q) {
  const url = new URL(`${this.apiUrl}/browse/vendors`);
  if (city) url.searchParams.set('city', city);
  if (q) url.searchParams.set('q', q);
  const response = await fetch(url.toString());
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.browseVendors = data.items;
});

Then('the browse vendors list includes {string}', function(name) {
  const match = this.browseVendors.find(v => v.name === name);
  expect(!!match).to.be.true;
});

Then('the browse vendors list does not include {string}', function(name) {
  const match = this.browseVendors.find(v => v.name === name);
  expect(!!match).to.be.false;
});

Given('the customer browses items category {string} min_price {string} max_price {string}', async function(category, min, max) {
  const url = new URL(`${this.apiUrl}/browse/items`);
  if (category) url.searchParams.set('category', category);
  url.searchParams.set('min_price', min);
  url.searchParams.set('max_price', max);
  const response = await fetch(url.toString());
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.browseItems = data.items;
});

Then('the browse items list includes {string}', function(itemName) {
  const match = this.browseItems.find(i => i.item_name === itemName);
  expect(!!match).to.be.true;
});

Then('the browse items list does not include {string}', function(itemName) {
  const match = this.browseItems.find(i => i.item_name === itemName);
  expect(!!match).to.be.false;
});

Given('the customer browses items vendor_id that vendor sort {string} page {string} limit {string}', async function(sort, page, limit) {
  const url = new URL(`${this.apiUrl}/browse/items`);
  url.searchParams.set('vendor_id', this.vendor.id);
  url.searchParams.set('sort', sort);
  url.searchParams.set('page', page);
  url.searchParams.set('limit', limit);
  const response = await fetch(url.toString());
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.browseItems = data.items;
});

Then('the browse items page contains {string}', function(itemName) {
  const match = this.browseItems.find(i => i.item_name === itemName);
  expect(!!match).to.be.true;
});
Given('vendors {string} and {string} in city {string}', async function(name1, name2, city) {
  this.seeder = seederInstance;
  await this.seeder.waitForServer();
  const response = await fetch(`${this.apiUrl}/test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendors: [
      { name: name1, city, country: 'Egypt' },
      { name: name2, city, country: 'Egypt' }
    ]})
  });
  expect(response.ok).to.be.true;
});

Given('vendor {string} in city {string} with items {string} and {string}', async function(vendorName, city, item1, item2) {
  const parseItem = (s) => {
    const parts = s.split(':');
    return { item_name: parts[0], price: parseFloat(parts[1]), category: parts[2] || null };
  };
  const response = await fetch(`${this.apiUrl}/test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendors: [
      { name: vendorName, city, country: 'Egypt', items: [parseItem(item1), parseItem(item2)] }
    ]})
  });
  expect(response.ok).to.be.true;
});

Given('vendor {string} in city {string} with items {string} and {string} and {string}', async function(vendorName, city, i1, i2, i3) {
  const parseItem = (s) => {
    const parts = s.split(':');
    return { item_name: parts[0], price: parseFloat(parts[1]), category: parts[2] || null };
  };
  const response = await fetch(`${this.apiUrl}/test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendors: [
      { name: vendorName, city, country: 'Egypt', items: [parseItem(i1), parseItem(i2), parseItem(i3)] }
    ]})
  });
  expect(response.ok).to.be.true;
  this.vendor = { id: null, name: vendorName };
  const vlist = await (await fetch(`${this.apiUrl}/browse/vendors?city=${encodeURIComponent(city)}&q=${encodeURIComponent(vendorName)}`)).json();
  const found = (vlist.items || []).find(v => v.name === vendorName);
  if (found) this.vendor.id = found.id;
});
