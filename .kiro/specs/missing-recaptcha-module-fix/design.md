# Missing Recaptcha Module Fix - Bugfix Design

## Overview

The backend server crashes on startup due to a hard import of a non-existent recaptcha utility module in authController.js. Node.js evaluates all require() statements at module load time, causing the crash even when recaptcha functionality is disabled via RECAPTCHA_ENABLED='false'. The fix will use conditional imports or create a stub implementation to allow the server to start successfully when recaptcha is disabled, while preserving full recaptcha verification functionality when enabled.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the backend server starts and authController.js is loaded by Node.js
- **Property (P)**: The desired behavior - server starts successfully regardless of RECAPTCHA_ENABLED setting
- **Preservation**: Existing recaptcha verification behavior when RECAPTCHA_ENABLED='true' must remain unchanged
- **verifyRecaptcha**: The function in authController.js that conditionally verifies recaptcha tokens based on RECAPTCHA_ENABLED flag
- **Module Load Time**: The phase when Node.js evaluates all require() statements before executing any application logic

## Bug Details

### Fault Condition

The bug manifests when the backend server starts and Node.js attempts to load authController.js. The require() statement on line 8 fails because the file backend/utils/recaptcha.js does not exist, preventing the entire backend from starting.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ServerStartupEvent
  OUTPUT: boolean
  
  RETURN input.moduleBeingLoaded == 'authController.js'
         AND input.requireStatement == "require('../utils/recaptcha')"
         AND NOT fileExists('backend/utils/recaptcha.js')
         AND serverStartupPhase == 'MODULE_LOAD'
