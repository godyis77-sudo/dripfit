import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  retailers: string[];
  retailerUrlMap: Map<string, string>;
}

const ImageViewer = ({ src, alt, retailers, retailerUrlMap }: ImageViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number | null>(null);

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

  // Reset zoom when src changes
  const prevSrc = useRef(src);
  if (prevSrc.current !== src) {
    prevSrc.current = src;
    if (zoom !== 1) setZoom(1);
    if (pan.x !== 0 || pan.y !== 0) setPan({ x: 0, y: 0 });
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="px-2"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      <div className="relative mx-auto flex w-full justify-center overflow-hidden rounded-2xl bg-background touch-none">
        <img
          src={src}
          alt={alt}
          className="block h-auto max-h-[72dvh] w-auto max-w-full rounded-2xl object-contain object-top transition-transform duration-100"
          style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
          draggable={false}
        />
        {/* Retailer badges moved below image — see PostDetailSheet */}
      </div>
    </motion.div>
  );
};

export default ImageViewer;
