/**
 * Permanent fog overlay displayed when the player is in the Blothögen biome.
 * Uses radial gradient vignette with dark purple-black tones to convey corruption.
 * Follows UnderwaterOverlay pattern: pure prop-driven, no ECS imports.
 */

interface BlothogenFogOverlayProps {
	active: boolean;
}

export function BlothogenFogOverlay({ active }: BlothogenFogOverlayProps) {
	if (!active) return null;

	return (
		<div
			data-testid="blothogen-fog"
			className="absolute inset-0 pointer-events-none z-[2]"
			style={{
				background:
					"radial-gradient(ellipse at center, rgba(30,20,40,0.25) 0%, rgba(20,10,30,0.55) 60%, rgba(10,5,15,0.75) 100%)",
				boxShadow: "inset 0 0 200px rgba(15,5,25,0.6)",
			}}
		/>
	);
}
