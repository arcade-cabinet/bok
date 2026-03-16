/**
 * Pinch-to-zoom and pan gesture hook for the map canvas.
 * Mobile-first: handles touch pinch gestures.
 * Desktop: scroll wheel zoom.
 */

import { useCallback, useRef, useState } from "react";

const MIN_ZOOM = 4;
const MAX_ZOOM = 24;
const DEFAULT_ZOOM = 8;

function clampZoom(z: number): number {
	return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

export interface MapGestureState {
	zoom: number;
	panX: number;
	panZ: number;
}

export function useMapGestures() {
	const [state, setState] = useState<MapGestureState>({
		zoom: DEFAULT_ZOOM,
		panX: 0,
		panZ: 0,
	});

	const pinchStartRef = useRef<number>(0);
	const zoomStartRef = useRef<number>(DEFAULT_ZOOM);

	const onTouchStart = useCallback(
		(e: React.TouchEvent) => {
			if (e.touches.length === 2) {
				const dx = e.touches[0].clientX - e.touches[1].clientX;
				const dy = e.touches[0].clientY - e.touches[1].clientY;
				pinchStartRef.current = Math.hypot(dx, dy);
				zoomStartRef.current = state.zoom;
			}
		},
		[state.zoom],
	);

	const onTouchMove = useCallback((e: React.TouchEvent) => {
		if (e.touches.length === 2) {
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			const dist = Math.hypot(dx, dy);
			const scale = dist / (pinchStartRef.current || 1);
			setState((prev) => ({
				...prev,
				zoom: clampZoom(zoomStartRef.current * scale),
			}));
		}
	}, []);

	const onWheel = useCallback((e: React.WheelEvent) => {
		e.preventDefault();
		setState((prev) => ({
			...prev,
			zoom: clampZoom(prev.zoom + (e.deltaY > 0 ? -1 : 1)),
		}));
	}, []);

	return { ...state, onTouchStart, onTouchMove, onWheel };
}
