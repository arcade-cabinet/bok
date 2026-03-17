/**
 * BokPage — birch-bark styled page wrapper for the Bok journal.
 * Provides the parchment background, rune border, and content area.
 */

import type { ReactNode } from "react";

interface BokPageProps {
	title: string;
	children?: ReactNode;
}

export function BokPage({ title, children }: BokPageProps) {
	return (
		<div className="flex-1 overflow-y-auto px-6 py-5" data-testid="bok-page">
			{/* Rune border top */}
			<div
				className="text-center text-xs tracking-[0.6em] opacity-30 mb-3 select-none"
				style={{ color: "var(--color-bok-gold)" }}
				aria-hidden="true"
			>
				&#5765; &#5765; &#5765; &#5765; &#5765;
			</div>

			<h2
				className="font-display text-xl tracking-[0.2em] uppercase text-center mb-5"
				style={{ color: "var(--color-bok-ink)" }}
			>
				{title}
			</h2>

			<div className="font-body text-sm leading-relaxed" style={{ color: "var(--color-bok-ink)", opacity: 0.7 }}>
				{children || <p className="text-center italic opacity-50">These pages are yet unwritten...</p>}
			</div>

			{/* Rune border bottom */}
			<div
				className="text-center text-xs tracking-[0.6em] opacity-30 mt-5 select-none"
				style={{ color: "var(--color-bok-gold)" }}
				aria-hidden="true"
			>
				&#5765; &#5765; &#5765; &#5765; &#5765;
			</div>
		</div>
	);
}
