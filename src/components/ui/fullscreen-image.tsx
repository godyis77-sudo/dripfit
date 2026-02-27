import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface FullscreenImageProps {
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}

export const FullscreenImage = ({ src, alt = '', className = '', children }: FullscreenImageProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children || <img src={src} alt={alt} className={className} />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setOpen(false)}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-[101] h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
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
              className="max-w-full max-h-full object-contain p-4"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
