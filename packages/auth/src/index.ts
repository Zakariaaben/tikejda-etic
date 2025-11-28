import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repartition-tikejda/db";
import * as schema from "@repartition-tikejda/db/schema/auth";

export const auth = betterAuth<BetterAuthOptions>({
	database: drizzleAdapter(db, {
		provider: "pg",

		schema: schema,
	}),
	trustedOrigins: [process.env.CORS_ORIGIN || ""],
	emailAndPassword: {
		enabled: true,
	},
  plugins: [tanstackStartCookies()]
});
