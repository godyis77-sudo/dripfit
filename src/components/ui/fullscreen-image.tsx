import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Sparkles, Plus } from 'lucide-react';

interface FullscreenImageProps {
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  /** Product description shown in fullscreen overlay */
  description?: string | null;
  /** Optional action buttons shown at bottom */
  onShop?: () => void;
  onTryOn?: () => void;
  onAddToWardrobe?: () => void;
  /** When true, the overlay opens immediately without needing a child click trigger */
  externalOpen?: boolean;
  /** Called when the externally-opened overlay is closed */
  onExternalClose?: () => void;
}

/** Internal zoomable image with pinch + double-tap */
function ZoomableFullscreenImg({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number | null>(null);

  // Reset when src changes
  const prevSrc = useRef(src);
  if (prevSrc.current !== src) {
    prevSrc.current = src;
    if (zoom !== 1) setZoom(1);
    if (pan.x !== 0 || pan.y !== 0) setPan({ x: 0, y: 0 });
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1 && zoom > 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsPanning(true);
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / lastDist.current;
      setZoom(prev => Math.min(4, Math.max(1, prev * scale)));
      lastDist.current = dist;
    } else if (e.touches.length === 1 && isPanning && lastTouch.current && zoom > 1) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [isPanning, zoom]);

  const handleTouchEnd = useCallback(() => {
    lastDist.current = null;
    lastTouch.current = null;
    setIsPanning(false);
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  const handleDoubleClick = useCallback(() => {
    if (zoom > 1) { setZoom(1); setPan({ x: 0, y: 0 }); } else { setZoom(2.5); }
  }, [zoom]);

  return (
    <div
      className="relative touch-none flex items-center justify-center w-screen"
      style={{ height: 'var(--fs-img-max-h, 100dvh)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => e.stopPropagation()}
    >
      {zoom > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-black/70 border border-white/25 backdrop-blur-sm text-[11px] font-bold text-white active:scale-95 transition-transform"
        >
          Reset Zoom
        </button>
      )}
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full w-auto h-auto object-contain"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transition: isPanning ? 'none' : 'transform 0.15s ease-out',
        }}
        draggable={false}
      />
    </div>
  );
}

export const FullscreenImage = ({ src, alt = '', className = '', children, description, onShop, onTryOn, onAddToWardrobe, externalOpen, onExternalClose }: FullscreenImageProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = useCallback((v: boolean) => {
    if (!v && externalOpen) {
      onExternalClose?.();
      return;
    }

    setInternalOpen(v);
  }, [externalOpen, onExternalClose]);
  const hasActions = !!(onShop || onTryOn || onAddToWardrobe);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    if (open) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  return (
    <>
      {!externalOpen && <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }
        }}
        className="cursor-pointer"
      >
        {children || <img src={src} alt={alt} className={className} />}
      </div>}

      {portalTarget && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="fs-image-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="fixed inset-0 z-[100] h-dvh w-screen overflow-hidden overscroll-none bg-black"
              style={{ ['--fs-img-max-h' as any]: (description || hasActions) ? '78dvh' : '100dvh' }}
            >
              {/* Backdrop layer — closes on tap */}
              <div
                className="absolute inset-0 z-0 flex flex-col items-center justify-center"
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) setOpen(false);
                }}
              >
                <ZoomableFullscreenImg src={src} alt={alt} />

                {description && (
                  <p className="text-[12px] text-white/50 leading-relaxed text-center line-clamp-3 px-6 mt-3 max-w-sm">
                    {description}
                  </p>
                )}

                {hasActions && (
                  <div
                    className="flex gap-3 mt-4 px-6 pb-safe-tab"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onShop && (
                      <button
                        type="button"
                        onClick={() => { onShop(); setOpen(false); }}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[12px] font-bold text-white bg-white/15 border border-white/20 backdrop-blur-sm active:scale-95 transition-transform"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Shop
                      </button>
                    )}
                    {onTryOn && (
                      <button
                        type="button"
                        onClick={() => { onTryOn(); setOpen(false); }}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[12px] font-bold text-black bg-white border border-white/80 active:scale-95 transition-transform"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Try-On
                      </button>
                    )}
                    {onAddToWardrobe && (
                      <button
                        type="button"
                        onClick={() => { onAddToWardrobe(); setOpen(false); }}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[12px] font-bold text-white bg-white/15 border border-white/20 backdrop-blur-sm active:scale-95 transition-transform"
                      >
                        <Plus className="h-3.5 w-3.5" /> Wardrobe
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Close — top z-index sibling, isolated from backdrop handlers */}
              <button
                type="button"
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(false); }}
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className="absolute right-4 z-[200] h-11 w-11 rounded-full bg-black/80 backdrop-blur-md border border-white/30 flex items-center justify-center active:scale-90 transition-transform shadow-[0_2px_12px_rgba(0,0,0,0.5)] p-0"
                style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
                aria-label="Close"
              >
                <X className="h-5 w-5 text-white" strokeWidth={2.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        portalTarget
      )}
    </>
  );
};
