// Define custom Clerk Session Claims
export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: "admin" | "user";
    };
  }
}
