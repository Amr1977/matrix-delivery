declare global {
  module "../firebase" {
    export const app: any;
    export const db: any;
    export const analytics: any;
    export const messaging: any;
    export const environment: string;
    export const messagingError: any;
  }

  module "../firebase.js" {
    export const app: any;
    export const db: any;
    export const analytics: any;
    export const messaging: any;
    export const environment: string;
    export const messagingError: any;
  }
}

export {};
