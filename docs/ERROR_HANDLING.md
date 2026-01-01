# Global Error Handling System

## Overview
The Matrix Delivery application implements a robust, globally consistent error handling system to ensure a premium user experience even during application failures. This system replaces the default React Router error screen and generic white screens with a branded, Matrix-themed "System Failure" interface.

## Components

### 1. GlobalError.js (`frontend/src/components/GlobalError.js`)
This is the primary error element used by the React Router data API. 

**Features:**
- **Capture:** Uses `useRouteError()` to capture routing and rendering errors.
- **Theme:** Dark mode, digital rain background, and glowing red accents to indicate a critical system alert while maintaining immersion.
- **Actions:**
  - `REBOOT SYSTEM`: Reloads the page (`window.location.reload()`).
  - `RETURN TO SOURCE`: Navigates to the landing page (`/`).
- **Debugging:** In `development` mode (`process.env.NODE_ENV === 'development'`), it displays the full error stack trace to assist developers.

### 2. ErrorBoundary.js (`frontend/src/ErrorBoundary.js`)
A traditional React Class Component acting as a catch-all for errors in the component tree that might not be caught by the router immediately or for parts of the app not wrapped in the router error handling context.

**Features:**
- Matches the visual style of `GlobalError.js`.
- Provides `componentDidCatch` lifecycle method for logging errors to external services (e.g., Sentry, custom logger).

## Implementation Details

### Router Configuration (`frontend/src/App.js`)
The `GlobalError` component is attached to the `errorElement` prop of the main route definitions:

```javascript
const router = createBrowserRouter([
  {
    path: '/',
    element: <MatrixLanding />,
    errorElement: <GlobalError />, // Catches errors on Landing
  },
  {
    path: '/app',
    element: <MainApp />,
    errorElement: <GlobalError />, // Catches errors in Main App
  },
  // ... other routes
]);
```

### Usage
No manual invocation is required. The system automatically catches:
- Errors thrown during `loader` or `action` execution in React Router.
- Runtime errors during component rendering.
- "Unexpected Application Errors" like the reported `s.support is undefined` crash.

## Debugging
If you encounter the "SYSTEM FAILURE" screen:
1. **Dev Mode:** Expand the specific error details on the screen to see the stack trace.
2. **Prod Mode:** Check the browser console or the application logs where `logger.js` sends reports.
