/** Cosmetic seed name generator for the title screen. */

import { cosmeticRng } from "./noise.ts";

const adjectives = [
	"Brave",
	"Dark",
	"Frosty",
	"Crimson",
	"Silent",
	"Lost",
	"Ancient",
	"Wandering",
	"Golden",
	"Mystic",
	"Shattered",
	"Ethereal",
	"Fierce",
	"Radiant",
	"Shadowy",
	"Wild",
];
const nouns = [
	"Fox",
	"Mountain",
	"River",
	"Valley",
	"Keep",
	"Shadow",
	"Crown",
	"Stone",
	"Forest",
	"Wolf",
	"Realm",
	"Abyss",
	"Spire",
	"Oak",
	"Crystal",
];

export function generateRandomSeedString(): string {
	const rng = cosmeticRng;
	const a1 = adjectives[Math.floor(rng() * adjectives.length)];
	let a2 = adjectives[Math.floor(rng() * adjectives.length)];
	let attempts = 0;
	while (a1 === a2 && attempts < 20) {
		a2 = adjectives[Math.floor(rng() * adjectives.length)];
		attempts++;
	}
	const n = nouns[Math.floor(rng() * nouns.length)];
	return `${a1} ${a2} ${n}`;
}
