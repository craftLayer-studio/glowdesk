import { getDb } from "./client";
import { resetDemo } from "./seed";

/** `pnpm db:seed` seeds an empty database; `pnpm db:seed --reset` rebuilds the demo salon. */
async function main() {
  const db = await getDb();
  if (process.argv.includes("--reset")) {
    await resetDemo(db);
    console.log("Demo salon reset.");
  } else {
    console.log("Database migrated and seeded (if it was empty).");
  }
  process.exit(0);
}

void main();
