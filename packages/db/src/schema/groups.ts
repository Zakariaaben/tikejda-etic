import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Groupe - chaque utilisateur est automatiquement dans son propre groupe au départ
export const group = pgTable("group", {
	id: text("id").primaryKey(),
	busNumber: text("bus_number"), // Numéro du bus assigné (null = pas encore assigné)
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

// Appartenance au groupe - chaque user appartient à exactement un groupe
export const groupMembership = pgTable(
	"group_membership",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" })
			.unique(), // Un user ne peut appartenir qu'à un seul groupe
		groupId: text("group_id")
			.notNull()
			.references(() => group.id, { onDelete: "cascade" }),
		joinedAt: timestamp("joined_at").defaultNow().notNull(),
	},
	(table) => [
		index("group_membership_userId_idx").on(table.userId),
		index("group_membership_groupId_idx").on(table.groupId),
	],
);

// Invitations entre utilisateurs
export const invitation = pgTable(
	"invitation",
	{
		id: text("id").primaryKey(),
		senderId: text("sender_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		receiverId: text("receiver_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		// L'ID du groupe du sender au moment de l'invitation
		// Permet de valider que le sender n'a pas changé de groupe depuis
		senderGroupIdAtCreation: text("sender_group_id_at_creation").notNull(),
		status: text("status", { enum: ["pending", "accepted", "declined"] })
			.default("pending")
			.notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("invitation_senderId_idx").on(table.senderId),
		index("invitation_receiverId_idx").on(table.receiverId),
	],
);

// Relations
export const groupRelations = relations(group, ({ many }) => ({
	members: many(groupMembership),
}));

export const groupMembershipRelations = relations(groupMembership, ({ one }) => ({
	user: one(user, {
		fields: [groupMembership.userId],
		references: [user.id],
	}),
	group: one(group, {
		fields: [groupMembership.groupId],
		references: [group.id],
	}),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	sender: one(user, {
		fields: [invitation.senderId],
		references: [user.id],
		relationName: "sentInvitations",
	}),
	receiver: one(user, {
		fields: [invitation.receiverId],
		references: [user.id],
		relationName: "receivedInvitations",
	}),
	senderGroup: one(group, {
		fields: [invitation.senderGroupIdAtCreation],
		references: [group.id],
	}),
}));
