import { allowedUsers } from "@repartition-tikejda/auth/allowed-users";
export const MAX_GROUP_SIZE = 6;

// Si true, aucun changement de groupe n'est autorisé (invitations, acceptations, départs)
export const GROUPS_LOCKED = process.env.GROUPS_LOCKED === "true";

// Liste des emails des administrateurs
export const ADMIN_EMAILS: (typeof allowedUsers[number])["email"][] = [
	"ls_ouanes@esi.dz",
	"nz_benhamiche@esi.dz",
	"na_yahi@esi.dz"
	// Ajouter les emails des admins ici
];

// Les bus disponibles
export const BUS_OPTIONS = ["Bus 1", "Bus 2", "Bus 3"] as const;
export type BusOption = (typeof BUS_OPTIONS)[number];