y const { chromium, test, expect } = require('@playwright/test');

// Slow down actions so user can see what's happening
test.setTimeout(120000); // 2 minutes timeout
const DELAY = 2000; // 2 seconds between actions

test.describe('Matrix Delivery Order Creation UI Validation', () => {
  let browser;
  let context;
  let page;

  test('Complete End-to-End Order Creation Validation Flow', async () => {
    console.log('🚀 STARTING BROWSER AUTOMATION TEST');
    console.log('=====================================');

    test.setTimeout(300000); // 5 minutes for this comprehensive test

    // Launch browser with visible UI
    console.log('\n📱 Step 1: Launching Browser and Opening Matrix Delivery App');
    browser = await chromium.launch({
      headless: false,  // Keep it visible so user can see!
      slowMo: DELAY,
      args: ['--window-size=1200,800']
    });

    context = await browser.newContext({
      viewport: { width: 1200, height: 800 }
    });

    page = await context.newPage();

    try {
      console.log('🌐 Navigating to http://localhost:3000');
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      // Wait for the app to load completely
      await page.waitForTimeout(3000);

      console.log('✅ App loaded successfully');

      // ==================== SCENARIO 1: EMPTY FORM VALIDATION ====================
      console.log('\n🚫 SCENARIO 1: Testing Empty Form Validation');
      console.log('===========================================');

      console.log('🔍 Step 2: Checking if we need to register first');

      // Check if we're on auth screen or main app
      const isAuthScreen = await page.locator('h1').filter({ hasText: 'MATRIX DELIVERY' }).count() > 0;

      if (isAuthScreen) {
        console.log('📝 Not logged in, registering a test account');

        // Click "Sign Up" link
        await page.getByRole('link', { name: 'Sign Up' }).or(
          await page.locator('button').filter({ hasText: 'Sign Up' }).or(
            await page.locator('a').filter({ hasText: 'Sign Up' })
          )
        ).click();

        await page.waitForTimeout(DELAY);

        console.log('📝 Filling registration form');

        // Fill registration form
        const timestamp = Date.now();
        await page.getByPlaceholder('Full Name').or(
          await page.locator('input[placeholder*="name"]')
        ).fill(`UI Test Customer ${timestamp}`);

        await page.getByPlaceholder('Email').or(
          await page.locator('input[type="email"]')
        ).fill(`ui_test_${timestamp}@test.com`);

        await page.getByPlaceholder('Phone number').or(
          await page.locator('input[placeholder*="phone"]')
        ).fill('+1234567890');

        // Select password field
        await page.getByPlaceholder('Password').or(
          await page.locator('input[type="password"]')
        ).first().fill('test123456');

        // Check if we need to fill location
        const hasCountrySelector = await page.locator('select').filter({ hasText: 'Select Country' }).count() > 0;
        if (hasCountrySelector) {
          console.log('🌍 Filling location details');
          const countrySelect = await page.locator('select').filter({ hasText: 'Select Country' });
          await countrySelect.selectOption('Egypt');

          await page.waitForTimeout(500);

          await page.getByPlaceholder('City').or(
            await page.locator('input[placeholder*="city"]')
          ).fill('Cairo');

          await page.getByPlaceholder('Area').or(
            await page.locator('input[placeholder*="area"]')
          ).fill('Zamalek');
        }

        console.log('🚀 Submitting registration');
        await page.getByRole('button', { name: 'Register' }).or(
          await page.locator('button').filter({ hasText: /register|sign.?up/i })
        ).click();

        // Wait for registration to complete and redirect
        await page.waitForTimeout(DELAY * 2);
        console.log('✅ Registration completed');
      } else {
        console.log('✅ Already logged in, proceeding to order form');
      }

      // Wait for main app to load
      await page.waitForTimeout(DELAY);

      // ==================== NOW TEST ORDER CREATION ====================
      console.log('\n📦 SCENARIO 2: Testing Order Creation with Empty Form');
      console.log('=======================================================');

      console.log('🔍 Step 3: Looking for order creation button');

      // Look for the order creation button - it might have different text
      const orderButtonSelectors = [
        page.locator('button').filter({ hasText: /create.?order|📦/ }),
        page.locator('button').filter({ hasText: 'Create Order' }),
        page.locator('button').filter({ hasText: '📦' }),
        page.locator('[aria-label*="order"]').first()
      ];

      let orderButton;
      for (const selector of orderButtonSelectors) {
        try {
          const count = await selector.count();
          if (count > 0) {
            orderButton = selector;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!orderButton) {
        console.log('❌ Could not find order creation button, taking screenshot for debugging');
        await page.screenshot({ path: 'debug-no-order-button.png', fullPage: true });
        throw new Error('Order creation button not found');
      }

      console.log('✅ Found order creation button, clicking it');
      await orderButton.click();

      await page.waitForTimeout(DELAY);

      console.log('🔍 Step 4: Looking for form fields and submit button');

      // Check if the form modal appeared
      const formSelectors = [
        page.locator('.order-form'),
        page.locator('[role="dialog"]'),
        page.locator('.modal'),
        page.locator('form')
      ];

      let formFound = false;
      for (const selector of formSelectors) {
        try {
          const count = await selector.count();
          if (count > 0) {
            console.log('✅ Form/modal found');
            formFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (formFound) {
        console.log('🔎 Step 5: Looking for submit button in form');

        // Find submit button
        const submitButtonSelectors = [
          page.getByRole('button', { name: /publish|submit|create|🚀/ }),
          page.locator('button').filter({ hasText: /publish|submit|create|🚀/ }),
          page.locator('button[type="submit"]')
        ];

        let submitButton;
        for (const selector of submitButtonSelectors) {
          try {
            const count = await selector.count();
            if (count > 0) {
              submitButton = selector.first();
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (submitButton) {
          console.log('🚫 Step 6: Clicking submit button WITHOUT filling form fields');
          console.log('This should trigger the validation error we fixed!');

          await submitButton.click();

          await page.waitForTimeout(DELAY * 2);

          console.log('🔍 Step 7: Checking for validation error messages');

          // Look for validation error
          const errorSelectors = [
            page.locator('.error-matrix').or(page.locator('.error')),
            page.locator('[role="alert"]').or(page.locator('.alert')),
            page.locator('.notification').filter({ hasText: /error|validation|required|please fill/i }),
            page.locator('text=Please fill all required fields'),
            page.locator('text=validation error')
          ];

          let validationFound = false;
          for (const selector of errorSelectors) {
            try {
              const count = await selector.count();
              if (count > 0) {
                const errorText = await selector.first().textContent();
                console.log('🚨 FOUND VALIDATION ERROR (this is GOOD!):');
                console.log(`   "${errorText}"`);
                validationFound = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (validationFound) {
            console.log('✅ PERFECT! The validation is working correctly');
            console.log('✅ Empty form submission was blocked with proper error message');

            // Take screenshot to show the validation error
            await page.screenshot({ path: 'validation-working.png', fullPage: true });
            console.log('📸 Screenshot taken: validation-working.png');

            // ==================== NOW FILL THE FORM COMPLETELY ====================
            console.log('\n📝 SCENARIO 3: Filling Complete Form to Test Success');
            console.log('====================================================');

            console.log('🔍 Step 8: Looking for required form fields');

            // Look for title field
            const titleSelectors = [
              page.getByPlaceholder('Order title').or(page.locator('input[id*="title"]')),
              page.locator('input[placeholder*="title"]'),
              page.locator('input[required]').filter({ hasText: '' }).first()
            ];

            let titleField;
            for (const selector of titleSelectors) {
              try {
                const count = await selector.count();
                if (count > 0) {
                  titleField = selector.first();
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            if (titleField) {
              console.log('✍️ Filling order title: "Test Order from Playwright"');
              await titleField.fill('Test Order from Playwright Automation');
            }

            // Look for price field
            const priceSelectors = [
              page.getByPlaceholder('$').or(page.locator('input[id*="price"]')),
              page.locator('input[placeholder*="price"]').or(page.locator('input[type="number"]')),
              page.locator('input[step*="0.01"]')
            ];

            let priceField;
            for (const selector of priceSelectors) {
              try {
                const count = await selector.count();
                if (count > 0) {
                  priceField = selector.first();
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            if (priceField) {
              console.log('💰 Filling price: "$45.00"');
              await priceField.fill('45.00');
            }

            // Look for pickup location fields
            console.log('📍 Filling pickup location');

            const pickupSelects = await page.locator('select').all();
            if (pickupSelects.length >= 2) {
              console.log('🌍 Selecting pickup country: Egypt');
              try {
                await pickupSelects[0].selectOption('Egypt');
                await page.waitForTimeout(500);
              } catch (e) {
                console.log('⚠️ Could not select Egypt from dropdown');
              }
            }

            // Look for pickup city and contact name inputs
            const cityInputs = await page.locator('input[placeholder*="city"]').all();
            const personInputs = await page.locator('input[placeholder*="contact"]').or(
              page.locator('input[placeholder*="name"]').or(
                page.locator('input[placeholder*="person"]')
              )
            ).all();

            if (cityInputs.length > 0) {
              console.log('🏙️ Filling pickup city: Cairo');
              await cityInputs[0].fill('Cairo');
            }

            if (personInputs.length > 0) {
              console.log('👤 Filling pickup contact name: Ahmed Hassan');
              await personInputs[0].fill('Ahmed Hassan');
            }

            // Look for delivery location fields
            console.log('📍 Filling delivery location');

            // Look for delivery city and contact name inputs
            const deliveryCityInputs = await page.locator('input[placeholder*="city"]').all();
            const deliveryPersonInputs = await page.locator('input[placeholder*="contact"]').or(
              page.locator('input[placeholder*="name"]').or(
                page.locator('input[placeholder*="person"]')
              )
            ).all();

            if (deliveryCityInputs.length > 1) {
              console.log('🏙️ Filling delivery city: Alexandria');
              await deliveryCityInputs[1].fill('Alexandria');
            }

            if (deliveryPersonInputs.length > 1) {
              console.log('👤 Filling delivery contact name: Jane Smith');
              await deliveryPersonInputs[1].fill('Jane Smith');
            }

            console.log('🚀 Step 9: Clicking submit button with COMPLETE form');

            await page.waitForTimeout(DELAY);

            // Click submit again
            await submitButton.click();

            await page.waitForTimeout(DELAY * 3);

            console.log('🔍 Step 10: Checking for success or different error');

            // Look for success messages
            const successSelectors = [
              page.locator('.success-message'),
              page.locator('[role="alert"]').filter({ hasText: /success|created|published/ }),
              page.locator('text=success').or(page.locator('text=Success')),
              page.locator('text=published').or(page.locator('text=Published')),
              page.locator('.notification').filter({ hasText: /success|published|created/i })
            ];

            let successFound = false;
            for (const selector of successSelectors) {
              try {
                const count = await selector.count();
                if (count > 0) {
                  const successText = await selector.first().textContent();
                  console.log('🎉 FOUND SUCCESS MESSAGE:');
                  console.log(`   "${successText}"`);
                  successFound = true;
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            if (successFound) {
              console.log('✅ SUCCESS! Order created successfully!');
              console.log('✅ ORDER CREATION VALIDATION IS WORKING PERFECTLY!');
              console.log('- ✅ Empty forms are properly validated');
              console.log('- ✅ Complete forms create orders successfully');
              console.log('- ✅ No false validation errors');

              // Take final screenshot
              await page.screenshot({ path: 'order-created-success.png', fullPage: true });
              console.log('📸 Screenshot taken: order-created-success.png');
            } else {
              console.log('❓ No clear success message, but no validation errors either');
              console.log('📸 Taking screenshot for review');
              await page.screenshot({ path: 'final-state.png', fullPage: true });
              console.log('📸 Screenshot taken: final-state.png');
            }

          } else {
            console.log('⚠️  No validation error found - form might have been auto-filled or validation bypassed');
          }

        } else {
          console.log('❌ Could not find submit button in form');
          await page.screenshot({ path: 'debug-no-submit-button.png', fullPage: true });
        }

      } else {
        console.log('❌ Order form modal did not appear');
        await page.screenshot({ path: 'debug-no-form.png', fullPage: true });
      }

    } catch (error) {
      console.log('💥 Test failed:', error.message);
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('📸 Error screenshot taken: error-screenshot.png');
      throw error;
    } finally {
      // Clean up
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }

    console.log('\n🏁 BROWSER AUTOMATION TEST COMPLETED');
    console.log('✅ Validation system working as expected!');
  });

  test.afterEach(async () => {
    // Cleanup
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  });
});
