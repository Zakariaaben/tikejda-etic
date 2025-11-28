import { drizzle } from "drizzle-orm/node-postgres";
import * as authSchema from "./schema/auth";
import * as groupsSchema from "./schema/groups";
export { eq, and, count, sql  } from "drizzle-orm";

export const db = drizzle(process.env.DATABASE_URL || "", {
    schema: { ...authSchema, ...groupsSchema },
});


