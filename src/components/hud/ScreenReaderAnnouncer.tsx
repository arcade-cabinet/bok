/**
 * @module components/hud/ScreenReaderAnnouncer
 * @role Visually hidden live region that announces game events to screen readers
 * @input Game engine events (health changes, enemy proximity, loot pickups)
 * @output aria-live regions with announcements for assistive technology
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { EngineEvent, EngineState } from '../../engine/types';

interface Announcement {
  id: number;
  message: string;
  priority: 'assertive' | 'polite';
}

interface Props {
  engineState: EngineState | null;
  /** Subscribe to raw engine events for immediate announcements */
  onSubscribe?: (handler: (event: EngineEvent) => void) => void;
}

let nextId = 0;

/**
 * ScreenReaderAnnouncer -- hidden live regions that announce game state
 * changes to screen readers. Uses assertive for critical alerts (low health,
 * death) and polite for informational updates (loot, kills).
 */
export function ScreenReaderAnnouncer({ engineState, onSubscribe }: Props) {
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const [politeMessage, setPoliteMessage] = useState('');
  const prevHealthRef = useRef<number | null>(null);
  const assertiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const politeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcementsRef = useRef<Announcement[]>([]);

  const announce = useCallback((message: string, priority: 'assertive' | 'polite') => {
    const id = nextId++;
    announcementsRef.current.push({ id, message, priority });

    if (priority === 'assertive') {
      // Clear then set to force re-announcement
      setAssertiveMessage('');
      if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current);
      assertiveTimerRef.current = setTimeout(() => {
        setAssertiveMessage(message);
        assertiveTimerRef.current = null;
      }, 100);
    } else {
      setPoliteMessage('');
      if (politeTimerRef.current) clearTimeout(politeTimerRef.current);
      politeTimerRef.current = setTimeout(() => {
        setPoliteMessage(message);
        politeTimerRef.current = null;
      }, 100);
    }
  }, []);

  // Handle raw engine events
  useEffect(() => {
    if (!onSubscribe) return;

    const handler = (event: EngineEvent) => {
      switch (event.type) {
        case 'playerDamaged':
          announce(`Took ${event.amount} damage`, 'assertive');
          break;
        case 'enemyKilled':
          announce('Enemy defeated', 'polite');
          break;
        case 'lootPickup':
          announce(`Picked up ${event.itemType}`, 'polite');
          break;
        case 'bossPhaseChange':
          announce(`Boss entering phase ${event.phase}`, 'assertive');
          break;
        case 'bossDefeated':
          announce('Boss defeated! Victory!', 'assertive');
          break;
        case 'playerDied':
          announce('You have fallen. The chapter ends.', 'assertive');
          break;
      }
    };

    onSubscribe(handler);
  }, [onSubscribe, announce]);

  // Monitor health state changes
  useEffect(() => {
    if (!engineState) return;

    const { playerHealth, maxHealth } = engineState;
    const prev = prevHealthRef.current;
    prevHealthRef.current = playerHealth;

    if (prev === null) return; // First render, skip

    const ratio = maxHealth > 0 ? playerHealth / maxHealth : 0;

    // Health low warning
    if (ratio < 0.2 && (prev === null || prev / maxHealth >= 0.2)) {
      announce('Health critical!', 'assertive');
    } else if (ratio < 0.5 && (prev === null || prev / maxHealth >= 0.5)) {
      announce('Health low', 'assertive');
    }
  }, [engineState, announce]);

  return (
    <div className="sr-only" data-testid="screen-reader-announcer">
      <div role="status" aria-live="assertive" aria-atomic="true" data-testid="sr-assertive">
        {assertiveMessage}
      </div>
      <div role="log" aria-live="polite" aria-atomic="true" data-testid="sr-polite">
        {politeMessage}
      </div>
    </div>
  );
}
