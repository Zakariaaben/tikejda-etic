import { APIError, betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, eq } from "@repartition-tikejda/db";
import * as schema from "@repartition-tikejda/db/schema/auth";
import { tanstackStartCookie } from "./tanstackStartCookies";


export const auth = betterAuth<BetterAuthOptions>({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: schema,
	}),
	trustedOrigins: [process.env.CORS_ORIGIN || ""],
	emailAndPassword: {
		enabled: false,
	},
		socialProviders: {
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID as string,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
				mapProfileToUser: async (profile) => {
					if (!profile.email) {
						throw new APIError("UNAUTHORIZED", {
							message: "User email is required to access this application.",
						});
					}

					const authorizedUser = await db.query.allowedUser.findFirst({
						where: eq(schema.allowedUser.email, profile.email),
					});

					if (!authorizedUser) {
						throw new APIError("UNAUTHORIZED", {
							message: "User is not authorized to access this application.",
						});
					}

					return {
						...profile,
						name: authorizedUser.name,
					};
				}
			},


	},
	hooks: {


	},
	plugins: [tanstackStartCookie()]
});
