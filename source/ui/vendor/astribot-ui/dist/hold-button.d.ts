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
/**
 * A press-and-hold button with visual progress indicator.
 *
 * Safety feature: Action only continues while button is held.
 * Releasing immediately triggers the stop callback.
 */
export declare function HoldButton({ text, enabled, onDown, onUp, duration, cooldown, className, }: HoldButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=hold-button.d.ts.map