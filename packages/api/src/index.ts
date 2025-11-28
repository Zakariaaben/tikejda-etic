import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { ADMIN_EMAILS, GROUPS_LOCKED } from "./constants";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
			cause: "No session",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});

// Procedure qui vérifie que les groupes ne sont pas verrouillés
// À utiliser pour toutes les mutations qui modifient les groupes
export const groupActionProcedure = protectedProcedure.use(({ next }) => {
	if (GROUPS_LOCKED) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Les groupes sont verrouillés. Plus aucun changement n'est autorisé.",
		});
	}
	return next();
});

// Procedure réservée aux administrateurs
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
	const userEmail = ctx.session.user.email;
	if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Accès réservé aux administrateurs",
		});
	}
	return next();
});
