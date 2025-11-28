import { getUser } from "@/functions/get-user";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminGroupsView } from "@/components/admin-groups-view"

export const Route = createFileRoute("/admin")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function RouteComponent() {
	return (
		<div className="container mx-auto p-4 space-y-4 sm:space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
				<div className="min-w-0">
					<h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
						<img src="/etic.png" alt="ETIC" className="h-7 w-7 sm:h-8 sm:w-8 object-contain shrink-0" />
						<span className="truncate">Administration</span>
					</h1>
					<p className="text-muted text-sm sm:text-base truncate">
						Gestion des groupes et assignation des bus
					</p>
				</div>
			</div>

			{/* Main content */}
			<AdminGroupsView />
		</div>
	);
}
