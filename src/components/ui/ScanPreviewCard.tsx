import { motion } from 'framer-motion';
import scanResultsPreview from '@/assets/scan-results-preview.webp';

interface ScanPreviewCardProps {
  height?: number;
  animated?: boolean;
}

const ScanPreviewCard = ({ height = 300, animated = false }: ScanPreviewCardProps) => {
  const card = (
    <div
      className="relative rounded-[1rem] border-[3px] border-primary"
      style={{
        boxShadow:
          '0 0 16px 6px hsl(45 88% 50% / 0.7), 0 0 50px 18px hsl(45 88% 45% / 0.35), 0 0 90px 30px hsl(45 88% 40% / 0.15), inset 0 0 14px 3px hsl(45 88% 50% / 0.2)',
      }}
    >
      <div className="overflow-hidden rounded-[calc(1rem-3px)]">
        <img
          src={scanResultsPreview}
          alt="Scan results preview"
          className="w-auto object-cover"
          style={{ height: `${height}px` }}
        />
      </div>
      <div
        className="absolute -inset-[7px] rounded-[calc(1rem+4px)] border-[4px] border-black pointer-events-none"
        style={{
          boxShadow:
            'inset 0 0 8px 2px hsl(45 88% 50% / 0.7), 0 0 10px 2px hsl(45 88% 50% / 0.6), 0 0 20px 4px hsl(45 88% 50% / 0.25)',
        }}
      />
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex items-center justify-center"
      >
        {card}
      </motion.div>
    );
  }

  return card;
};

export default ScanPreviewCard;
