import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { getAllowedUserByEmail, getGroupsLocked } from "./app-state";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
			cause: "No session",
		});
	}

	const userEmail = ctx.session.user.email;
	if (!userEmail) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authenticated user has no email",
		});
	}

	const authorizedUser = await getAllowedUserByEmail(userEmail);
	if (!authorizedUser) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Accès réservé aux utilisateurs autorisés",
		});
	}

	return next({
		ctx: {
			...ctx,
			session: ctx.session,
			allowedUser: authorizedUser,
		},
	});
});

// Procedure qui vérifie que les groupes ne sont pas verrouillés
// À utiliser pour toutes les mutations qui modifient les groupes
export const groupActionProcedure = protectedProcedure.use(async ({ next }) => {
	if (await getGroupsLocked()) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Les groupes sont verrouillés. Plus aucun changement n'est autorisé.",
		});
	}
	return next();
});

// Procedure réservée aux administrateurs
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
	if (!ctx.allowedUser.isAdmin) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Accès réservé aux administrateurs",
		});
	}
	return next();
});
