import { db, eq, user as userSchema } from "@repartition-tikejda/db";
import { allowedUsers } from "../allowed-users";

const createAllowedUsers = async () => {
    for (const user of allowedUsers) {
        const existingUser = await db.query.user.findFirst({
            where: (u) => eq(u.email, user.email),
        });

        if (!existingUser) {
            await db.insert(userSchema).values({
                id: crypto.randomUUID(),
                email: user.email,
                name: user.name,
                emailVerified: true,
            })
            console.log(`User created: ${user.email}`);
        }
    }
}

createAllowedUsers().then(() => {
    console.log("Seeding completed.");
    process.exit(0);
}).catch((error) => {
    console.error("Error during seeding:", error);
    process.exit(1);
});

