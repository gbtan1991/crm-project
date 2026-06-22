declare module "@/env/server.mjs" {
  export const env: {
    NODE_ENV: "development" | "test" | "production";
    DATABASE_URL: string;
    AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    AZURE_CLIENT_ID: string;
    AZURE_CLIENT_SECRET: string;
    ENCRYPTION_SECRET: string;
    NEXT_PUBLIC_URL: string;
  };
}
