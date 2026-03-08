const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Helper function to create date strings
function getDateString(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Store offers for testing
When('the vendor owner creates a percentage discount offer on {string} with discount {string} and dates from {string} to {string}', async function (itemName, discount, startDateType, endDateType) {
  // Find the item by name
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  // Parse date types
  const startDate = startDateType === 'tomorrow' ? getDateString(1) :
                   startDateType === 'today' ? getDateString(0) : startDateType;
  const endDate = endDateType === 'next_week' ? getDateString(7) :
                 endDateType === 'tomorrow' ? getDateString(2) : endDateType;

  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: `Test Offer for ${itemName}`,
      description: `Percentage discount offer for ${itemName}`,
      discount_type: 'percentage',
      discount_value: parseFloat(discount),
      start_date: startDate,
      end_date: endDate
    })
  });

  this.lastResponse = response;
  if (response.ok) {
    const data = await response.json();
    this.offer = data.data;
  } else {
    this.lastError = await response.text();
  }
});

When('the vendor owner creates a fixed discount offer on {string} with discount {string} and dates from {string} to {string}', async function (itemName, discount, startDateType, endDateType) {
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  const startDate = startDateType === 'tomorrow' ? getDateString(1) :
                   startDateType === 'today' ? getDateString(0) : startDateType;
  const endDate = endDateType === 'next_week' ? getDateString(7) :
                 endDateType === 'tomorrow' ? getDateString(2) : endDateType;

  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: `Fixed Discount for ${itemName}`,
      description: `Fixed discount offer for ${itemName}`,
      discount_type: 'fixed',
      discount_value: parseFloat(discount),
      start_date: startDate,
      end_date: endDate
    })
  });

  this.lastResponse = response;
  if (response.ok) {
    const data = await response.json();
    this.offer = data.data;
  } else {
    this.lastError = await response.text();
  }
});

Then('the offer is created successfully', function () {
  expect(this.lastResponse.ok).to.be.true;
  expect(this.offer).to.exist;
  expect(this.offer.id).to.be.a('number');
});

Then('the offer has discount type {string} and value {string}', function (type, value) {
  expect(this.offer.discount_type).to.equal(type);
  expect(this.offer.discount_value).to.equal(parseFloat(value));
});

Then('the offer is active', function () {
  expect(this.offer.status).to.be.true;
});

Then('the discounted price should be {string}', function (expectedPrice) {
  const originalPrice = parseFloat(this.item?.price || this.offer?.original_price || 50.00);
  const discountValue = this.offer.discount_value;
  let calculatedPrice;

  if (this.offer.discount_type === 'percentage') {
    calculatedPrice = originalPrice * (1 - discountValue / 100);
  } else if (this.offer.discount_type === 'fixed') {
    calculatedPrice = originalPrice - discountValue;
  }

  expect(calculatedPrice.toFixed(2)).to.equal(expectedPrice);
});

When('the vendor owner attempts to create an offer with end date before start date', async function () {
  const item = this.item;
  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: 'Invalid Date Offer',
      description: 'Offer with invalid dates',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: getDateString(2), // Tomorrow
      end_date: getDateString(1)    // Yesterday (before start)
    })
  });

  this.lastResponse = response;
  if (!response.ok) {
    this.lastError = await response.json();
  }
});

When('the vendor owner attempts to create an offer with past end date', async function () {
  const item = this.item;
  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: 'Past Date Offer',
      description: 'Offer with past end date',
      discount_type: 'percentage',
      discount_value: 10,
      start_date: getDateString(1), // Tomorrow
      end_date: getDateString(-1)   // Yesterday
    })
  });

  this.lastResponse = response;
  if (!response.ok) {
    this.lastError = await response.json();
  }
});

When('the vendor owner attempts to create an offer on {string}', async function (itemName) {
  // Find the item (should be from another vendor)
  const item = this.otherItem || this.store?.items?.find(i => i.name === itemName);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: `Unauthorized Offer on ${itemName}`,
      description: 'Attempt to create offer on another vendor\'s item',
      discount_type: 'percentage',
      discount_value: 15,
      start_date: getDateString(1),
      end_date: getDateString(7)
    })
  });

  this.lastResponse = response;
  if (!response.ok) {
    this.lastError = await response.json();
  }
});

When('the vendor owner attempts to create a percentage discount offer with discount {string}', async function (discount) {
  const item = this.item;
  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: 'Over 100% Discount',
      description: 'Invalid percentage discount',
      discount_type: 'percentage',
      discount_value: parseFloat(discount),
      start_date: getDateString(1),
      end_date: getDateString(7)
    })
  });

  this.lastResponse = response;
  if (!response.ok) {
    this.lastError = await response.json();
  }
});

When('the vendor owner attempts to create a fixed discount offer with discount {string}', async function (discount) {
  const item = this.item;
  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: 'Over Price Discount',
      description: 'Fixed discount exceeding item price',
      discount_type: 'fixed',
      discount_value: parseFloat(discount),
      start_date: getDateString(1),
      end_date: getDateString(7)
    })
  });

  this.lastResponse = response;
  if (!response.ok) {
    this.lastError = await response.json();
  }
});

