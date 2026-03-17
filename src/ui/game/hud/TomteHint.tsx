/**
 * TomteHint — diegetic carved-wood speech bubble near the Tomte.
 * Shows tutorial hints from Tomte AI state.
 * Styled as a birch-bark note, matching the Bok's aesthetic.
 */

import { useEffect, useState } from "react";

interface TomteHintProps {
	hint: string | null;
}

export function TomteHint({ hint }: TomteHintProps) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!hint) {
			setVisible(false);
			return;
		}
		const timer = setTimeout(() => setVisible(true), 600);
		return () => clearTimeout(timer);
	}, [hint]);

	if (!hint || !visible) return null;

	return (
		<div
			data-testid="tomte-hint"
			className="absolute top-20 left-1/2 -translate-x-1/2
				bg-amber-900/70 border border-amber-700/50 rounded-sm px-3 py-1.5
				text-amber-100 text-xs font-serif italic
				transition-opacity duration-700 opacity-80
				shadow-md"
		>
			<span className="text-amber-400 mr-1">⚒</span>
			{hint}
		</div>
	);
}
