const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const page = await context.newPage();

  const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

  console.log("Testing password toggle on mobile viewport (375x667)...\n");

  try {
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState("domcontentloaded");

    const passwordInput = page.locator('[data-testid="password-input"]');
    await passwordInput.waitFor({ state: "visible" });

    const inputBox = await passwordInput.boundingBox();
    const toggleButton = page.locator(
      '[data-testid="toggle-password-visibility"]',
    );
    const buttonBox = await toggleButton.boundingBox();

    console.log("Password Input:", {
      x: inputBox.x,
      y: inputBox.y,
      width: inputBox.width,
      height: inputBox.height,
      rightEdge: inputBox.x + inputBox.width,
    });

    console.log("Toggle Button:", {
      x: buttonBox.x,
      y: buttonBox.y,
      width: buttonBox.width,
      height: buttonBox.height,
    });

    const buttonLeftEdge = buttonBox.x;
    const inputRightEdge = inputBox.x + inputBox.width;

    if (buttonLeftEdge < inputRightEdge) {
      console.log("\n✅ PASS: Button is inside input bounds");
    } else {
      console.log("\n❌ FAIL: Button overlaps outside input!");
    }

    const hasGap = buttonLeftEdge > inputBox.x;
    if (hasGap) {
      console.log("✅ PASS: Button has gap from left edge");
    } else {
      console.log("❌ FAIL: Button starts at or before left edge");
    }

    await passwordInput.fill("testpassword123");
    await toggleButton.click();
    await page.waitForTimeout(500);

    const inputType = await passwordInput.getAttribute("type");
    console.log(
      `\nPassword visibility after toggle: ${inputType === "text" ? "visible" : "hidden"}`,
    );

    console.log("\n=== Register Page Test ===\n");
    await page.goto(`${baseUrl}/register`);
    await page.waitForLoadState("domcontentloaded");

    const regPasswordInput = page.locator('[data-testid="password-input"]');
    await regPasswordInput.waitFor({ state: "visible" });

    const regInputBox = await regPasswordInput.boundingBox();
    const regToggleButton = page.locator(
      '[data-testid="toggle-password-visibility"]',
    );
    const regButtonBox = await regToggleButton.boundingBox();

    console.log("Register - Password Input:", {
      x: regInputBox.x,
      width: regInputBox.width,
      rightEdge: regInputBox.x + regInputBox.width,
    });

    console.log("Register - Toggle Button:", {
      x: regButtonBox.x,
      width: regButtonBox.width,
    });

    const regButtonLeftEdge = regButtonBox.x;
    const regInputRightEdge = regInputBox.x + regInputBox.width;

    if (regButtonLeftEdge < regInputRightEdge) {
      console.log("\n✅ PASS: Register button is inside input bounds");
    } else {
      console.log("\n❌ FAIL: Register button overlaps outside input!");
    }

    console.log("\n=== All Tests Completed ===");
  } catch (error) {
    console.error("Test error:", error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