END FUNCTION
```

### Examples

- **Startup with RECAPTCHA_ENABLED='false'**: Server crashes with "Cannot find module '../utils/recaptcha'" before reaching application logic (Expected: Server starts successfully)
- **Startup with RECAPTCHA_ENABLED='true'**: Server crashes with "Cannot find module '../utils/recaptcha'" before reaching application logic (Expected: Server starts and loads recaptcha verification)
- **Registration endpoint call**: Endpoint is unavailable because authController.js failed to load (Expected: Endpoint available, recaptcha check conditional)
- **Login endpoint call**: Endpoint is unavailable because authController.js failed to load (Expected: Endpoint available, recaptcha check conditional)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When RECAPTCHA_ENABLED='true' and a valid recaptcha token is provided, the system must continue to verify the token and allow the request
- When RECAPTCHA_ENABLED='true' and an invalid recaptcha token is provided, the system must continue to reject the request with "CAPTCHA verification failed" error
- Authentication endpoints (register, login, forgotPassword) must continue to check the RECAPTCHA_ENABLED flag before attempting verification
- When recaptcha verification fails, the system must continue to log security events with IP address and category information

**Scope:**
All inputs that involve RECAPTCHA_ENABLED='true' should be completely unaffected by this fix. This includes:
- Recaptcha token verification logic
- Error responses for failed verification
- Security logging for verification failures
- Conditional checks using process.env.RECAPTCHA_ENABLED

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing Module File**: The file backend/utils/recaptcha.js was never created or was accidentally deleted
   - The authController.js expects this module to export a verifyRecaptcha function
   - Node.js fails at module load time before any conditional logic can execute

2. **Unconditional Import**: The require() statement is evaluated at module load time, not runtime
   - Even though verifyRecaptcha is only called when RECAPTCHA_ENABLED='true', the import happens before any code executes
   - Node.js module system requires all dependencies to exist at load time

3. **No Fallback Implementation**: There is no stub or no-op implementation for when recaptcha is disabled
   - The code assumes the module will always exist
   - No graceful degradation when the feature is disabled

## Correctness Properties

Property 1: Fault Condition - Server Starts Successfully

_For any_ server startup event where authController.js is loaded and RECAPTCHA_ENABLED is set to 'false', the fixed code SHALL allow the server to start successfully without requiring the recaptcha module to exist, and SHALL provide a no-op implementation that returns true for all verification attempts.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Recaptcha Verification When Enabled

_For any_ authentication request (register, login, forgotPassword) where RECAPTCHA_ENABLED is set to 'true', the fixed code SHALL produce exactly the same verification behavior as the original code would have produced if the module existed, preserving token verification, error responses, and security logging.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `backend/utils/recaptcha.js`

**Action**: Create the missing module file

**Specific Changes**:
1. **Create Module File**: Create backend/utils/recaptcha.js with verifyRecaptcha function
   - Export a verifyRecaptcha function that checks RECAPTCHA_ENABLED environment variable
   - When RECAPTCHA_ENABLED='false', return true immediately (no-op)
   - When RECAPTCHA_ENABLED='true', perform actual Google reCAPTCHA verification via API

2. **Implement Verification Logic**: Add Google reCAPTCHA API integration
   - Use axios to POST to https://www.google.com/recaptcha/api/siteverify
   - Include secret key from environment variable RECAPTCHA_SECRET_KEY
   - Include the recaptcha token from the request
   - Parse and return the success field from the response

3. **Add Error Handling**: Handle network failures and invalid responses gracefully
   - Catch axios errors and log them
   - Return false on verification failures
   - Validate that the response contains expected fields

4. **Add Logging**: Log verification attempts and results
   - Use the existing logger from backend/config/logger
   - Log security events for failed verifications
   - Include IP address and category information

5. **Environment Variable Validation**: Ensure RECAPTCHA_SECRET_KEY is present when enabled
   - Check for RECAPTCHA_SECRET_KEY when RECAPTCHA_ENABLED='true'
   - Log warning if secret key is missing
   - Fail verification if secret key is not configured

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Attempt to start the backend server with the current code (missing recaptcha module). Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Server Startup with RECAPTCHA_ENABLED='false'**: Start server and observe crash (will fail on unfixed code)
2. **Server Startup with RECAPTCHA_ENABLED='true'**: Start server and observe crash (will fail on unfixed code)
3. **Module Load Test**: Attempt to require authController.js directly and observe error (will fail on unfixed code)
4. **Registration Endpoint Test**: Attempt to call /api/auth/register and observe endpoint unavailable (will fail on unfixed code)

**Expected Counterexamples**:
- Server crashes with "Cannot find module '../utils/recaptcha'" error
- Possible causes: missing file, incorrect path, unconditional require statement

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := startServer_fixed(input)
  ASSERT serverStartsSuccessfully(result)
  ASSERT authControllerLoaded(result)
  ASSERT endpointsAvailable(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT verifyRecaptcha_original(input) = verifyRecaptcha_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all recaptcha verification scenarios

**Test Plan**: Observe behavior on UNFIXED code first for recaptcha verification (if we can get the server to start with a temporary stub), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Valid Token Verification**: Observe that valid tokens are accepted when RECAPTCHA_ENABLED='true', then write test to verify this continues after fix
2. **Invalid Token Rejection**: Observe that invalid tokens are rejected when RECAPTCHA_ENABLED='true', then write test to verify this continues after fix
3. **Security Logging**: Observe that failed verifications are logged with IP and category, then write test to verify this continues after fix
4. **Conditional Check Preservation**: Observe that RECAPTCHA_ENABLED flag is checked before verification, then write test to verify this continues after fix

### Unit Tests

- Test server startup with RECAPTCHA_ENABLED='false' (should start successfully)
- Test server startup with RECAPTCHA_ENABLED='true' (should start successfully)
- Test verifyRecaptcha returns true when RECAPTCHA_ENABLED='false'
- Test verifyRecaptcha calls Google API when RECAPTCHA_ENABLED='true'
- Test verifyRecaptcha handles network errors gracefully
- Test verifyRecaptcha validates response format
- Test missing RECAPTCHA_SECRET_KEY when enabled

### Property-Based Tests

- Generate random recaptcha tokens and verify that when RECAPTCHA_ENABLED='false', all return true
- Generate random server startup configurations and verify server always starts successfully
- Generate random authentication requests and verify conditional verification logic works correctly
- Test that all authentication endpoints (register, login, forgotPassword) handle recaptcha consistently

### Integration Tests

- Test full registration flow with recaptcha disabled
- Test full registration flow with recaptcha enabled and valid token
- Test full registration flow with recaptcha enabled and invalid token
- Test full login flow with recaptcha verification
- Test full forgot password flow with recaptcha verification
- Test that security logging occurs for failed verifications
