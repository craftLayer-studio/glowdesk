import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

/** Drizzle database. node-postgres is used through the same query-builder surface. */
export type DB = PgliteDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Conn = DB | Tx;

const MIGRATIONS = path.join(process.cwd(), "src/server/db/migrations");

/** Fresh in-memory database with migrations applied. For tests. */
export async function createMemoryDb(): Promise<DB> {
  const client = new PGlite();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return db;
}

async function createAppDb(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const db = drizzle(new Pool({ connectionString: url }), { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as DB;
  }
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data/pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return db;
}

const g = globalThis as unknown as { __glowdeskDb?: Promise<DB> };

/** Shared app database: migrated, and auto-seeded with the demo salon when empty. */
export function getDb(): Promise<DB> {
  if (!g.__glowdeskDb) {
    g.__glowdeskDb = (async () => {
      const db = await createAppDb();
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
      return db;
    })();
    g.__glowdeskDb.catch(() => {
      g.__glowdeskDb = undefined;
    });
  }
  return g.__glowdeskDb;
}
