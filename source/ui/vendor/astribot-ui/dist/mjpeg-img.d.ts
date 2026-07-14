interface MjpegImgProps {
    /** MJPEG stream URL */
    src: string;
    alt: string;
    className?: string;
    /** Max retry attempts on error (default 10) */
    maxRetries?: number;
    /** Delay between retries in ms (default 2000) */
    retryDelay?: number;
}
/**
 * MJPEG <img> that properly aborts the persistent HTTP connection on unmount
 * and auto-retries on load errors (e.g. 503 when camera SHM isn't ready yet).
 */
export declare function MjpegImg({ src, alt, className, maxRetries, retryDelay }: MjpegImgProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=mjpeg-img.d.ts.map