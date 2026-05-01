export const MAX_GROUP_SIZE = 6;

// Les bus disponibles
export const BUS_OPTIONS = ["Bus 1", "Bus 2", "Bus 3"] as const;
export type BusOption = (typeof BUS_OPTIONS)[number];
