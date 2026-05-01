"use client";

import { Users, Bus, Lock, Unlock, Shield, ChevronDown, X } from "lucide-react";
import {
	Card,
	Avatar,
	Accordion,
	Select,
	ListBox,
	Button,
} from "@heroui/react";
import { useTRPC } from "../utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, type Key } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export function AdminGroupsView() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	// Vérifier si l'utilisateur est admin
	const {
		data: isAdmin,
		isLoading: isAdminLoading,
		error: adminError,
	} = useQuery({
		...trpc.admin.isAdmin.queryOptions(),
		retry: false,
	});

	const { data: stats } = useQuery({
		...trpc.admin.getStats.queryOptions(),
		enabled: !!isAdmin,
	});

	const { data: groups, isLoading: groupsLoading } = useQuery({
		...trpc.admin.getAllGroups.queryOptions(),
		enabled: !!isAdmin,
		refetchInterval: 2000,
	});

	const { data: allowedUsers, isLoading: allowedUsersLoading } = useQuery({
		...trpc.admin.getAllowedUsers.queryOptions(),
		enabled: !!isAdmin,
	});

	const { mutationKey, mutationFn } = trpc.admin.assignBus.mutationOptions();
	const assignBusMutation = useMutation({
		mutationKey,
		mutationFn,
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: trpc.admin.getAllGroups.queryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: trpc.admin.getStats.queryKey(),
			});
			toast.success(
				data.busNumber
					? `${data.busNumber} assigné au groupe`
					: "Bus retiré du groupe"
			);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutationKey: lockMutationKey, mutationFn: lockMutationFn } =
		trpc.admin.setGroupsLocked.mutationOptions();
	const lockGroupsMutation = useMutation({
		mutationKey: lockMutationKey,
		mutationFn: lockMutationFn,
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: trpc.admin.getStats.queryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: trpc.admin.getAllGroups.queryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: trpc.groups.isLocked.queryKey(),
			});
			toast.success(
				data.isLocked ? "Les groupes sont maintenant verrouillés" : "Les groupes sont de nouveau ouverts"
			);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutationKey: bulkAddMutationKey, mutationFn: bulkAddMutationFn } =
		trpc.admin.bulkAddAllowedUsers.mutationOptions();
	const bulkAddAllowedUsersMutation = useMutation({
		mutationKey: bulkAddMutationKey,
		mutationFn: bulkAddMutationFn,
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: trpc.admin.getAllowedUsers.queryKey(),
			});
			toast.success(`${data.addedOrUpdated} utilisateur(s) ajouté(s) ou mis à jour`);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutationKey: bulkDeleteMutationKey, mutationFn: bulkDeleteMutationFn } =
		trpc.admin.bulkDeleteAllowedUsers.mutationOptions();
	const bulkDeleteAllowedUsersMutation = useMutation({
		mutationKey: bulkDeleteMutationKey,
		mutationFn: bulkDeleteMutationFn,
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: trpc.admin.getAllowedUsers.queryKey(),
			});
			toast.success(`${data.deleted} utilisateur(s) supprimé(s)`);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const { mutationKey: setAdminMutationKey, mutationFn: setAdminMutationFn } =
		trpc.admin.setAllowedUserAdmin.mutationOptions();
	const setAllowedUserAdminMutation = useMutation({
		mutationKey: setAdminMutationKey,
		mutationFn: setAdminMutationFn,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.admin.getAllowedUsers.queryKey(),
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	// Si l'utilisateur n'est pas admin
	if (adminError) {
		return (
			<Card className="w-full">
				<Card.Content className="flex flex-col items-center justify-center py-12">
					<Shield className="h-16 w-16 text-danger mb-4" />
					<h2 className="text-xl font-semibold text-foreground mb-2">
						Accès refusé
					</h2>
					<p className="text-muted text-center">
						Tu n'as pas les droits pour accéder à cette page.
					</p>
				</Card.Content>
			</Card>
		);
	}

	if (isAdminLoading || groupsLoading || allowedUsersLoading) {
		return (
			<Card className="w-full">
				<Card.Header>
					<Card.Title>Chargement...</Card.Title>
				</Card.Header>
			</Card>
		);
	}

	const busOptions = stats?.busOptions ?? [];
	const busStats = stats?.busStats ?? {};
	const nextLockState = !(stats?.isLocked ?? false);

	// Grouper les groupes par bus
	const groupsByBus: Record<string, typeof groups> = {
		"Non assigné": [],
	};
	for (const bus of busOptions) {
		groupsByBus[bus] = [];
	}

	for (const group of groups ?? []) {
		const busKey = group.busNumber ?? "Non assigné";
		if (groupsByBus[busKey]) {
			groupsByBus[busKey]?.push(group);
		}
	}

	const handleBusChange = (groupId: string, value: Key | null) => {
		if (value === "none") {
			assignBusMutation.mutate({ groupId, busNumber: null });
		} else if (value && typeof value === "string") {
			assignBusMutation.mutate({
				groupId,
				busNumber: value as "Bus 1" | "Bus 2" | "Bus 3",
			});
		}
	};

	const getBusColor = (bus: string) => {
		switch (bus) {
			case "Bus 1":
				return "from-blue-500/10 border-blue-500/30 text-blue-600";
			case "Bus 2":
				return "from-green-500/10 border-green-500/30 text-green-600";
			case "Bus 3":
				return "from-purple-500/10 border-purple-500/30 text-purple-600";
			default:
				return "from-gray-500/10 border-gray-500/30 text-gray-600";
		}
	};

	return (
		<div className="space-y-6">
			{/* Stats header */}
			<div className="flex flex-wrap items-center gap-4">
				<Card className="flex-1 min-w-[200px]">
					<Card.Content className="pt-6 pb-4">
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-accent/10">
								<Users className="h-5 w-5 text-accent" />
							</div>
							<div>
								<p className="text-2xl font-bold">{stats?.totalUsers ?? 0}</p>
								<p className="text-sm text-muted">Utilisateurs</p>
							</div>
						</div>
					</Card.Content>
				</Card>

				<Card className="flex-1 min-w-[200px]">
					<Card.Content className="pt-6 pb-4">
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-lg bg-accent/10">
								<Users className="h-5 w-5 text-accent" />
							</div>
							<div>
								<p className="text-2xl font-bold">{stats?.totalGroups ?? 0}</p>
								<p className="text-sm text-muted">Groupes</p>
							</div>
						</div>
					</Card.Content>
				</Card>

				<Card
					className={`flex-1 min-w-[200px] ${stats?.isLocked ? "border-red-500/30" : "border-yellow-500/30"}`}
				>
					<Card.Content className="pt-6 pb-4">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3">
								<div
									className={`p-2 rounded-lg ${stats?.isLocked ? "bg-red-500/10" : "bg-yellow-500/10"}`}
								>
									{stats?.isLocked ? (
										<Lock className="h-5 w-5 text-red-500" />
									) : (
										<Unlock className="h-5 w-5 text-yellow-500" />
									)}
								</div>
								<div>
									<p className="text-lg font-bold">
										{stats?.isLocked ? "Verrouillé" : "Ouvert"}
									</p>
									<p className="text-sm text-muted">État groupes</p>
								</div>
							</div>
							<Button
								size="sm"
								variant={stats?.isLocked ? "warning" : "danger"}
								onPress={() => lockGroupsMutation.mutate({ locked: nextLockState })}
								isDisabled={lockGroupsMutation.isPending}
							>
								{stats?.isLocked ? "Déverrouiller" : "Verrouiller"}
							</Button>
						</div>
					</Card.Content>
				</Card>
			</div>

			{/* Bus columns */}
			<AllowedUsersManager
				users={allowedUsers ?? []}
				onBulkAdd={(users) => bulkAddAllowedUsersMutation.mutate(users)}
				onBulkDelete={(emails) => bulkDeleteAllowedUsersMutation.mutate({ emails })}
				onSetAdmin={(email, isAdmin) => setAllowedUserAdminMutation.mutate({ email, isAdmin })}
				isPending={
					bulkAddAllowedUsersMutation.isPending ||
					bulkDeleteAllowedUsersMutation.isPending ||
					setAllowedUserAdminMutation.isPending
				}
			/>

			{/* Bus columns */}
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
				{/* Non assigné column */}
				<BusColumn
					title="Non assigné"
					groups={groupsByBus["Non assigné"] ?? []}
					stats={busStats["Non assigné"]}
					color={getBusColor("Non assigné")}
					busOptions={busOptions}
					isLocked={stats?.isLocked ?? false}
					onBusChange={handleBusChange}
					isPending={assignBusMutation.isPending}
				/>

				{/* Bus columns */}
				{busOptions.map((bus) => (
					<BusColumn
						key={bus}
						title={bus}
						groups={groupsByBus[bus] ?? []}
						stats={busStats[bus]}
						color={getBusColor(bus)}
						busOptions={busOptions}
						isLocked={stats?.isLocked ?? false}
						onBusChange={handleBusChange}
						isPending={assignBusMutation.isPending}
						currentBus={bus}
					/>
				))}
			</div>
		</div>
	);
}

interface AllowedUsersManagerProps {
	users: Array<{
		email: string;
		name: string;
		isAdmin: boolean;
		createdAt: Date;
	}>;
	onBulkAdd: (input: { users: Array<{ email: string; name: string }> }) => void;
	onBulkDelete: (emails: string[]) => void;
	onSetAdmin: (email: string, isAdmin: boolean) => void;
	isPending: boolean;
}

function AllowedUsersManager({
	users,
	onBulkAdd,
	onBulkDelete,
	onSetAdmin,
	isPending,
}: AllowedUsersManagerProps) {
	const [bulkText, setBulkText] = useState("");
	const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

	const allEmails = users.map((user) => user.email);
	const allSelected = allEmails.length > 0 && allEmails.every((email) => selectedEmails.has(email));
	const selectedCount = selectedEmails.size;

	const parseBulkUsers = () => {
		const parsedUsers = bulkText
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => {
				const [rawEmail, rawName] = line.split(",").map((part) => part?.trim());
				const email = rawEmail?.toLowerCase() ?? "";
				const name = rawName || email.split("@")[0] || email;

				return { email, name };
			});

		return Array.from(new Map(parsedUsers.map((user) => [user.email, user])).values());
	};

	const handleBulkAdd = () => {
		const parsedUsers = parseBulkUsers();

		if (parsedUsers.length === 0) {
			toast.error("Ajoute au moins un email");
			return;
		}

		onBulkAdd({ users: parsedUsers });
		setBulkText("");
	};

	const toggleUser = (email: string, checked: boolean | "indeterminate") => {
		setSelectedEmails((current) => {
			const next = new Set(current);
			if (checked === true) {
				next.add(email);
			} else {
				next.delete(email);
			}
			return next;
		});
	};

	const toggleAll = (checked: boolean | "indeterminate") => {
		setSelectedEmails(checked === true ? new Set(allEmails) : new Set());
	};

	const handleBulkDelete = () => {
		const emails = [...selectedEmails];
		if (emails.length === 0) {
			toast.error("Sélectionne au moins un utilisateur");
			return;
		}

		onBulkDelete(emails);
		setSelectedEmails(new Set());
	};

	return (
		<Card>
			<Card.Header>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
					<div>
						<Card.Title>Utilisateurs autorisés</Card.Title>
						<Card.Description>
							{users.length} personne{users.length > 1 ? "s" : ""} peuvent se connecter
						</Card.Description>
					</div>
					<Button
						variant="danger"
						size="sm"
						onPress={handleBulkDelete}
						isDisabled={selectedCount === 0 || isPending}
					>
						Supprimer la sélection ({selectedCount})
					</Button>
				</div>
			</Card.Header>
			<Card.Content className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-foreground" htmlFor="bulk-allowed-users">
						Ajout en bulk
					</label>
					<textarea
						id="bulk-allowed-users"
						className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
						placeholder={"email@esi.dz\nemail2@esi.dz, Nom complet"}
						value={bulkText}
						onChange={(event) => setBulkText(event.target.value)}
					/>
					<div className="flex items-center justify-between gap-3">
						<p className="text-xs text-muted">
							Un utilisateur par ligne. Format: email ou email, nom. Les doublons sont fusionnés.
						</p>
						<Button size="sm" variant="primary" onPress={handleBulkAdd} isDisabled={isPending}>
							Ajouter / mettre à jour
						</Button>
					</div>
				</div>

				<div className="overflow-hidden rounded-lg border border-border">
					<div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted">
						<Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Tout sélectionner" />
						<span>Utilisateur</span>
						<span>Admin</span>
						<span>Action</span>
					</div>
					<div className="max-h-96 overflow-y-auto divide-y divide-border">
						{users.length === 0 ? (
							<div className="px-3 py-8 text-center text-sm text-muted">Aucun utilisateur autorisé</div>
						) : (
							users.map((user) => (
								<div key={user.email} className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-3 py-2 items-center">
									<Checkbox
										checked={selectedEmails.has(user.email)}
										onCheckedChange={(checked) => toggleUser(user.email, checked)}
										aria-label={`Sélectionner ${user.email}`}
									/>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium text-foreground">{user.name}</p>
										<p className="truncate text-xs text-muted">{user.email}</p>
									</div>
									<Checkbox
										checked={user.isAdmin}
										onCheckedChange={(checked) => onSetAdmin(user.email, checked === true)}
										aria-label={`Admin ${user.email}`}
										disabled={isPending}
									/>
									<Button
										variant="danger"
										size="sm"
										onPress={() => onBulkDelete([user.email])}
										isDisabled={isPending}
									>
										Supprimer
									</Button>
								</div>
							))
						)}
					</div>
				</div>
			</Card.Content>
		</Card>
	);
}

