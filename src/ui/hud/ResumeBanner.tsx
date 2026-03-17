/**
 * Resume banner — shows a brief "Previously on..." context when
 * the player returns to a saved game. Fades out after a few seconds.
 */

import { useEffect, useState } from "react";
import { RESUME_BANNER_DURATION_MS } from "../../ecs/systems/session-data.ts";
import type { ResumeContext } from "../../ecs/systems/session-resume.ts";

interface ResumeBannerProps {
	context: ResumeContext | null;
	onDismiss: () => void;
}

export function ResumeBanner({ context, onDismiss }: ResumeBannerProps) {
	const [fading, setFading] = useState(false);

	useEffect(() => {
		if (!context) return;
		const fadeTimer = setTimeout(() => setFading(true), RESUME_BANNER_DURATION_MS - 1000);
		const dismissTimer = setTimeout(onDismiss, RESUME_BANNER_DURATION_MS);
		return () => {
			clearTimeout(fadeTimer);
			clearTimeout(dismissTimer);
		};
	}, [context, onDismiss]);

	if (!context) return null;

	return (
		<button
			type="button"
			className={`absolute top-6 left-1/2 -translate-x-1/2 max-w-sm w-[90%]
				bg-stone-900/85 border border-amber-700/60 rounded-lg px-4 py-3
				text-amber-100 text-sm font-serif shadow-lg text-left
				pointer-events-auto cursor-pointer
				transition-opacity duration-1000
				${fading ? "opacity-0" : "opacity-100"}`}
			onClick={onDismiss}
		>
			<p className="leading-relaxed">{context.text}</p>
			{context.objectiveHint && <p className="mt-1.5 text-amber-300/80 text-xs italic">{context.objectiveHint}</p>}
		</button>
	);
}
