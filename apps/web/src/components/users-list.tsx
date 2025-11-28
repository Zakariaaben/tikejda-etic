"use client";

import { useState } from "react";
import { UserPlus, Check, Users2, PartyPopper, Search, Lock } from "lucide-react";
import { Card, Avatar, Button, InputGroup, Tooltip } from "@heroui/react";
import { useTRPC } from "../utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function UsersList() {
	const trpc = useTRPC();

	// Track pending invitations locally for instant UI feedback
	const [pendingInvitations, setPendingInvitations] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState("");

	const { data: isLocked } = useQuery(trpc.groups.isLocked.queryOptions());

	const { data: users, isLoading: usersLoading } = useQuery({
		...trpc.users.getAll.queryOptions(),
		refetchInterval: 500,
	});

	const { data: myGroup } = useQuery({
		...trpc.groups.getMyGroup.queryOptions(),
		refetchInterval: 500,
	});

	const { mutationKey, mutationFn } = trpc.invitations.send.mutationOptions();
	const sendInvitation = useMutation({
		mutationKey,
		mutationFn,
		onMutate: async ({ receiverId }) => {
			// Optimistically add to pending invitations
			setPendingInvitations((prev) => new Set(prev).add(receiverId));
			return { receiverId };
		},
		onSuccess: () => {
			toast.success("Invitation envoyée !");
		},
		onError: (error, _variables, context) => {
			// Rollback: remove from pending invitations
			if (context?.receiverId) {
				setPendingInvitations((prev) => {
					const next = new Set(prev);
					next.delete(context.receiverId);
					return next;
				});
			}
			toast.error(error.message);
		},
	});

	if (usersLoading) {
		return (
			<Card className="w-full h-full">
				<Card.Header>
					<Card.Title>Tous les membres</Card.Title>
					<Card.Description>Chargement...</Card.Description>
				</Card.Header>
			</Card>
		);
	}

	const myGroupMemberIds = new Set(myGroup?.members.map((m) => m.id) || []);

	// Séparer les utilisateurs : ceux dans mon groupe et les autres
	const otherUsers = users?.filter((u) => !myGroupMemberIds.has(u.id)) || [];

	// Filtrer par recherche (nom ou email)
	const filteredUsers = otherUsers.filter((user) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return (
			user.name?.toLowerCase().includes(query) ||
			user.email?.toLowerCase().includes(query)
		);
	});

	return (
		<Card className="w-full h-full flex flex-col">
			<Card.Header className="space-y-3">
				<div className="flex items-center gap-2">
					<div className="p-2 rounded-lg bg-muted/10">
						<Users2 className="h-5 w-5 text-muted" />
					</div>
					<div>
						<Card.Title>Tous les membres</Card.Title>
						<Card.Description>
							{otherUsers.length} personne{otherUsers.length > 1 ? "s" : ""} hors de ton groupe
						</Card.Description>
					</div>
				</div>
				<InputGroup className="w-full">
					<InputGroup.Prefix>
						<Search className="h-4 w-4 text-muted" />
					</InputGroup.Prefix>
					<InputGroup.Input
						placeholder="Rechercher par nom ou email..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</InputGroup>
			</Card.Header>
			<Card.Content className="flex-1 min-h-0 ">
				<div className="h-[400px] overflow-y-auto pr-2">
					<div className="flex flex-col gap-2">
						{filteredUsers.map((user) => (
						<div
							key={user.id}
							className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary/50 border border-border/50"
						>
							<Avatar size="sm" className="ring-2 ring-border/50">
								{user.image && (
									<Avatar.Image src={user.image} alt={user.name} />
								)}
								<Avatar.Fallback>
									{user.name?.slice(0, 2).toUpperCase() || "??"}
								</Avatar.Fallback>
							</Avatar>
							<div className="flex-1 min-w-0">
								<p className="font-medium text-foreground truncate">{user.name}</p>
								<p className="text-sm text-muted truncate">{user.email}</p>
							</div>
							<Tooltip isDisabled={!isLocked}>
                                <Tooltip.Trigger>

								<span className="inline-block">
									<Button
										size="sm"
										variant={pendingInvitations.has(user.id) ? "ghost" : "primary"}
										className="gap-1.5"
										onPress={() => sendInvitation.mutate({ receiverId: user.id })}
										isDisabled={pendingInvitations.has(user.id) || isLocked}
									>
										{isLocked ? (
											<>
												<Lock className="h-4 w-4" />
												Verrouillé
											</>
										) : pendingInvitations.has(user.id) ? (
											<>
												<Check className="h-4 w-4 text-success" />
												Invité
											</>
										) : (
											<>
												<UserPlus className="h-4 w-4" />
												Inviter
											</>
										)}
									</Button>
								</span>
                                            </Tooltip.Trigger>
								<Tooltip.Content>
									<p className="text-foreground">Les groupes sont verrouillés</p>
								</Tooltip.Content>
							</Tooltip>
						</div>
					))}
					{filteredUsers.length === 0 && otherUsers.length > 0 && (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Search className="h-12 w-12 text-muted mb-3" />
							<p className="text-muted font-medium">
								Aucun résultat pour "{searchQuery}"
							</p>
						</div>
					)}
					{otherUsers.length === 0 && (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<PartyPopper className="h-12 w-12 text-accent mb-3" />
							<p className="text-muted font-medium">
								Tout le monde est dans ton groupe !
							</p>
						</div>
						)}
					</div>
				</div>
			</Card.Content>
		</Card>
	);
}
