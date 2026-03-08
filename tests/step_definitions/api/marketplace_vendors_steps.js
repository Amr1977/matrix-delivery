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

Given('a customer user exists', function () {
  const payload = {
    userId: `customer_${Date.now()}`,
    email: `customer_${Date.now()}@example.com`,
    name: 'Customer User',
    primary_role: 'customer'
  };

  this.customer = {
    user: payload,
    token: buildJwt(payload)
  };
});

When(
  'the admin registers a marketplace vendor with business name {string} city {string} country {string}',
  async function (businessName, city, country) {
    const response = await fetch(`${this.apiUrl}/marketplace/vendors/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.admin.token}`,
        'x-test-admin': '1'
      },
      body: JSON.stringify({
        business_name: businessName,
        city,
        country
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.log('Register marketplace vendor error:', txt);
    }

    expect(response.ok).to.be.true;
    const data = await response.json();
    this.marketplaceVendor = data;
  }
);

Then('the marketplace vendor details can be retrieved', async function () {
  const response = await fetch(
    `${this.apiUrl}/marketplace/vendors/${this.marketplaceVendor.id}`
  );
  expect(response.ok).to.be.true;

  const vendor = await response.json();
  expect(vendor.id).to.equal(this.marketplaceVendor.id);
});

Then('the marketplace vendor is initially inactive', async function () {
  const response = await fetch(
    `${this.apiUrl}/marketplace/vendors?includeInactive=true`,
    {
      headers: {
        Authorization: `Bearer ${this.admin.token}`,
        'x-test-admin': '1'
      }
    }
  );
  expect(response.ok).to.be.true;
  const list = await response.json();
  const match = list.find((v) => v.id === this.marketplaceVendor.id);
  expect(!!match).to.be.true;
  expect(match.is_active).to.be.false;
});

When('the admin approves that marketplace vendor', async function () {
  const response = await fetch(
    `${this.apiUrl}/marketplace/vendors/${this.marketplaceVendor.id}/approve`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.admin.token}`,
        'x-test-admin': '1'
      }
    }
  );

  if (!response.ok) {
    const txt = await response.text();
    console.log('Approve marketplace vendor error:', txt);
  }

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.marketplaceVendor = data;
});

Then('the marketplace vendor appears in the admin vendor list', async function () {
  const response = await fetch(
    `${this.apiUrl}/marketplace/vendors?includeInactive=true`,
    {
      headers: {
        Authorization: `Bearer ${this.admin.token}`,
        'x-test-admin': '1'
      }
    }
  );

  expect(response.ok).to.be.true;
  const list = await response.json();
  const match = list.find((v) => v.id === this.marketplaceVendor.id);
  expect(!!match).to.be.true;
  expect(match.is_active).to.be.true;
});

Given(
  'an approved marketplace vendor exists with business name {string} city {string} country {string}',
  async function (businessName, city, country) {
    // Reuse existing steps: register then approve
    await this.runStep(
      `When the admin registers a marketplace vendor with business name "${businessName}" city "${city}" country "${country}"`
    );
    await this.runStep('When the admin approves that marketplace vendor');
  }
);

When('a customer lists marketplace vendors including inactive', async function () {
  if (!this.customer) {
    await this.runStep('Given a customer user exists');
  }

  const response = await fetch(
    `${this.apiUrl}/marketplace/vendors?includeInactive=true`,
    {
      headers: {
        Authorization: `Bearer ${this.customer.token}`
      }
    }
  );

  if (!response.ok) {
    const txt = await response.text();
    console.log('Customer list marketplace vendors error:', txt);
  }

  expect(response.ok).to.be.true;
  const list = await response.json();
  this.customerVendorList = list;
});

Then('the response includes that marketplace vendor', function () {
  const match = (this.customerVendorList || []).find(
    (v) => v.id === this.marketplaceVendor.id
  );
  expect(!!match).to.be.true;
  // Non-admin should not see inactive-only vendors; our vendor is active after approval.
  expect(match.is_active).to.be.true;
});

