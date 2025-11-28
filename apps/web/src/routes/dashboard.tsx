import { getUser } from "@/functions/get-user";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { MyGroup } from "@/components/my-group";
import { UsersList } from "@/components/users-list";
import { NotificationsPopover } from "@/components/notifications-popover";
import { InfoModal } from "@/components/info-modal";
import { Button } from "@heroui/react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	ssr: false,
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const navigate = useNavigate();

	return (
		<div className="container mx-auto p-4 space-y-4 sm:space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
				<div className="min-w-0">
					<h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
						<img src="/etic.png" alt="ETIC" className="h-7 w-7 sm:h-8 sm:w-8 object-contain shrink-0" />
						<span className="truncate">Sortie Tikejda</span>
					</h1>
					<p className="text-muted text-sm sm:text-base truncate">
						Salut {session?.user.name?.split(" ")[0]} ! Forme ton groupe pour le bus.
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<InfoModal />
					<NotificationsPopover />
					<Button
						variant="danger"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										navigate({ to: "/" });
									},
								},
							});
						}}
					>
						Sign Out
					</Button>
				</div>
			</div>

			{/* Main content */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Mon groupe */}
				<div className="lg:order-1">
					<MyGroup />
				</div>

				{/* Liste des utilisateurs */}
				<div className="lg:order-2">
					<UsersList />
				</div>
			</div>
		</div>
	);
}
