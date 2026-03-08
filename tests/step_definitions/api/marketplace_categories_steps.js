const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

When(
  'the admin creates a root marketplace category named {string}',
  async function (name) {
    const response = await fetch(`${this.apiUrl}/marketplace/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.admin.token}`,
        'x-test-admin': '1'
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.log('Create root marketplace category error:', txt);
    }

    expect(response.ok).to.be.true;
    const data = await response.json();
    this.rootCategory = data;
  }
);

When(
  'the admin creates a child marketplace category named {string} under that root category',
  async function (name) {
    const response = await fetch(`${this.apiUrl}/marketplace/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.admin.token}`,
        'x-test-admin': '1'
      },
      body: JSON.stringify({
        name,
        parent_id: this.rootCategory.id
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.log('Create child marketplace category error:', txt);
    }

    expect(response.ok).to.be.true;
    const data = await response.json();
    this.childCategory = data;
  }
);

Then(
  'the marketplace category list includes {string}',
  async function (name) {
    const response = await fetch(`${this.apiUrl}/marketplace/categories`);
    expect(response.ok).to.be.true;

    const list = await response.json();
    const match = list.find((c) => c.name === name);
    expect(!!match).to.be.true;
  }
);

Then(
  'the marketplace categories by parent for that root include {string}',
  async function (name) {
    const response = await fetch(
      `${this.apiUrl}/marketplace/categories/by-parent?parent_id=${this.rootCategory.id}`
    );
    expect(response.ok).to.be.true;

    const list = await response.json();
    const match = list.find((c) => c.name === name);
    expect(!!match).to.be.true;
  }
);

