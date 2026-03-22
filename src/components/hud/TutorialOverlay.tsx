import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'bok-tutorial-completed';

interface TutorialStep {
  title: string;
  text: string;
  icon: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Bok!',
    icon: '📖',
    text: 'You are an island-hopper, seeking lost Tome pages across dangerous lands. Defeat bosses, collect abilities, and build your power.',
  },
  {
    title: 'Movement',
    icon: '🏃',
    text: 'Use WASD or the on-screen joystick to move. Move the mouse or drag the screen to look around.',
  },
  {
    title: 'Combat',
    icon: '⚔️',
    text: 'Left-click or tap to attack. Press Space to dodge incoming strikes. Time your dodges to avoid damage.',
  },
  {
    title: 'Loot',
    icon: '💎',
    text: 'Defeat enemies to collect loot. Open chests scattered across the island for valuable resources and gear.',
  },
  {
    title: 'Boss',
    icon: '👑',
    text: 'Each island hides a powerful boss. Find and defeat it to earn a Tome page — a new ability to wield.',
  },
  {
    title: 'Hub',
    icon: '🏠',
    text: 'Return to your Hub island between voyages to upgrade buildings, trade with NPCs, and set sail for the next island.',
  },
];

export interface TutorialOverlayProps {
  onComplete: () => void;
}

/** Check whether the tutorial has been completed previously. */
export function isTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Mark the tutorial as completed in localStorage. */
export function markTutorialCompleted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // localStorage unavailable — silently continue
  }
}

/**
 * TutorialOverlay — step-by-step first-run tutorial shown before the game starts.
 * Renders a semi-transparent dark overlay with centered parchment card,
 * step indicator dots, Next button, and Skip link.
 * Framer Motion slide transitions between steps.
 */
export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      markTutorialCompleted();
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [isLastStep, onComplete]);

  const handleSkip = useCallback(() => {
    markTutorialCompleted();
    onComplete();
  }, [onComplete]);

  // Allow Enter/Space to advance, Escape to skip
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleNext, handleSkip]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial"
      data-testid="tutorial-overlay"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="card bg-base-100 border-2 border-secondary shadow-2xl max-w-md w-[90%] p-6 text-center"
          data-testid="tutorial-card"
        >
          {/* Icon */}
          <div className="text-5xl mb-3" aria-hidden="true">
            {step.icon}
          </div>

          {/* Title */}
          <h2
            className="text-2xl mb-3 text-base-content"
            style={{ fontFamily: 'Cinzel, Georgia, serif' }}
            data-testid="tutorial-title"
          >
            {step.title}
          </h2>

          {/* Body */}
          <p
            className="text-sm leading-relaxed text-base-content/80 mb-6"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            {step.text}
          </p>

          {/* Step indicator */}
          <span className="sr-only">{`Step ${currentStep + 1} of ${TUTORIAL_STEPS.length}`}</span>
          <div className="flex justify-center gap-2 mb-4" aria-hidden="true">
            {TUTORIAL_STEPS.map((s, i) => (
              <div
                key={s.title}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  i === currentStep ? 'bg-accent' : i < currentStep ? 'bg-secondary/60' : 'bg-base-content/20'
                }`}
                data-testid={`step-dot-${i}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm px-8"
              onClick={handleNext}
              data-testid="tutorial-next"
            >
              {isLastStep ? 'Start Playing' : 'Next'}
            </button>

            {!isLastStep && (
              <button
                type="button"
                className="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content/80"
                onClick={handleSkip}
                data-testid="tutorial-skip"
              >
                Skip Tutorial
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
