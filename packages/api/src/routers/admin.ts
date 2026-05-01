import { adminProcedure, router } from "../index";
import { db } from "@repartition-tikejda/db";
import { appSettings, group, groupMembership } from "@repartition-tikejda/db/schema/groups";
import { allowedUser, user } from "@repartition-tikejda/db/schema/auth";
import { eq, count, inArray, sql  } from "@repartition-tikejda/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { BUS_OPTIONS } from "../constants";
import { APP_SETTINGS_ID, getAppSettings, getGroupsLocked } from "../app-state";

export const adminRouter = router({
	// Vérifie si l'utilisateur est admin
	isAdmin: adminProcedure.query(() => {
		return true;
	}),

	getAllowedUsers: adminProcedure.query(async () => {
		const users = await db
			.select({
				email: allowedUser.email,
				name: allowedUser.name,
				isAdmin: allowedUser.isAdmin,
				createdAt: allowedUser.createdAt,
			})
			.from(allowedUser);

		return users.sort((a, b) => a.email.localeCompare(b.email));
	}),

	bulkAddAllowedUsers: adminProcedure
		.input(
			z.object({
				users: z.array(
					z.object({
						email: z.string().email(),
						name: z.string().min(1),
					})
				).min(1),
			})
		)
		.mutation(async ({ input }) => {
			const dedupedUsers = Array.from(
				new Map(
					input.users.map((user) => [
						user.email.trim().toLowerCase(),
						{
							email: user.email.trim().toLowerCase(),
							name: user.name.trim(),
						},
					])
				).values()
			);

			await db
				.insert(allowedUser)
				.values(dedupedUsers)
				.onConflictDoUpdate({
					target: allowedUser.email,
					set: {
						name: sql`excluded.name`,
					},
				});

			return { addedOrUpdated: dedupedUsers.length };
		}),

	bulkDeleteAllowedUsers: adminProcedure
		.input(
			z.object({
				emails: z.array(z.string().email()).min(1),
			})
		)
		.mutation(async ({ input }) => {
			const emails = [...new Set(input.emails.map((email) => email.trim().toLowerCase()))];

			await db.delete(allowedUser).where(inArray(allowedUser.email, emails));

			return { deleted: emails.length };
		}),

	setAllowedUserAdmin: adminProcedure
		.input(
			z.object({
				email: z.string().email(),
				isAdmin: z.boolean(),
			})
		)
		.mutation(async ({ input }) => {
			await db
				.update(allowedUser)
				.set({ isAdmin: input.isAdmin })
				.where(eq(allowedUser.email, input.email.trim().toLowerCase()));

			return { success: true, email: input.email, isAdmin: input.isAdmin };
		}),

	// Récupère tous les groupes avec leurs membres (groupes non vides uniquement)
	getAllGroups: adminProcedure.query(async () => {
		// Récupérer tous les groupes avec au moins un membre
		const groupsWithMembers = await db
			.select({
				groupId: group.id,
				busNumber: group.busNumber,
				createdAt: group.createdAt,
				memberCount: count(groupMembership.id),
			})
			.from(group)
			.innerJoin(groupMembership, eq(group.id, groupMembership.groupId))
			.groupBy(group.id, group.busNumber, group.createdAt)
			.having(sql`count(${groupMembership.id}) > 0`);

		// Pour chaque groupe, récupérer les membres
		const groupsData = await Promise.all(
			groupsWithMembers.map(async (g) => {
				const members = await db
					.select({
						id: user.id,
						name: user.name,
						email: user.email,
						image: user.image,
					})
					.from(groupMembership)
					.innerJoin(user, eq(groupMembership.userId, user.id))
					.where(eq(groupMembership.groupId, g.groupId));

				return {
					id: g.groupId,
					busNumber: g.busNumber,
					createdAt: g.createdAt,
					memberCount: g.memberCount,
					members,
				};
			})
		);

		// Trier par nombre de membres décroissant
		return groupsData.sort((a, b) => b.memberCount - a.memberCount);
	}),

	// Assigner un bus à un groupe (seulement si les groupes sont verrouillés)
	assignBus: adminProcedure
		.input(
			z.object({
				groupId: z.string(),
				busNumber: z.enum(BUS_OPTIONS).nullable(),
			})
		)
		.mutation(async ({ input }) => {
			if (!(await getGroupsLocked())) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Tu ne peux assigner des bus que lorsque les groupes sont verrouillés",
				});
			}

			const { groupId, busNumber } = input;

			// Vérifier que le groupe existe
			const existingGroup = await db.query.group.findFirst({
				where: eq(group.id, groupId),
			});

			if (!existingGroup) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Groupe non trouvé",
				});
			}

			// Mettre à jour le numéro de bus
			await db.update(group).set({ busNumber }).where(eq(group.id, groupId));

			return { success: true, groupId, busNumber };
		}),

	setGroupsLocked: adminProcedure
		.input(
			z.object({
				locked: z.boolean(),
			})
		)
		.mutation(async ({ input }) => {
			await getAppSettings();

			await db
				.update(appSettings)
				.set({ groupsLocked: input.locked })
				.where(eq(appSettings.id, APP_SETTINGS_ID));

			return {
				success: true,
				isLocked: input.locked,
			};
		}),

	// Obtenir les statistiques globales avec le comptage par bus
	getStats: adminProcedure.query(async () => {
		const isLocked = await getGroupsLocked();
		const [totalUsers] = await db.select({ count: count() }).from(user);

		// Compter les groupes avec au moins un membre
		const groupsWithMembersQuery = await db
			.select({
				groupId: group.id,
				busNumber: group.busNumber,
				memberCount: count(groupMembership.id),
			})
			.from(group)
			.innerJoin(groupMembership, eq(group.id, groupMembership.groupId))
			.groupBy(group.id, group.busNumber)
			.having(sql`count(${groupMembership.id}) > 0`);

		const totalGroups = groupsWithMembersQuery.length;

		// Compter les personnes par bus
		const busStats: Record<string, { groups: number; people: number }> = {};

		for (const bus of BUS_OPTIONS) {
			busStats[bus] = { groups: 0, people: 0 };
		}
		busStats["Non assigné"] = { groups: 0, people: 0 };

		for (const g of groupsWithMembersQuery) {
			const busKey = g.busNumber ?? "Non assigné";
			if (busStats[busKey]) {
				busStats[busKey].groups += 1;
				busStats[busKey].people += Number(g.memberCount);
			}
		}

		return {
			totalUsers: totalUsers?.count ?? 0,
			totalGroups,
			busStats,
			busOptions: BUS_OPTIONS,
			isLocked,
		};
	}),
});
