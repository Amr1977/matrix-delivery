# Matrix Delivery: E2E Testing Model Guide

This guide documents the "Model Test" pattern used in the Matrix Delivery project. The `order_lifecycle.feature` serves as the gold standard for how to implement, debug, and maintain stable End-to-End (E2E) tests.

## 1. Architectural Pattern: The Adapter

We use an **Adapter Pattern** to decouple the BDD step definitions from the underlying automation tool (Playwright).

- **Feature File**: Describes business value in Gherkin (Given/When/Then).
- **Step Definitions**: Lightweight wrappers that call methods on an `Adapter`.
- **Adapter**: A class (e.g., `E2eAdapter`) that encapsulates all UI interactions, page navigation, and element selection.

### Benefit

If the UI changes (e.g., a button moves or a class is renamed), you only update the Adapter, not the dozens of step definitions.

---

## 2. Robust Locator Strategy

Always prioritize locators that are resistant to visual styling changes.

### Hierarchy of Locators

1. **`data-testid`**: The preferred method. Add `data-testid="login-submit-btn"` to your React components.
2. **Accessible Names**: `page.getByRole('button', { name: 'Login' })`.
3. **Component Classes**: Use stable component-level classes (e.g., `.order-card`) only when `data-testid` is not feasible for collections.

> [!IMPORTANT]
> Avoid deep CSS selectors like `div > div > span:nth-child(2)`. These are brittle and will break common refactors.

---

## 3. Handling Asynchronous APIs (Geolocation)

Native browser APIs like `navigator.geolocation` can be flaky or hang indefinitely in CI environments.

### The "Fake Location" Pattern

Instead of relying on the browser's native geolocation prompt, we use a mocked location injection:

1. **Frontend Support**: The application checks for `localStorage.getItem('fakeDriverLocation')`.
2. **E2E Injection**:
   ```javascript
   await this.page.evaluate(() => {
     localStorage.setItem(
       "fakeDriverLocation",
       JSON.stringify({ lat: 30.0444, lng: 31.2357 }),
     );
   });
   await this.page.reload(); // Ensure App.js picks up the mock
   ```

This ensures the test is deterministic and never hangs waiting for a GPS signal.

---

## 4. Multi-User Session Management

The order lifecycle involves multiple actors (Alice the Customer, Bob the Driver).

### Context Switching

Use the `ensureLoggedIn(name)` pattern to switch users seamlessly within a single scenario:

```javascript
async ensureLoggedIn(name) {
    if (this.currentUser !== name) {
        await this.logout();
        await this._login(role, name);
    }
}
```

This method handles cookie clearing and localStorage resets to prevent session leakage between "Alice" and "Bob".

---

## 5. Stability & Debugging Tips

### Automated Screenshots

The framework is configured to take screenshots on failure. These are saved in `reports/screenshots/`. Always check these first when a test fails.

### Database Snapshots

For long flows (like the order lifecycle), use snapshots to jump-start debugging:

```javascript
await createSnapshot("milestone_1_order_created");
```

You can then restore the DB to this exact state to debug a failure in "Phase 2" without re-running "Phase 1".

### Handling Micro-frontend/React Delays

- Use `page.waitForTimeout(1000)` sparingly after major state changes.
- Prefer `locator.waitFor({ state: 'visible' })` for more efficient waiting.
- Use `page.waitForResponse(...)` to ensure backend operations complete before checking the UI.

---

## 6. Example: The Standard Flow

Refer to [order_lifecycle.feature](file:///d:/matrix-delivery/tests/features/core/order_lifecycle.feature) and [order_lifecycle.e2e.js](file:///d:/matrix-delivery/tests/steps/core/e2e/order_lifecycle.e2e.js) for the complete implementation of these patterns.
