declare module "firebase" {
  export const app: any;
}

declare module "firebase/firestore" {
  export function getFirestore(app: any): any;
  export function initializeFirestore(app: any, settings?: any): any;
  export const CACHE_SIZE_UNLIMITED: number;
  export function collection(db: any, path: string): any;
  export function getDocs(query: any): Promise<any>;
  export function onSnapshot(
    query: any,
    callback: (snapshot: any) => void,
  ): () => void;
}

declare module "firebase/app" {
  export function initializeApp(config: any): any;
  export function getApp(name?: string): any;
}

declare module "firebase/analytics" {
  export function getAnalytics(app: any): any;
}

declare module "firebase/messaging" {
  export function getMessaging(app: any): any;
  export function isSupported(): Promise<boolean>;
  export function onMessage(
    messaging: any,
    callback: (payload: any) => void,
  ): () => void;
}

declare module "firebase" {
  export const app: any;
}

declare module "../firebase" {
  export const app: any;
  export const db: any;
  export const analytics: any;
  export const messaging: any;
  export const environment: string;
  export const messagingError: any;
}
