import { useEffect, useRef, useState, useCallback } from 'react';

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
export function MjpegImg({ src, alt, className, maxRetries = 10, retryDelay = 2000 }: MjpegImgProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [activeSrc, setActiveSrc] = useState(src);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset retries when src changes
  useEffect(() => {
    retryCount.current = 0;
    setActiveSrc(src);
  }, [src]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const img = ref.current;
      if (img) img.src = '';
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  const handleError = useCallback(() => {
    if (retryCount.current >= maxRetries) return;
    retryCount.current += 1;
    // Clear src to abort the failed connection, then re-set after delay
    if (ref.current) ref.current.src = '';
    retryTimer.current = setTimeout(() => {
      setActiveSrc('');
      // Force React to re-set the src by toggling through empty
      requestAnimationFrame(() => setActiveSrc(src));
    }, retryDelay);
  }, [src, maxRetries, retryDelay]);

  const handleLoad = useCallback(() => {
    retryCount.current = 0;
  }, []);

  return <img ref={ref} src={activeSrc} alt={alt} className={className} onError={handleError} onLoad={handleLoad} />;
}
