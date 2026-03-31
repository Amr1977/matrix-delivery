const { Given, When, Then } = require("@cucumber/cucumber");
const { expect } = require("chai");

const MOBILE_VIEWPORT = { width: 375, height: 667 };

Given("I am using the application on a mobile viewport", async function () {
  await this.page.setViewportSize(MOBILE_VIEWPORT);
});

When("I visit the login page", async function () {
  await this.page.goto(`${this.baseUrl}/login`);
  await this.page.waitForLoadState("domcontentloaded");
});

When("I visit the register page", async function () {
  await this.page.goto(`${this.baseUrl}/register`);
  await this.page.waitForLoadState("domcontentloaded");
});

Then("the password input should be fully visible", async function () {
  const passwordInput = await this.page.locator(
    '[data-testid="password-input"]',
  );
  await expect(passwordInput).toBeVisible();

  const boundingBox = await passwordInput.boundingBox();
  expect(boundingBox).to.not.be.null;

  const passwordWidth = boundingBox.width;
  expect(passwordWidth).to.be.greaterThan(
    0,
    "Password input should have width",
  );
});

Then(
  "the password toggle button should not overlap the password input",
  async function () {
    const passwordInput = await this.page.locator(
      '[data-testid="password-input"]',
    );
    const toggleButton = await this.page.locator(
      '[data-testid="toggle-password-visibility"]',
    );

    const inputBox = await passwordInput.boundingBox();
    const buttonBox = await toggleButton.boundingBox();

    expect(inputBox).to.not.be.null;
    expect(buttonBox).to.not.be.null;

    const inputRightEdge = inputBox.x + inputBox.width;
    const buttonLeftEdge = buttonBox.x;

    expect(buttonLeftEdge).to.be.lessThan(
      inputRightEdge,
      "Toggle button should be inside or at the edge of input, not overlapping",
    );

    const hasGap = buttonLeftEdge > inputBox.x;
    expect(hasGap).to.be.true;
  },
);

When("I enter my password in the password field", async function () {
  const passwordInput = await this.page.locator(
    '[data-testid="password-input"]',
  );
  await passwordInput.fill("testpassword123");
});

When("I click the password toggle button", async function () {
  const toggleButton = await this.page.locator(
    '[data-testid="toggle-password-visibility"]',
  );
  await toggleButton.click();
});

Then("my password should be visible", async function () {
  const passwordInput = await this.page.locator(
    '[data-testid="password-input"]',
  );
  const inputType = await passwordInput.getAttribute("type");
  expect(inputType).to.equal("text");

  const inputValue = await passwordInput.inputValue();
  expect(inputValue).to.equal("testpassword123");
});
