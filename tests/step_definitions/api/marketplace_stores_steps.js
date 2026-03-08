const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const crypto = require('crypto');

const buildJwt = (payload) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const secret = process.env.JWT_SECRET || 'test-secret-key-12345';

  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const data = `${base64url(header)}.${base64url(payload)}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
};

Given('a vendor owner user exists for that vendor', function () {
  if (!this.vendor) {
    throw new Error('Vendor must exist before assigning owner user');
  }

  const payload = {
    userId: `vendor_owner_${Date.now()}`,
    email: `vendor_owner_${Date.now()}@example.com`,
    name: 'Vendor Owner',
    primary_role: 'vendor'
  };

  this.vendorOwner = {
    user: payload,
    token: buildJwt(payload)
  };
});

When(
  'the vendor owner creates a marketplace store named {string}',
  async function (storeName) {
    const response = await fetch(`${this.apiUrl}/marketplace/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.vendorOwner.token}`
      },
      body: JSON.stringify({
        vendor_id: this.vendor.id,
        name: storeName
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.log('Create marketplace store error:', txt);
    }

    expect(response.ok).to.be.true;
    const data = await response.json();
    this.store = data;
  }
);

Then('the marketplace store details can be retrieved', async function () {
  const response = await fetch(
    `${this.apiUrl}/marketplace/stores/${this.store.id}`
  );
  expect(response.ok).to.be.true;

  const store = await response.json();
  expect(store.id).to.equal(this.store.id);
});

When(
  'the vendor owner updates that marketplace store name to {string}',
  async function (newName) {
    const response = await fetch(
      `${this.apiUrl}/marketplace/stores/${this.store.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.vendorOwner.token}`
        },
        body: JSON.stringify({ name: newName })
      }
    );

    if (!response.ok) {
      const txt = await response.text();
      console.log('Update marketplace store error:', txt);
    }

    expect(response.ok).to.be.true;
    const data = await response.json();
    this.store = data;
  }
);

Then(
  'the updated marketplace store has name {string}',
  function (expectedName) {
    expect(this.store.name).to.equal(expectedName);
  }
);

Given(
  'that vendor has a marketplace store named {string}',
  async function (storeName) {
    if (!this.vendorOwner) {
      await this.runStep('Given a vendor owner user exists for that vendor');
    }

    const response = await fetch(`${this.apiUrl}/marketplace/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.vendorOwner.token}`
      },
      body: JSON.stringify({
        vendor_id: this.vendor.id,
        name: storeName
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.log('Create marketplace store error:', txt);
    }

    expect(response.ok).to.be.true;
    const data = await response.json();
    this.vendorStores = this.vendorStores || [];
    this.vendorStores.push(data);
  }
);

When('the client lists marketplace stores for that vendor', async function () {
  const response = await fetch(
    `${this.apiUrl}/marketplace/vendors/${this.vendor.id}/stores`
  );

  if (!response.ok) {
    const txt = await response.text();
    console.log('List marketplace stores error:', txt);
  }

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.listedVendorStores = data;
});

Then('the response includes marketplace store {string}', function (storeName) {
  const match = (this.listedVendorStores || []).find(
    (s) => s.name === storeName
  );
  expect(!!match).to.be.true;
});

