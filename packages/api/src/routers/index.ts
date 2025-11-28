import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin";
import { groupsRouter } from "./groups";
import { invitationsRouter } from "./invitations";
import { usersRouter } from "./users";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	admin: adminRouter,
	groups: groupsRouter,
	invitations: invitationsRouter,
	users: usersRouter,
});
export type AppRouter = typeof appRouter;
