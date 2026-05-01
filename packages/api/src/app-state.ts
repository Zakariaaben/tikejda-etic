import { db, eq } from "@repartition-tikejda/db";
import { allowedUser } from "@repartition-tikejda/db/schema/auth";
import { appSettings } from "@repartition-tikejda/db/schema/groups";

export const APP_SETTINGS_ID = "global";

export async function getAllowedUserByEmail(email: string) {
	return db.query.allowedUser.findFirst({
		where: eq(allowedUser.email, email),
	});
}

export async function getAppSettings() {
	let settings = await db.query.appSettings.findFirst({
		where: eq(appSettings.id, APP_SETTINGS_ID),
	});

	if (!settings) {
		await db.insert(appSettings).values({
			id: APP_SETTINGS_ID,
			groupsLocked: false,
		});

		settings = await db.query.appSettings.findFirst({
			where: eq(appSettings.id, APP_SETTINGS_ID),
		});
	}

	if (!settings) {
		throw new Error("Failed to initialize app settings");
	}

	return settings;
}

export async function getGroupsLocked() {
	const settings = await getAppSettings();
	return settings.groupsLocked;
}
