declare module "../firebase" {
  const app: any;
  const db: any;
  const analytics: any;
  const messaging: any;
  const environment: string;
  const messagingError: any;
  export { app, db, analytics, messaging, environment, messagingError };
}

declare module "../firebase.js" {
  const app: any;
  const db: any;
  const analytics: any;
  const messaging: any;
  const environment: string;
  const messagingError: any;
  export { app, db, analytics, messaging, environment, messagingError };
}
