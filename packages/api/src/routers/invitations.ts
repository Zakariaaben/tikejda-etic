import { groupActionProcedure, protectedProcedure, router } from "../index";
import { db } from "@repartition-tikejda/db";
import { group, groupMembership, invitation } from "@repartition-tikejda/db/schema/groups";
import { user } from "@repartition-tikejda/db/schema/auth";
import { eq, and, count } from "@repartition-tikejda/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { MAX_GROUP_SIZE } from "../constants";


export const invitationsRouter = router({
	// Envoyer une invitation
	send: groupActionProcedure
		.input(z.object({ receiverId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const senderId = ctx.session.user.id;

			if (senderId === input.receiverId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Tu ne peux pas t'inviter toi-même",
				});
			}

			// Vérifier que le receiver existe
			const receiver = await db.query.user.findFirst({
				where: eq(user.id, input.receiverId),
			});

			if (!receiver) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Utilisateur non trouvé",
				});
			}

			// Trouver le groupe du sender
			let senderMembership = await db.query.groupMembership.findFirst({
				where: eq(groupMembership.userId, senderId),
			});

			// Si le sender n'a pas de groupe, en créer un
			if (!senderMembership) {
				const newGroupId = nanoid();
				await db.insert(group).values({ id: newGroupId });
				await db.insert(groupMembership).values({
					id: nanoid(),
					userId: senderId,
					groupId: newGroupId,
				});
				senderMembership = { id: nanoid(), userId: senderId, groupId: newGroupId, joinedAt: new Date() };
			}

			// Vérifier la taille du groupe du sender
			const [senderGroupSize] = await db
				.select({ count: count() })
				.from(groupMembership)
				.where(eq(groupMembership.groupId, senderMembership.groupId));


            if (!senderGroupSize){
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erreur lors de la vérification de la taille du groupe de l'expéditeur",
                });
            }    
			if (senderGroupSize.count >= MAX_GROUP_SIZE) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Le groupe a atteint la taille maximale (${MAX_GROUP_SIZE})`,
				});
			}

			// Vérifier si une invitation pending existe déjà
			const existingInvitation = await db.query.invitation.findFirst({
				where: and(
					eq(invitation.senderId, senderId),
					eq(invitation.receiverId, input.receiverId),
					eq(invitation.status, "pending")
				),
			});

			if (existingInvitation) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Tu as déjà envoyé une invitation à cette personne",
				});
			}

			// Créer l'invitation
			const newInvitation = await db
				.insert(invitation)
				.values({
					id: nanoid(),
					senderId,
					receiverId: input.receiverId,
					senderGroupIdAtCreation: senderMembership.groupId,
				})
				.returning();

			return newInvitation[0];
		}),

	// Obtenir les invitations reçues (pending)
	getReceived: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const invitations = await db
			.select({
				id: invitation.id,
				senderId: invitation.senderId,
				senderGroupIdAtCreation: invitation.senderGroupIdAtCreation,
				status: invitation.status,
				createdAt: invitation.createdAt,
				senderName: user.name,
				senderEmail: user.email,
				senderImage: user.image,
			})
			.from(invitation)
			.innerJoin(user, eq(invitation.senderId, user.id))
			.where(
				and(
					eq(invitation.receiverId, userId),
					eq(invitation.status, "pending")
				)
			);

		// Pour chaque invitation, vérifier si elle est encore valide
		// (le sender est toujours dans le même groupe)
		const validatedInvitations = await Promise.all(
			invitations.map(async (inv) => {
				const senderMembership = await db.query.groupMembership.findFirst({
					where: eq(groupMembership.userId, inv.senderId),
				});

				const isValid =
					senderMembership &&
					senderMembership.groupId === inv.senderGroupIdAtCreation;

				// Obtenir les membres du groupe du sender pour affichage
				let groupMembers: { name: string; image: string | null }[] = [];
				if (isValid && senderMembership) {
					const members = await db
						.select({ name: user.name, image: user.image })
						.from(groupMembership)
						.innerJoin(user, eq(groupMembership.userId, user.id))
						.where(eq(groupMembership.groupId, senderMembership.groupId));
					groupMembers = members;
				}

				return {
					...inv,
					isValid,
					groupMembers,
				};
			})
		);

		return validatedInvitations;
	}),

	// Accepter une invitation
	accept: groupActionProcedure
		.input(z.object({ invitationId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			// Trouver l'invitation
			const inv = await db.query.invitation.findFirst({
				where: and(
					eq(invitation.id, input.invitationId),
					eq(invitation.receiverId, userId),
					eq(invitation.status, "pending")
				),
			});

			if (!inv) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invitation non trouvée ou déjà traitée",
				});
			}

			// Vérifier que le sender est toujours dans le même groupe
			const senderMembership = await db.query.groupMembership.findFirst({
				where: eq(groupMembership.userId, inv.senderId),
			});

			if (!senderMembership || senderMembership.groupId !== inv.senderGroupIdAtCreation) {
				// Marquer l'invitation comme invalide
				await db
					.update(invitation)
					.set({ status: "declined" })
					.where(eq(invitation.id, input.invitationId));

				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cette invitation n'est plus valide car l'expéditeur a changé de groupe",
				});
			}

			// Vérifier la taille du groupe cible
			const [targetGroupSize] = await db
				.select({ count: count() })
				.from(groupMembership)
				.where(eq(groupMembership.groupId, senderMembership.groupId));

			// Obtenir la taille du groupe du receiver pour calculer la fusion
			const receiverMembership = await db.query.groupMembership.findFirst({
				where: eq(groupMembership.userId, userId),
			});

			let receiverGroupSize = 1;
			let oldReceiverGroupId: string | null = null;

			if (receiverMembership) {
				const [size] = await db
					.select({ count: count() })
					.from(groupMembership)
					.where(eq(groupMembership.groupId, receiverMembership.groupId));
                if (!size){
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Erreur lors de la vérification de la taille du groupe du récepteur",
                    });
                }    
				receiverGroupSize = size.count;
				oldReceiverGroupId = receiverMembership.groupId;
			}
            if (!targetGroupSize){
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Erreur lors de la vérification de la taille du groupe cible",
                });
            }


			if (targetGroupSize.count + receiverGroupSize > MAX_GROUP_SIZE) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `La fusion dépasserait la taille maximale (${MAX_GROUP_SIZE})`,
				});
			}

			// Fusionner: déplacer tous les membres du groupe du receiver vers le groupe du sender
			if (receiverMembership) {
				await db
					.update(groupMembership)
					.set({ groupId: senderMembership.groupId, joinedAt: new Date() })
					.where(eq(groupMembership.groupId, receiverMembership.groupId));

				// Supprimer l'ancien groupe du receiver
				if (oldReceiverGroupId) {
					await db.delete(group).where(eq(group.id, oldReceiverGroupId));
				}
			} else {
				// Le receiver n'avait pas de groupe, créer un membership
				await db.insert(groupMembership).values({
					id: nanoid(),
					userId,
					groupId: senderMembership.groupId,
				});
			}

			// Marquer l'invitation comme acceptée
			await db
				.update(invitation)
				.set({ status: "accepted" })
				.where(eq(invitation.id, input.invitationId));

			return { success: true, groupId: senderMembership.groupId };
		}),

	// Refuser une invitation
	decline: groupActionProcedure
		.input(z.object({ invitationId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;

			const inv = await db.query.invitation.findFirst({
				where: and(
					eq(invitation.id, input.invitationId),
					eq(invitation.receiverId, userId),
					eq(invitation.status, "pending")
				),
			});

			if (!inv) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invitation non trouvée",
				});
			}

			await db
				.update(invitation)
				.set({ status: "declined" })
				.where(eq(invitation.id, input.invitationId));

			return { success: true };
		}),

	// Nombre d'invitations pending pour le badge
	getPendingCount: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const [result] = await db
			.select({ count: count() })
			.from(invitation)
			.where(
				and(
					eq(invitation.receiverId, userId),
					eq(invitation.status, "pending")
				)
			);
        if (!result){
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Erreur lors de la récupération du nombre d'invitations en attente",
            });
        }    
		return result.count;
	}),
});
