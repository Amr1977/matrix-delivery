const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

When(
  'the vendor owner creates a marketplace item named {string} with price {string} and inventory {string}',
  async function (name, price, inventory) {
    const response = await fetch(`${this.apiUrl}/marketplace/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.vendorOwner.token}`
      },
      body: JSON.stringify({
        store_id: this.store.id,
        category_id: this.childCategory ? this.childCategory.id : 1,
        name,
        price: parseFloat(price),
        inventory_quantity: parseInt(inventory, 10)
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.log('Create marketplace item error:', txt);
    }

    expect(response.ok).to.be.true;
    const data = await response.json();
    this.item = data;
  }
);

Then('the marketplace item details can be retrieved', async function () {
  const response = await fetch(
    `${this.apiUrl}/marketplace/items/${this.item.id}`
  );
  expect(response.ok).to.be.true;

  const item = await response.json();
  expect(item.id).to.equal(this.item.id);
});

When(
  'the vendor owner updates that marketplace item inventory to {string}',
  async function (inventory) {
    const response = await fetch(
      `${this.apiUrl}/marketplace/items/${this.item.id}/inventory`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.vendorOwner.token}`
        },
        body: JSON.stringify({ inventory_quantity: parseInt(inventory, 10) })
      }
    );

    if (!response.ok) {
      const txt = await response.text();
      console.log('Update marketplace item inventory error:', txt);
    }

    expect(response.ok).to.be.true;
    const data = await response.json();
    this.item = data;
  }
);

Then(
  'the marketplace item inventory is {string}',
  function (expectedInventory) {
    expect(String(this.item.inventory_quantity)).to.equal(expectedInventory);
  }
);

When('that store has a marketplace item named {string}', async function (name) {
  const response = await fetch(`${this.apiUrl}/marketplace/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      store_id: this.store.id,
      category_id: this.childCategory ? this.childCategory.id : 1,
      name,
      price: 10,
      inventory_quantity: 5
    })
  });

  if (!response.ok) {
    const txt = await response.text();
    console.log('Create marketplace item error:', txt);
  }

  expect(response.ok).to.be.true;
});

When('the client lists marketplace items for that store', async function () {
  const response = await fetch(
    `${this.apiUrl}/marketplace/stores/${this.store.id}/items`
  );

  if (!response.ok) {
    const txt = await response.text();
    console.log('List marketplace items error:', txt);
  }

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.listedItems = data;
});

Then('the response includes marketplace item {string}', function (name) {
  const match = (this.listedItems || []).find((i) => i.name === name);
  expect(!!match).to.be.true;
});

