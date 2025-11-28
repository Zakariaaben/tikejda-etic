"use client";

import { Users, LogOut, Lock } from "lucide-react";
import { Card, Avatar, Button, Chip, Tooltip } from "@heroui/react";
import { useTRPC } from "../utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function MyGroup() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const { data: isLocked } = useQuery(trpc.groups.isLocked.queryOptions());

	const { data: myGroup, isLoading } = useQuery({
		...trpc.groups.getMyGroup.queryOptions(),
		refetchInterval: 2000,
	});

	const { mutationKey: leaveMutationKey, mutationFn: leaveMutationFn } = trpc.groups.leave.mutationOptions();
	const leaveMutation = useMutation({
		mutationKey: leaveMutationKey,
		mutationFn: leaveMutationFn,
		onMutate: async () => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: trpc.groups.getMyGroup.queryKey() });

			// Snapshot previous value
			const previousGroup = queryClient.getQueryData(trpc.groups.getMyGroup.queryKey());

			// Optimistically update: user leaves and gets a new solo group
			queryClient.setQueryData(trpc.groups.getMyGroup.queryKey(), (old: typeof myGroup) => {
				if (!old) return old;
				// After leaving, user will be alone in a new group
				const currentUser = old.members.find((m) => m.id === myGroup?.members[0]?.id);
				return {
					groupId: "temp-new-group",
					members: currentUser ? [currentUser] : [],
				};
			});

			return { previousGroup };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trpc.groups.getMyGroup.queryKey() });
			queryClient.invalidateQueries({ queryKey: trpc.users.getAll.queryKey() });
			toast.success("Tu as quitté le groupe");
		},
		onError: (error, _variables, context) => {
			// Rollback to previous state
			if (context?.previousGroup) {
				queryClient.setQueryData(trpc.groups.getMyGroup.queryKey(), context.previousGroup);
			}
			toast.error(error.message);
		},
	});

	if (isLoading) {
		return (
			<Card className="w-full">
				<Card.Header>
					<Card.Title>Mon Groupe</Card.Title>
					<Card.Description>Chargement...</Card.Description>
				</Card.Header>
			</Card>
		);
	}

	const members = myGroup?.members || [];
	const canLeave = members.length > 1;

	return (
		<Card className="w-full border-2 border-accent-soft-hover bg-linear-to-br from-accent/5 to-transparent">
			<Card.Header>
				<div className="flex items-center justify-between w-full">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-lg bg-accent/10">
							<Users className="h-5 w-5 text-accent" />
						</div>
						<div>
							<Card.Title>Mon Groupe</Card.Title>
							<Card.Description>
								{members.length} membre{members.length > 1 ? "s" : ""}
							</Card.Description>
						</div>
					</div>
					<Chip variant="soft" color="accent" className="font-semibold">
						{members.length}/6
					</Chip>
				</div>
			</Card.Header>
			<Card.Content>
				<div className="flex flex-col gap-3">
					{members.map((member) => (
						<div
							key={member.id}
							className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary/50 border border-border/50 hover:border-accent/30 transition-colors"
						>
							<Avatar size="sm" className="ring-2 ring-accent-soft-hover">
								{member.image && (
									<Avatar.Image src={member.image} alt={member.name} />
								)}
								<Avatar.Fallback className="bg-accent/10 text-accent">
									{member.name?.slice(0, 2).toUpperCase() || "??"}
								</Avatar.Fallback>
							</Avatar>
							<div className="flex-1 min-w-0">
								<p className="font-medium truncate text-foreground">{member.name}</p>
								<p className="text-sm text-muted truncate">{member.email}</p>
							</div>
						</div>
					))}
				</div>
			</Card.Content>
			{canLeave && (
				<Card.Footer>
					<Tooltip isDisabled={!isLocked}>
						<Tooltip.Trigger>
							<span className="inline-block">
								<Button
									variant="danger"
									size="sm"
									className="gap-2"
									onPress={() => leaveMutation.mutate()}
									isPending={leaveMutation.isPending}
									isDisabled={isLocked}
								>
									{isLocked ? (
										<Lock className="h-4 w-4" />
									) : (
										<LogOut className="h-4 w-4" />
									)}
									Quitter le groupe
								</Button>
							</span>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Les groupes sont verrouillés</p>
						</Tooltip.Content>
					</Tooltip>
				</Card.Footer>
			)}
		</Card>
	);
}
