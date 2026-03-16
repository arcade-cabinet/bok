// ─── Rune Data ───
// Pure data: rune definitions, face constants, colors, Elder Futhark glyphs.
// No ECS, no Three.js — just lookup tables and pure functions.

/** Face indices for the 6 sides of a voxel block. */
export const Face = {
	PosX: 0,
	NegX: 1,
	PosY: 2,
	NegY: 3,
	PosZ: 4,
	NegZ: 5,
} as const;

export type FaceIndex = (typeof Face)[keyof typeof Face];

/** Total number of faces per block. */
export const FACE_COUNT = 6;

/** Elder Futhark rune IDs — each rune gives a block face a behavior. */
export const RuneId = {
	None: 0,
	Fehu: 1,
	Uruz: 2,
	Thurisaz: 3,
	Ansuz: 4,
	Kenaz: 5,
	Isa: 6,
	Berkanan: 7,
	Algiz: 8,
	Sowilo: 9,
	Jera: 10,
	Mannaz: 11,
	Naudiz: 12,
	Hagalaz: 13,
} as const;

export type RuneIdValue = (typeof RuneId)[keyof typeof RuneId];

export interface RuneDef {
	name: string;
	glyph: string;
	color: string;
	description: string;
}

/** Rune definitions indexed by RuneId. */
export const RUNES: Record<number, RuneDef> = {
	[RuneId.Fehu]: {
		name: "Fehu",
		glyph: "\u16A0",
		color: "#FFD700",
		description: "Wealth — emits warm light",
	},
	[RuneId.Uruz]: {
		name: "Uruz",
		glyph: "\u16A2",
		color: "#8B6914",
		description: "Strength — reinforces block",
	},
	[RuneId.Thurisaz]: {
		name: "Thurisaz",
		glyph: "\u16A6",
		color: "#FF4500",
		description: "Thorn — damages nearby creatures",
	},
	[RuneId.Ansuz]: {
		name: "Ansuz",
		glyph: "\u16A8",
		color: "#4169E1",
		description: "Signal — alerts when creatures approach",
	},
	[RuneId.Kenaz]: {
		name: "Kenaz",
		glyph: "\u16B2",
		color: "#a3452a",
		description: "Torch — emits heat in facing direction",
	},
	[RuneId.Isa]: {
		name: "Isa",
		glyph: "\u16C1",
		color: "#ADD8E6",
		description: "Ice — delays signal by N ticks before releasing",
	},
	[RuneId.Berkanan]: {
		name: "Berkanan",
		glyph: "\u16D2",
		color: "#228B22",
		description: "Growth — attracts nearby resources",
	},
	[RuneId.Algiz]: {
		name: "Algiz",
		glyph: "\u16C9",
		color: "#9370DB",
		description: "Protection — shields the structure",
	},
	[RuneId.Sowilo]: {
		name: "Sowilo",
		glyph: "\u16CA",
		color: "#c9a84c",
		description: "Sun — emits light in facing direction, repels Mörker",
	},
	[RuneId.Jera]: {
		name: "Jera",
		glyph: "\u16C3",
		color: "#228B22",
		description: "Harvest — transforms resources when signal present",
	},
	[RuneId.Mannaz]: {
		name: "Mannaz",
		glyph: "\u16D0",
		color: "#E0C068",
		description: "Humanity — calms nearby creatures",
	},
	[RuneId.Naudiz]: {
		name: "Naudiz",
		glyph: "\u16BE",
		color: "#8B0000",
		description: "Need — inverts signal, outputs when unpowered",
	},
	[RuneId.Hagalaz]: {
		name: "Hagalaz",
		glyph: "\u16BA",
		color: "#708090",
		description: "Hail — gates signal, passes only when two inputs present",
	},
};

/** All placeable rune IDs (excludes None). */
export const PLACEABLE_RUNES: RuneIdValue[] = [
	RuneId.Fehu,
	RuneId.Uruz,
	RuneId.Thurisaz,
	RuneId.Ansuz,
	RuneId.Kenaz,
	RuneId.Isa,
	RuneId.Berkanan,
	RuneId.Algiz,
	RuneId.Sowilo,
	RuneId.Jera,
	RuneId.Mannaz,
	RuneId.Naudiz,
	RuneId.Hagalaz,
];

/** Get rune definition, or undefined for None/invalid. */
export function getRuneDef(runeId: number): RuneDef | undefined {
	return RUNES[runeId];
}

/** Get the glow color for a rune, or null for None. */
export function getRuneColor(runeId: number): string | null {
	return RUNES[runeId]?.color ?? null;
}

/** Pack a block position into a string key for rune face storage. */
export function packFaceKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

/** Unpack a face key string back to block coordinates. */
export function unpackFaceKey(key: string): { x: number; y: number; z: number } {
	const parts = key.split(",");
	return { x: Number(parts[0]), y: Number(parts[1]), z: Number(parts[2]) };
}

/** Chisel item ID. */
export const CHISEL_ITEM_ID = 110;
