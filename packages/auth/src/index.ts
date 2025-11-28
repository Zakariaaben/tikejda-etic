import { APIError, betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repartition-tikejda/db";
import * as schema from "@repartition-tikejda/db/schema/auth";
import { tanstackStartCookie } from "./tanstackStartCookies";
import { allowedUsers } from "./allowed-users";


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
			mapProfileToUser: (profile) => {
		
				if (!allowedUsers.find(user => user.email === profile.email)) {
					throw new APIError("UNAUTHORIZED", { message: "User is not authorized to access this application." });
				}
				return profile

			}
		},


	},
	hooks: {


	},
	plugins: [tanstackStartCookie()]
});
