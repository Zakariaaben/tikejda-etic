"use client";

import { Bell, Check, X, Users, Inbox, Lock } from "lucide-react";
import { Button, Popover, Avatar, Chip } from "@heroui/react";
import { useTRPC } from "../utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function NotificationsPopover() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const { data: isLocked } = useQuery(trpc.groups.isLocked.queryOptions());

	const { data: pendingCount } = useQuery({
		...trpc.invitations.getPendingCount.queryOptions(),
		refetchInterval: 500,
	});

	const { data: invitations, isLoading } = useQuery({
		...trpc.invitations.getReceived.queryOptions(),
		refetchInterval: 500,
	});

	const { mutationKey: acceptMutationKey, mutationFn: acceptMutationFn } = trpc.invitations.accept.mutationOptions();
	const acceptInvitation = useMutation({
		mutationKey: acceptMutationKey,
		mutationFn: acceptMutationFn,
		onMutate: async ({ invitationId }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: trpc.invitations.getReceived.queryKey() });
			await queryClient.cancelQueries({ queryKey: trpc.invitations.getPendingCount.queryKey() });

			// Snapshot previous values
			const previousInvitations = queryClient.getQueryData(trpc.invitations.getReceived.queryKey());
			const previousCount = queryClient.getQueryData(trpc.invitations.getPendingCount.queryKey());

			// Optimistically remove the invitation from list
			queryClient.setQueryData(trpc.invitations.getReceived.queryKey(), (old: typeof invitations) => 
				old?.filter((inv) => inv.id !== invitationId)
			);

			// Optimistically decrement counter
			queryClient.setQueryData(trpc.invitations.getPendingCount.queryKey(), (old: number | undefined) => 
				old && old > 0 ? old - 1 : 0
			);

			return { previousInvitations, previousCount };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.invitations.getReceived.queryKey() });
			queryClient.invalidateQueries({ queryKey: trpc.invitations.getPendingCount.queryKey() });
			queryClient.invalidateQueries({ queryKey: trpc.groups.getMyGroup.queryKey() });
			queryClient.invalidateQueries({ queryKey: trpc.users.getAll.queryKey() });
			toast.success("Tu as rejoint le groupe !");
		},
		onError: (error, _variables, context) => {
			// Rollback
			if (context?.previousInvitations) {
				queryClient.setQueryData(trpc.invitations.getReceived.queryKey(), context.previousInvitations);
			}
			if (context?.previousCount !== undefined) {
				queryClient.setQueryData(trpc.invitations.getPendingCount.queryKey(), context.previousCount);
			}
			toast.error(error.message);
		},
	});

	const { mutationKey: declineMutationKey, mutationFn: declineMutationFn } = trpc.invitations.decline.mutationOptions();
	const declineInvitation = useMutation({
		mutationKey: declineMutationKey,
		mutationFn: declineMutationFn,
		onMutate: async ({ invitationId }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: trpc.invitations.getReceived.queryKey() });
			await queryClient.cancelQueries({ queryKey: trpc.invitations.getPendingCount.queryKey() });

			// Snapshot previous values
			const previousInvitations = queryClient.getQueryData(trpc.invitations.getReceived.queryKey());
			const previousCount = queryClient.getQueryData(trpc.invitations.getPendingCount.queryKey());

			// Optimistically remove the invitation from list
			queryClient.setQueryData(trpc.invitations.getReceived.queryKey(), (old: typeof invitations) => 
				old?.filter((inv) => inv.id !== invitationId)
			);

			// Optimistically decrement counter
			queryClient.setQueryData(trpc.invitations.getPendingCount.queryKey(), (old: number | undefined) => 
				old && old > 0 ? old - 1 : 0
			);

			return { previousInvitations, previousCount };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.invitations.getReceived.queryKey() });
			queryClient.invalidateQueries({ queryKey: trpc.invitations.getPendingCount.queryKey() });
			toast.success("Invitation refusée");
		},
		onError: (error, _variables, context) => {
			// Rollback
			if (context?.previousInvitations) {
				queryClient.setQueryData(trpc.invitations.getReceived.queryKey(), context.previousInvitations);
			}
			if (context?.previousCount !== undefined) {
				queryClient.setQueryData(trpc.invitations.getPendingCount.queryKey(), context.previousCount);
			}
			toast.error(error.message);
		},
	});

	const validInvitations = invitations?.filter((inv) => inv.isValid) || [];

	return (
		<Popover>
			<Popover.Trigger>
				<Button variant="secondary" className="relative gap-2">
					<Bell className="h-4 w-4" />
					Notifications
					{pendingCount != null && pendingCount > 0 && (
						<span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-medium text-white">
							{pendingCount}
						</span>
					)}
				</Button>
			</Popover.Trigger>
			<Popover.Content className="w-96 max-h-112 overflow-y-auto" placement="bottom end">
				<Popover.Dialog>
					<div className="flex items-center gap-2 mb-4">
						<div className="p-2 rounded-lg bg-accent/10">
							<Bell className="h-4 w-4 text-accent" />
						</div>
						<Popover.Heading className="text-base font-semibold">Invitations reçues</Popover.Heading>
					</div>
					<div className="space-y-3">
						{isLoading && (
							<div className="flex items-center justify-center py-8">
								<div className="animate-pulse text-muted text-sm">Chargement...</div>
							</div>
						)}
						{!isLoading && validInvitations.length === 0 && (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<div className="p-3 rounded-full bg-muted/10 mb-3">
									<Inbox className="h-8 w-8 text-muted" />
								</div>
								<p className="text-muted text-sm font-medium">
									Aucune invitation en attente
								</p>
								<p className="text-muted/70 text-xs mt-1">
									Les invitations apparaîtront ici
								</p>
							</div>
						)}
						{validInvitations.map((inv) => (
							<div
								key={inv.id}
								className="rounded-xl border border-border/50 bg-surface-secondary/30 p-4 space-y-3 hover:border-accent/30 transition-colors"
							>
								<div className="flex items-center gap-3">
									<Avatar size="md" className="ring-2 ring-accent-soft-hover">
										{inv.senderImage && (
											<Avatar.Image src={inv.senderImage} alt={inv.senderName} />
										)}
										<Avatar.Fallback className="bg-accent/10 text-accent font-medium">
											{inv.senderName?.slice(0, 2).toUpperCase() || "??"}
										</Avatar.Fallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="font-semibold truncate text-foreground">{inv.senderName}</p>
										<p className="text-xs text-muted">t'invite à rejoindre son groupe</p>
									</div>
								</div>
								{inv.groupMembers.length > 0 && (
									<div className="flex items-center gap-2 p-2 rounded-lg bg-surface-secondary/50">
										<Users className="h-3.5 w-3.5 text-muted shrink-0" />
										<div className="flex flex-wrap gap-1">
											{inv.groupMembers.slice(0, 3).map((member, idx) => (
												<Chip key={idx} size="sm" variant="soft" color="accent">
													{member.name}
												</Chip>
											))}
											{inv.groupMembers.length > 3 && (
												<Chip size="sm" variant="soft">
													+{inv.groupMembers.length - 3}
												</Chip>
											)}
										</div>
									</div>
								)}
								<div className="flex gap-2 pt-1">
									{isLocked ? (
										<div className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-muted/10 text-muted text-sm">
											<Lock className="h-4 w-4" />
											Groupes verrouillés
										</div>
									) : (
										<>
											<Button
												size="sm"
												variant="primary"
												className="flex-1 gap-1.5"
												onPress={() => acceptInvitation.mutate({ invitationId: inv.id })}
												isPending={acceptInvitation.isPending}
											>
												<Check className="h-4 w-4" />
												Accepter
											</Button>
											<Button
												size="sm"
												variant="secondary"
												className="flex-1 gap-1.5"
												onPress={() => declineInvitation.mutate({ invitationId: inv.id })}
												isPending={declineInvitation.isPending}
											>
												<X className="h-4 w-4" />
												Refuser
											</Button>
										</>
									)}
								</div>
							</div>
						))}
					</div>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	);
}
