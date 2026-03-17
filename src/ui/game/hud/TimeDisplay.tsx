import { getTimePhase } from "../../../ecs/systems/time.ts";

interface TimeDisplayProps {
	timeOfDay: number;
	dayCount: number;
}

export function TimeDisplay({ timeOfDay, dayCount }: TimeDisplayProps) {
	const phase = getTimePhase(timeOfDay);

	return (
		<div
			className="text-sm font-semibold tracking-wide"
			style={{
				color: "white",
				textShadow: "1px 1px 2px #000, 0 0 4px #000",
			}}
		>
			Day {dayCount} &mdash; {phase}
		</div>
	);
}
