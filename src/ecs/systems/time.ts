import type { World } from "koota";
import { WorldTime } from "../traits/index.ts";

export type TimePhase = "Morning" | "Midday" | "Dusk" | "Night";

export function timeSystem(world: World, dt: number) {
  world.query(WorldTime).updateEach(([time]) => {
    time.timeOfDay += dt / time.dayDuration;
    if (time.timeOfDay > 1) {
      time.timeOfDay -= 1;
      time.dayCount++;
    }
  });
}

export function getTimePhase(timeOfDay: number): TimePhase {
  const angle = timeOfDay * Math.PI * 2;
  const sunHeight = Math.sin(angle);

  if (sunHeight > 0.4) return "Midday";
  if (sunHeight > 0) return timeOfDay < 0.5 ? "Morning" : "Dusk";
  return "Night";
}

export function getSkyColor(phase: TimePhase): number {
  switch (phase) {
    case "Morning":
    case "Midday":
      return 0x87ceeb;
    case "Dusk":
      return 0xff7e47;
    case "Night":
      return 0x050510;
  }
}

export function getAmbientIntensity(phase: TimePhase): number {
  switch (phase) {
    case "Morning":
    case "Midday":
      return 0.35;
    case "Dusk":
      return 0.2;
    case "Night":
      return 0.05;
  }
}

export function getSunIntensity(phase: TimePhase): number {
  switch (phase) {
    case "Morning":
    case "Midday":
      return 1.2;
    case "Dusk":
      return 0.5;
    case "Night":
      return 0;
  }
}
