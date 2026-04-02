declare module '@root/database' {
  // Lightweight shim to avoid loading the huge generated database.d.ts in the app build.
  // Replace `any` with a narrower type if you want stricter typing later.
  export type Database = any;
}