Given('an active offer exists on {string} from {string} to {string}', async function (itemName, startDateType, endDateType) {
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  const startDate = startDateType === 'tomorrow' ? getDateString(1) : startDateType;
  const endDate = endDateType === 'next_week' ? getDateString(7) : endDateType;

  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: `Existing Offer on ${itemName}`,
      description: 'Existing active offer for conflict testing',
      discount_type: 'percentage',
      discount_value: 15,
      start_date: startDate,
      end_date: endDate
    })
  });

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.existingOffer = data.data;
});

Given('an active offer exists on {string} with discount {string}', async function (itemName, discount) {
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: `Offer on ${itemName}`,
      description: 'Active offer for testing',
      discount_type: 'percentage',
      discount_value: parseFloat(discount),
      start_date: getDateString(1),
      end_date: getDateString(7)
    })
  });

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.existingOffer = data.data;
});

When('the vendor owner attempts to create another offer on {string} during the same period', async function (itemName) {
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: 'Conflicting Offer',
      description: 'Offer that conflicts with existing offer',
      discount_type: 'percentage',
      discount_value: 20,
      start_date: getDateString(2), // Overlapping period
      end_date: getDateString(5)
    })
  });

  this.lastResponse = response;
  if (!response.ok) {
    this.lastError = await response.json();
  }
});

Then('the offer creation fails with error {string}', function (expectedError) {
  expect(this.lastResponse.ok).to.be.false;
  expect(this.lastError.error).to.include(expectedError);
});

When('the vendor owner updates that offer discount to {string}', async function (newDiscount) {
  const response = await fetch(`${this.apiUrl}/offers/${this.existingOffer.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      discount_value: parseFloat(newDiscount)
    })
  });

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.updatedOffer = data.data;
});

Then('the offer discount is updated to {string}', function (expectedDiscount) {
  expect(this.updatedOffer.discount_value).to.equal(parseFloat(expectedDiscount));
});

When('the vendor owner deactivates that offer', async function () {
  const response = await fetch(`${this.apiUrl}/offers/${this.existingOffer.id}/deactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    }
  });

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.updatedOffer = data.data;
});

Then('the offer becomes inactive', function () {
  expect(this.updatedOffer.status).to.be.false;
});

When('the vendor owner deletes that offer', async function () {
  const response = await fetch(`${this.apiUrl}/offers/${this.existingOffer.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    }
  });

  expect(response.ok).to.be.true;
  this.deleteResponse = response;
});

Then('the offer is deleted successfully', function () {
  expect(this.deleteResponse.ok).to.be.true;
});

Given('multiple active offers exist on {string}', async function (itemName) {
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  // Create multiple offers
  const offers = [];
  for (let i = 0; i < 3; i++) {
    const response = await fetch(`${this.apiUrl}/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.vendorOwner.token}`
      },
      body: JSON.stringify({
        item_id: item.id,
        title: `Multiple Offer ${i + 1}`,
        description: `Test offer ${i + 1}`,
        discount_type: 'percentage',
        discount_value: 10 + i * 5, // 10%, 15%, 20%
        start_date: getDateString(1),
        end_date: getDateString(7)
      })
    });

    expect(response.ok).to.be.true;
    const data = await response.json();
    offers.push(data.data);
  }

  this.multipleOffers = offers;
});

When('the client retrieves offers for {string}', async function (itemName) {
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  const response = await fetch(`${this.apiUrl}/offers/items/${item.id}/offers`);
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.retrievedOffers = data.data;
});

Then('all active offers are returned', function () {
  expect(this.retrievedOffers).to.be.an('array');
  expect(this.retrievedOffers.length).to.be.greaterThan(0);
  this.retrievedOffers.forEach(offer => {
    expect(offer.status).to.be.true;
  });
});

Then('inactive offers are not included', function () {
  const inactiveOffers = this.retrievedOffers.filter(offer => !offer.status);
  expect(inactiveOffers.length).to.equal(0);
});

Given('an active percentage offer exists on {string} with discount {string}', async function (itemName, discount) {
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: `Percentage Offer ${discount}%`,
      description: 'Percentage discount offer for price calculation',
      discount_type: 'percentage',
      discount_value: parseFloat(discount),
      start_date: getDateString(1),
      end_date: getDateString(7)
    })
  });

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.priceCalculationOffer = data.data;
});

Given('another active fixed offer exists on {string} with discount {string}', async function (itemName, discount) {
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  const response = await fetch(`${this.apiUrl}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.vendorOwner.token}`
    },
    body: JSON.stringify({
      item_id: item.id,
      title: `Fixed Offer ${discount}`,
      description: 'Fixed discount offer for price calculation',
      discount_type: 'fixed',
      discount_value: parseFloat(discount),
      start_date: getDateString(1),
      end_date: getDateString(7)
    })
  });

  expect(response.ok).to.be.true;
  const data = await response.json();
  this.secondOffer = data.data;
});

When('the client calculates discounted price for {string}', async function (itemName) {
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  const response = await fetch(`${this.apiUrl}/offers/calculate-price?item_id=${item.id}`);
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.priceCalculation = data.data;
});

When('the client calculates discounted price for {string} without offers', async function (itemName) {
  const item = this.item || (this.store ? this.store.items?.find(i => i.name === itemName) : null);
  if (!item) {
    throw new Error(`Item "${itemName}" not found`);
  }

  const response = await fetch(`${this.apiUrl}/offers/calculate-price?item_id=${item.id}`);
  expect(response.ok).to.be.true;
  const data = await response.json();
  this.priceCalculation = data.data;
});
