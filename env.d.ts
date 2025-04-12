/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      USPS_CONSUMER_KEY: string;
      USPS_CONSUMER_SECRET: string;
    }
  }
}

export {};
