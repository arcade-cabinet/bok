interface UnderwaterOverlayProps {
	isUnderwater: boolean;
}

export function UnderwaterOverlay({ isUnderwater }: UnderwaterOverlayProps) {
	if (!isUnderwater) return null;

	return (
		<div
			className="absolute inset-0 pointer-events-none z-[2]"
			style={{
				background: "rgba(0, 105, 148, 0.45)",
				boxShadow: "inset 0 0 150px rgba(0,30,50,0.8)",
			}}
		/>
	);
}
