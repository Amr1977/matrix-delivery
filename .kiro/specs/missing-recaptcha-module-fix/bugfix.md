# Bugfix Requirements Document

## Introduction

The backend server crashes on startup due to a missing recaptcha utility module. The authController.js file contains a hard import statement `require('../utils/recaptcha')` at line 8, but the file `backend/utils/recaptcha.js` does not exist. This prevents the entire backend from starting, even though recaptcha functionality is disabled via the `RECAPTCHA_ENABLED=false` environment variable.

The issue occurs because Node.js evaluates all `require()` statements at module load time, regardless of whether the imported function is actually called. Since the code conditionally uses `verifyRecaptcha()` only when `process.env.RECAPTCHA_ENABLED === 'true'`, the import should either be conditional or the module should exist with a no-op implementation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the backend server starts THEN the system crashes with error "Cannot find module '../utils/recaptcha'" before reaching the application logic

1.2 WHEN authController.js is loaded by Node.js THEN the system fails at the require statement on line 8, preventing any authentication endpoints from being available

1.3 WHEN RECAPTCHA_ENABLED is set to 'false' in environment variables THEN the system still crashes despite recaptcha functionality being disabled

### Expected Behavior (Correct)

2.1 WHEN the backend server starts with RECAPTCHA_ENABLED='false' THEN the system SHALL start successfully without requiring the recaptcha module

2.2 WHEN authController.js is loaded THEN the system SHALL handle the recaptcha import gracefully, either through conditional import or a stub implementation

2.3 WHEN verifyRecaptcha is called with RECAPTCHA_ENABLED='false' THEN the system SHALL return true (allow the request) without performing actual recaptcha verification

### Unchanged Behavior (Regression Prevention)

3.1 WHEN RECAPTCHA_ENABLED='true' and a valid recaptcha token is provided THEN the system SHALL CONTINUE TO verify the token and allow the request

3.2 WHEN RECAPTCHA_ENABLED='true' and an invalid recaptcha token is provided THEN the system SHALL CONTINUE TO reject the request with appropriate error message

3.3 WHEN authentication endpoints (register, login, forgot password) are called THEN the system SHALL CONTINUE TO check the RECAPTCHA_ENABLED flag before attempting verification

3.4 WHEN recaptcha verification fails THEN the system SHALL CONTINUE TO log security events with IP address and category information
