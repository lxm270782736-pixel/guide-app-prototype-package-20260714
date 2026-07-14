/**
 * Network state types for Zustand store
 */
/**
 * Get signal level from signal strength percentage
 * - Strong: > 70
 * - Medium: 30-70
 * - Weak: 1-29
 * - None: 0 or disconnected
 */
export function getSignalLevel(signalStrength) {
    if (signalStrength > 70)
        return 'strong';
    if (signalStrength >= 30)
        return 'medium';
    if (signalStrength > 0)
        return 'weak';
    return 'none';
}
// ============================================================================
// Computed selectors (for use with store)
// ============================================================================
/**
 * Check if robot is online (has internet connectivity)
 */
export function selectIsOnline(state) {
    return state.status?.isOnline ?? false;
}
/**
 * Check if robot is in AP mode
 */
export function selectIsApMode(state) {
    return state.status?.mode === 'ap_mode';
}
/**
 * Get current signal level
 */
export function selectSignalLevel(state) {
    if (!state.status || state.status.mode !== 'wifi') {
        return 'none';
    }
    return getSignalLevel(state.status.signalStrength);
}
//# sourceMappingURL=network.js.map