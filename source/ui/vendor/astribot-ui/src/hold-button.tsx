import { useCallback, useRef, useState } from 'react';

import { cn } from './lib/utils';

interface HoldButtonProps {
  /** Button text */
  text: string;
  /** Whether the button is enabled */
  enabled?: boolean;
  /** Called when button is pressed down */
  onDown: () => void | Promise<void>;
  /** Called when button is released */
  onUp: () => void | Promise<void>;
  /** Duration in seconds for the progress bar to fill (default: 5) */
  duration?: number;
  /** Cooldown in milliseconds after release (default: 2000) */
  cooldown?: number;
  /** Additional class names */
  className?: string;
}

const FRAME_RATE = 30; // fps for progress animation

/**
 * A press-and-hold button with visual progress indicator.
 *
 * Safety feature: Action only continues while button is held.
 * Releasing immediately triggers the stop callback.
 */
export function HoldButton({
  text,
  enabled = true,
  onDown,
  onUp,
  duration = 5,
  cooldown = 2000,
  className,
}: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const cooldownRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (cooldownRef.current !== null) {
      clearTimeout(cooldownRef.current);
      cooldownRef.current = null;
    }
  }, []);

  const handleDown = useCallback(() => {
    if (!enabled || isCooldown) return;

    setIsHolding(true);
    setProgress(0);

    // Start the action
    void onDown();

    // Start progress animation
    const totalFrames = duration * FRAME_RATE;
    let currentFrame = 0;

    intervalRef.current = window.setInterval(() => {
      currentFrame++;
      const newProgress = Math.min((currentFrame / totalFrames) * 100, 100);
      setProgress(newProgress);

      // Stop at 100%
      if (newProgress >= 100 && intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1000 / FRAME_RATE);
  }, [enabled, isCooldown, onDown, duration]);

  const handleUp = useCallback(() => {
    if (!isHolding) return;

    clearTimers();
    setIsHolding(false);
    setProgress(0);

    // Stop the action
    void onUp();

    // Start cooldown
    setIsCooldown(true);
    cooldownRef.current = window.setTimeout(() => {
      setIsCooldown(false);
      cooldownRef.current = null;
    }, cooldown);
  }, [isHolding, clearTimers, onUp, cooldown]);

  const isDisabled = !enabled || isCooldown;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
      onTouchStart={handleDown}
      onTouchEnd={handleUp}
      onTouchCancel={handleUp}
      className={cn(
        'relative h-9 flex-1 overflow-hidden rounded-md bg-secondary text-sm font-medium text-secondary-foreground shadow-xs transition-colors',
        'hover:bg-secondary/80',
        'disabled:pointer-events-none disabled:opacity-50',
        isHolding && 'ring-2 ring-primary ring-offset-1',
        className
      )}
    >
      {/* Progress bar background */}
      <div
        className={cn(
          'absolute inset-0 bg-primary/20 transition-all duration-75',
          !isHolding && 'opacity-0'
        )}
        style={{ width: `${progress}%` }}
      />

      {/* Button text */}
      <span className="relative z-10">{text}</span>

      {/* Cooldown indicator */}
      {isCooldown && (
        <span className="absolute bottom-0.5 right-1 text-[10px] text-muted-foreground">
          ...
        </span>
      )}
    </button>
  );
}
