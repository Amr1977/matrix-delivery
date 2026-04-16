// This file provides type declarations for the firebase.js module
// to resolve TypeScript import issues

import { app } from "./firebase";

// Re-export from the JS module
export { app };

// Type declarations
declare module "../firebase" {
  export const app: any;
  export const db: any;
  export const analytics: any;
  export const messaging: any;
  export const environment: string;
  export const messagingError: any;
}

declare module "../firebase.js" {
  export const app: any;
  export const db: any;
  export const analytics: any;
  export const messaging: any;
  export const environment: string;
  export const messagingError: any;
}
