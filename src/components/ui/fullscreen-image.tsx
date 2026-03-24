import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Sparkles, Plus } from 'lucide-react';

interface FullscreenImageProps {
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  /** Optional action buttons shown at bottom */
  onShop?: () => void;
  onTryOn?: () => void;
  onAddToWardrobe?: () => void;
}

const TAP_THRESHOLD_PX = 10;

export const FullscreenImage = ({ src, alt = '', className = '', children, onShop, onTryOn, onAddToWardrobe }: FullscreenImageProps) => {
  const [open, setOpen] = useState(false);
  const hasActions = !!(onShop || onTryOn || onAddToWardrobe);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const pointerStartRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const pointerMovedRef = useRef(false);

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
      <div
        role="button"
        tabIndex={0}
        onPointerDown={(e) => {
          pointerStartRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          pointerMovedRef.current = false;
        }}
        onPointerMove={(e) => {
          if (!pointerStartRef.current || pointerStartRef.current.id !== e.pointerId) return;
          const dx = Math.abs(e.clientX - pointerStartRef.current.x);
          const dy = Math.abs(e.clientY - pointerStartRef.current.y);
          if (dx > TAP_THRESHOLD_PX || dy > TAP_THRESHOLD_PX) {
            pointerMovedRef.current = true;
          }
        }}
        onPointerUp={(e) => {
          if (!pointerStartRef.current || pointerStartRef.current.id !== e.pointerId) return;
          if (!pointerMovedRef.current) setOpen(true);
          pointerStartRef.current = null;
          pointerMovedRef.current = false;
        }}
        onPointerCancel={() => {
          pointerStartRef.current = null;
          pointerMovedRef.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="cursor-pointer"
      >
        {children || <img src={src} alt={alt} className={className} />}
      </div>

      <AnimatePresence>
        {open && portalTarget && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[240] h-dvh w-screen overflow-hidden overscroll-none bg-black/95 flex flex-col items-center justify-center"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-[241] h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={src}
              alt={alt}
              className="max-w-[calc(100%-2rem)] max-h-[72dvh] w-auto h-auto rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {hasActions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.2 }}
                className="flex gap-3 mt-6 px-6 pb-safe-tab"
                onClick={(e) => e.stopPropagation()}
              >
                {onShop && (
                  <button
                    onClick={() => { onShop(); setOpen(false); }}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[12px] font-bold text-white bg-white/15 border border-white/20 backdrop-blur-sm active:scale-95 transition-transform"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Shop
                  </button>
                )}
                {onTryOn && (
                  <button
                    onClick={() => { onTryOn(); setOpen(false); }}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[12px] font-bold text-black bg-white border border-white/80 active:scale-95 transition-transform"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Try-On
                  </button>
                )}
                {onAddToWardrobe && (
                  <button
                    onClick={() => { onAddToWardrobe(); setOpen(false); }}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[12px] font-bold text-white bg-white/15 border border-white/20 backdrop-blur-sm active:scale-95 transition-transform"
                  >
                    <Plus className="h-3.5 w-3.5" /> Wardrobe
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>,
          portalTarget
        )}
      </AnimatePresence>
    </>
  );
};
