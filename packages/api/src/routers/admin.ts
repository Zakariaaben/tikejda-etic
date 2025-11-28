import { adminProcedure, router } from "../index";
import { db } from "@repartition-tikejda/db";
import { group, groupMembership } from "@repartition-tikejda/db/schema/groups";
import { user } from "@repartition-tikejda/db/schema/auth";
import { eq, count, sql  } from "@repartition-tikejda/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { BUS_OPTIONS, GROUPS_LOCKED } from "../constants";

export const adminRouter = router({
	// Vérifie si l'utilisateur est admin
	isAdmin: adminProcedure.query(() => {
		return true;
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
			if (!GROUPS_LOCKED) {
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

	// Obtenir les statistiques globales avec le comptage par bus
	getStats: adminProcedure.query(async () => {
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
			isLocked: GROUPS_LOCKED,
		};
	}),
});
