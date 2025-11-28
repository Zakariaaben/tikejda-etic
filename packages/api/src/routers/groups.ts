import { groupActionProcedure, protectedProcedure, router } from "../index";
import { db } from "@repartition-tikejda/db";
import { group, groupMembership } from "@repartition-tikejda/db/schema/groups";
import { user } from "@repartition-tikejda/db/schema/auth";
import { eq, count } from "@repartition-tikejda/db";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { GROUPS_LOCKED, MAX_GROUP_SIZE } from "../constants";



export const groupsRouter = router({
    // Récupère le groupe de l'utilisateur courant avec ses membres
    getMyGroup: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;

        // Trouver le membership de l'utilisateur
        const membership = await db.query.groupMembership.findFirst({
            where: eq(groupMembership.userId, userId),
            with: {
                group: true,
            },
        });

        if (!membership) {
            // L'utilisateur n'a pas encore de groupe, on en crée un
            const newGroupId = nanoid();
            const newMembershipId = nanoid();

            await db.insert(group).values({ id: newGroupId });
            await db.insert(groupMembership).values({
                id: newMembershipId,
                userId,
                groupId: newGroupId,
            });

            return {
                groupId: newGroupId,
                members: [
                    {
                        id: userId,
                        name: ctx.session.user.name,
                        email: ctx.session.user.email,
                        image: ctx.session.user.image,
                    },
                ],
            };
        }

        // Récupérer tous les membres du groupe
        const members = await db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
            })
            .from(groupMembership)
            .innerJoin(user, eq(groupMembership.userId, user.id))
            .where(eq(groupMembership.groupId, membership.groupId));

        return {
            groupId: membership.groupId,
            members,
        };
    }),

    // Quitter le groupe actuel (crée un nouveau groupe solo)
    leave: groupActionProcedure.mutation(async ({ ctx }) => {
        const userId = ctx.session.user.id;

        // Trouver le membership actuel
        const membership = await db.query.groupMembership.findFirst({
            where: eq(groupMembership.userId, userId),
        });

        if (!membership) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Tu n'es dans aucun groupe",
            });
        }

        // Vérifier s'il y a d'autres membres dans le groupe
        const [memberCount] = await db
            .select({ count: count() })
            .from(groupMembership)
            .where(eq(groupMembership.groupId, membership.groupId));

        if (!memberCount) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Erreur lors de la vérification du nombre de membres dans le groupe",
            });
        }
        if (memberCount.count <= 1) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Tu es déjà seul dans ton groupe",
            });
        }

        // Créer un nouveau groupe pour l'utilisateur
        const newGroupId = nanoid();
        await db.insert(group).values({ id: newGroupId });

        // Mettre à jour le membership
        await db
            .update(groupMembership)
            .set({ groupId: newGroupId, joinedAt: new Date() })
            .where(eq(groupMembership.userId, userId));

        // Supprimer l'ancien groupe s'il est vide (le membership a été déplacé)
        const [remainingMembers] = await db
            .select({ count: count() })
            .from(groupMembership)
            .where(eq(groupMembership.groupId, membership.groupId));

        if (!remainingMembers) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Erreur lors de la vérification des membres restants dans l'ancien groupe",
            });
        }
        if (remainingMembers.count === 0) {
            await db.delete(group).where(eq(group.id, membership.groupId));
        }

        return { success: true, newGroupId };
    }),

    // Obtenir la taille maximale autorisée
    getMaxSize: protectedProcedure.query(() => {
        return MAX_GROUP_SIZE;
    }),

    // Vérifier si les groupes sont verrouillés
    isLocked: protectedProcedure.query(() => {
        return GROUPS_LOCKED;
    }),
});
