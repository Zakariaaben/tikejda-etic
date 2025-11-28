import { drizzle } from "drizzle-orm/postgres-js";
import * as authSchema from "./schema/auth";
import * as groupsSchema from "./schema/groups";
export { eq, and, count, sql  } from "drizzle-orm";
export * from "./schema/auth";
export * from "./schema/groups";
export const db = drizzle(process.env.DATABASE_URL || "", {
    schema: { ...authSchema, ...groupsSchema },
});