interface BusColumnProps {
	title: string;
	groups: Array<{
		id: string;
		busNumber: string | null;
		memberCount: number;
		members: Array<{
			id: string;
			name: string | null;
			email: string | null;
			image: string | null;
		}>;
	}>;
	stats?: { groups: number; people: number };
	color: string;
	busOptions: readonly string[];
	isLocked: boolean;
	onBusChange: (groupId: string, value: Key | null) => void;
	isPending: boolean;
	currentBus?: string;
}

function BusColumn({
	title,
	groups,
	stats,
	color,
	busOptions,
	isLocked,
	onBusChange,
	isPending,
	currentBus,
}: BusColumnProps) {
	return (
		<Card
			className={`bg-gradient-to-b ${color} border-2 h-fit max-h-[calc(100vh-300px)] flex flex-col`}
		>
			<Card.Header className="pb-2">
				<div className="flex items-center justify-between w-full">
					<div className="flex items-center gap-2">
						<Bus className="h-5 w-5" />
						<Card.Title className="text-base">{title}</Card.Title>
					</div>
					<div className="flex items-center gap-3 text-sm">
						<span className="text-muted">
							<span className="font-semibold text-foreground">{stats?.groups ?? 0}</span> groupes
						</span>
						<span className="text-muted">
							<span className="font-semibold text-foreground">{stats?.people ?? 0}</span> pers
						</span>
					</div>
				</div>
			</Card.Header>
			<Card.Content className="flex-1 overflow-y-auto">
				{groups.length === 0 ? (
					<div className="text-center py-8 text-muted">
						<Bus className="h-8 w-8 mx-auto mb-2 opacity-50" />
						<p className="text-sm">Aucun groupe</p>
					</div>
				) : (
					<Accordion className="w-full" allowsMultipleExpanded>
						{groups.map((group) => (
							<Accordion.Item key={group.id} id={group.id}>
								<Accordion.Heading>
									<Accordion.Trigger className="hover:bg-white/50 dark:hover:bg-black/20 rounded-lg px-2">
										<div className="flex items-center gap-2 flex-1">
											<div className="flex -space-x-2">
												{group.members.slice(0, 3).map((member) => (
													<Avatar
														key={member.id}
														className="ring-2 ring-white dark:ring-gray-900"
													>
														{member.image && (
															<Avatar.Image
																src={member.image}
																alt={member.name ?? ""}
															/>
														)}
														<Avatar.Fallback className="text-[10px]">
															{member.name?.slice(0, 2).toUpperCase() ?? "??"}
														</Avatar.Fallback>
													</Avatar>
												))}
												{group.members.length > 3 && (
													<div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium ring-2 ring-white dark:ring-gray-900">
														+{group.members.length - 3}
													</div>
												)}
											</div>
											<span className="text-sm font-medium">
												{group.memberCount} membre
												{group.memberCount > 1 ? "s" : ""}
											</span>
										</div>
										<Accordion.Indicator>
											<ChevronDown className="h-4 w-4" />
										</Accordion.Indicator>
									</Accordion.Trigger>
								</Accordion.Heading>
								<Accordion.Panel>
									<Accordion.Body className="px-2 pb-2">
										{/* Members list */}
										<div className="space-y-1 mb-3">
											{group.members.map((member) => (
												<div
													key={member.id}
													className="flex items-center gap-2 p-1.5 rounded-md bg-white/50 dark:bg-black/20"
												>
													<Avatar >
														{member.image && (
															<Avatar.Image
																src={member.image}
																alt={member.name ?? ""}
															/>
														)}
														<Avatar.Fallback className="text-[10px]">
															{member.name?.slice(0, 2).toUpperCase() ?? "??"}
														</Avatar.Fallback>
													</Avatar>
													<div className="flex-1 min-w-0">
														<p className="text-xs font-medium truncate">
															{member.name}
														</p>
														<p className="text-[10px] text-muted truncate">
															{member.email}
														</p>
													</div>
												</div>
											))}
										</div>

										{/* Bus selector */}
										{isLocked ? (
											<Select
												className="w-full"
												placeholder="Assigner un bus"
												value={group.busNumber ?? undefined}
												onChange={(value) => onBusChange(group.id, value)}
												isDisabled={isPending}
											>
												<Select.Trigger className="text-xs h-8">
													<Select.Value />
													<Select.Indicator />
												</Select.Trigger>
												<Select.Popover>
													<ListBox>
														<ListBox.Item
															id="none"
															textValue="Retirer l'assignation"
														>
															<X className="h-3 w-3 mr-1 inline" />
															Retirer
															<ListBox.ItemIndicator />
														</ListBox.Item>
														{busOptions
															.filter((bus) => bus !== currentBus)
															.map((bus) => (
																<ListBox.Item key={bus} id={bus} textValue={bus}>
																	<Bus className="h-3 w-3 mr-1 inline" />
																	{bus}
																	<ListBox.ItemIndicator />
																</ListBox.Item>
															))}
													</ListBox>
												</Select.Popover>
											</Select>
										) : (
											<div className="flex items-center gap-1 text-xs text-muted bg-white/50 dark:bg-black/20 rounded-md p-2">
												<Lock className="h-3 w-3" />
												<span>Verrouiller les groupes pour assigner</span>
											</div>
										)}
									</Accordion.Body>
								</Accordion.Panel>
							</Accordion.Item>
						))}
					</Accordion>
				)}
			</Card.Content>
		</Card>
	);
}
