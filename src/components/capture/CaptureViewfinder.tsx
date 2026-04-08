import { motion } from 'framer-motion';
import { Eye, Sun, Maximize, Ruler } from 'lucide-react';
import { CaptureStep, STEP_CONFIG } from '@/lib/types';
import bodySilhouetteFrontMask from '@/assets/body-silhouette-mask.png';
import bodySilhouetteSideMask from '@/assets/body-silhouette-side-mask.png';

interface CaptureViewfinderProps {
  captureStep: CaptureStep;
  photo: string | null;
}

const CaptureViewfinder = ({ captureStep, photo }: CaptureViewfinderProps) => {
  const maskUrl = captureStep === 'side' ? bodySilhouetteSideMask : bodySilhouetteFrontMask;

  return (
    <div className="relative w-full aspect-[3/5] rounded-xl overflow-hidden glass-dark border border-white/10 mb-2">
      {photo ? (
        <img src={photo} alt={STEP_CONFIG[captureStep].title} className="w-full h-full object-cover img-normalize" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground relative">
          {/* Center crosshair guides */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-[8%] bottom-[8%] w-[1.5px] bg-primary/30" />
            <div className="absolute left-[15%] right-[15%] top-[25%] h-[1.5px] bg-primary/25" />
            <div className="absolute left-[15%] right-[15%] top-[75%] h-[1.5px] bg-primary/25" />
          </div>

          {/* Glowing body silhouette overlay */}
          <div className="relative h-[70%] w-full flex items-center justify-center pointer-events-none">
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-y-[2%] inset-x-[18%] rounded-full bg-primary/40 blur-3xl"
            />
            <div className="relative h-full w-full">
              <motion.div
                animate={{
                  opacity: [0.9, 1, 0.9],
                  filter: [
                    'brightness(1.2) contrast(1.4) drop-shadow(0 0 8px hsl(var(--primary) / 0.95)) drop-shadow(0 0 20px hsl(var(--primary) / 0.8)) drop-shadow(0 0 42px hsl(var(--primary) / 0.55)) drop-shadow(0 0 80px hsl(var(--primary) / 0.32))',
                    'brightness(1.35) contrast(1.5) drop-shadow(0 0 10px hsl(var(--primary) / 1)) drop-shadow(0 0 24px hsl(var(--primary) / 0.88)) drop-shadow(0 0 50px hsl(var(--primary) / 0.62)) drop-shadow(0 0 92px hsl(var(--primary) / 0.38))',
                    'brightness(1.2) contrast(1.4) drop-shadow(0 0 8px hsl(var(--primary) / 0.95)) drop-shadow(0 0 20px hsl(var(--primary) / 0.8)) drop-shadow(0 0 42px hsl(var(--primary) / 0.55)) drop-shadow(0 0 80px hsl(var(--primary) / 0.32))',
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0"
                style={{
                  backgroundImage: 'linear-gradient(180deg, hsl(var(--primary) / 0.98) 0%, hsl(var(--primary) / 0.78) 55%, hsl(var(--primary) / 0.9) 100%)',
                  WebkitMaskImage: `url(${maskUrl})`,
                  maskImage: `url(${maskUrl})`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskMode: 'luminance',
                  maskMode: 'luminance',
                } as React.CSSProperties}
              />
              <motion.div
                animate={{ backgroundPosition: ['50% -10%', '50% 110%', '50% -10%'], opacity: [0.35, 0.65, 0.35] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0"
                style={{
                  backgroundImage: 'linear-gradient(180deg, hsl(var(--background) / 0) 20%, hsl(var(--primary-foreground) / 0.75) 50%, hsl(var(--background) / 0) 80%)',
                  backgroundSize: '100% 220%',
                  mixBlendMode: 'screen',
                  WebkitMaskImage: `url(${maskUrl})`,
                  maskImage: `url(${maskUrl})`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskMode: 'luminance',
                  maskMode: 'luminance',
                } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Corner badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/5 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10">
            <Eye className="h-3 w-3 text-white/70" />
            <span className="text-[10px] text-white/70">Head</span>
          </div>
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/5 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10">
            <Sun className="h-3 w-3 text-white/70" />
            <span className="text-[10px] text-white/70">Light</span>
          </div>
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-white/5 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10">
            <Maximize className="h-3 w-3 text-white/70" />
            <span className="text-[10px] text-white/70">Feet</span>
          </div>
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-white/5 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10">
            <Ruler className="h-3 w-3 text-white/70" />
            <span className="text-[10px] text-white/70">6-8 ft</span>
          </div>

          {/* Animated guide text */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute bottom-10 text-center"
          >
            <p className="text-[11px] font-medium text-primary/70">
              {captureStep === 'front' ? 'Align · head to feet' : 'Turn 90° · align with outline'}
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CaptureViewfinder;
