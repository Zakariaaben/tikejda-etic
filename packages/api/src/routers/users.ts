import { protectedProcedure, router } from "../index";
import { db } from "@repartition-tikejda/db";
import { groupMembership } from "@repartition-tikejda/db/schema/groups";
import { user } from "@repartition-tikejda/db/schema/auth";
import { eq } from "@repartition-tikejda/db";

export const usersRouter = router({
	// Obtenir tous les utilisateurs avec leur groupId
	getAll: protectedProcedure.query(async ({ ctx }) => {
		const users = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				groupId: groupMembership.groupId,
			})
			.from(user)
			.leftJoin(groupMembership, eq(user.id, groupMembership.userId));

		return users;
	}),
});
