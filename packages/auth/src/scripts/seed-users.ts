import { allowedUser as allowedUserSchema, db, eq } from "@repartition-tikejda/db";

const parseAllowedUsers = () => {
	const input = process.env.ALLOWED_USERS_BULK;

	if (!input) {
		throw new Error("Set ALLOWED_USERS_BULK with one user per line: email or email, name");
	}

	return Array.from(
		new Map(
			input
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean)
				.map((line) => {
					const [rawEmail, rawName] = line.split(",").map((part) => part?.trim());
					const email = rawEmail?.toLowerCase() ?? "";
					const name = rawName || email.split("@")[0] || email;

					return [email, { email, name, isAdmin: false }] as const;
				})
		).values()
	);
};

const createAllowedUsers = async () => {
	const allowedUsers = parseAllowedUsers();

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
