// Firebase module declarations for TypeScript

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

declare module "./api/client" {
  export class ApiClient {
    constructor();
  }
}

declare module "./api/types" {
  export interface ApiError {
    message: string;
    code?: number;
  }
}
