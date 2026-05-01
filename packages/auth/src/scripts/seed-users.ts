import { allowedUser as allowedUserSchema, db, eq } from "@repartition-tikejda/db";
import { allowedUsers } from "../allowed-users";

const createAllowedUsers = async () => {
    for (const user of allowedUsers) {
		const existingUser = await db.query.allowedUser.findFirst({
			where: eq(allowedUserSchema.email, user.email),
		});

		if (!existingUser) {
			await db.insert(allowedUserSchema).values({
				email: user.email,
				name: user.name,
				isAdmin: user.isAdmin,
			});
			console.log(`Allowed user created: ${user.email}`);
			continue;
		}

		await db
			.update(allowedUserSchema)
			.set({
				name: user.name,
				isAdmin: user.isAdmin,
			})
			.where(eq(allowedUserSchema.email, user.email));

		console.log(`Allowed user updated: ${user.email}`);
    }
}

createAllowedUsers().then(() => {
    console.log("Seeding completed.");
    process.exit(0);
}).catch((error) => {
    console.error("Error during seeding:", error);
    process.exit(1);
});
