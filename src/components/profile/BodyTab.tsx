import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Ruler, Camera, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import bodySilhouette from '@/assets/body-silhouette-clean.webp';
import type { BodyScanResult, FitPreference } from '@/lib/types';
import BodyDiagram from '@/components/results/BodyDiagram';
import ShareResultsButton from '@/components/results/ShareResultsButton';
import MeasurementGrid from '@/components/results/MeasurementGrid';
import ConfidenceSheet from '@/components/results/ConfidenceSheet';

interface BodyTabProps {
  savedProfile: BodyScanResult | null;
  fit: FitPreference;
  scanConfidence?: number | null;
}

function confidenceToPercent(conf: string, numeric?: number | null): number {
  if (numeric != null && numeric > 0) return Math.round(numeric * 100);
  switch (conf) {
    case 'high': return 92;
    case 'medium': return 75;
    case 'low': return 54;
    default: return 75;
  }
}

function confidenceTier(pct: number): { label: string; color: string } {
  if (pct >= 85) return { label: 'High', color: '#22C55E' };
  if (pct >= 70) return { label: 'Good', color: '#F59E0B' };
  if (pct >= 60) return { label: 'Fair', color: '#F59E0B' };
  return { label: 'Low', color: '#EF4444' };
}

const BodyTab = ({ savedProfile, fit, scanConfidence }: BodyTabProps) => {
  const navigate = useNavigate();
  const [showConfidence, setShowConfidence] = useState(false);

  if (!savedProfile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col items-center justify-center py-16 px-6 text-center overflow-hidden"
      >
        {/* Ghost silhouette */}
        <img
          src={bodySilhouette}
          alt=""
          className="absolute inset-0 w-full h-full object-contain opacity-[0.06] pointer-events-none select-none"
        />
        <div className="relative z-10 flex flex-col items-center">
          <Ruler className="h-8 w-8 text-primary/40 mb-3" />
          <h2 className="text-[18px] font-bold text-foreground mb-1">No body scan on file</h2>
          <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">Get your exact measurements in 60 seconds with 2 photos.</p>
          <Button className="rounded-full btn-luxury text-primary-foreground text-sm h-11 px-6 font-bold" onClick={() => navigate('/capture')}>
            Get My Measurements
          </Button>
        </div>
      </motion.div>
    );
  }

  const m: Record<string, { min: number; max: number }> = {};
  if (savedProfile.shoulder) m.shoulder = savedProfile.shoulder;
  if (savedProfile.chest) m.chest = savedProfile.chest;
  if (savedProfile.bust) m.bust = savedProfile.bust;
  if (savedProfile.waist) m.waist = savedProfile.waist;
  if (savedProfile.hips) m.hips = savedProfile.hips;
  if (savedProfile.inseam) m.inseam = savedProfile.inseam;
  if (savedProfile.sleeve) m.sleeve = savedProfile.sleeve;

  const pct = confidenceToPercent(savedProfile.confidence, scanConfidence);
  const tier = confidenceTier(pct);

  return (
    <>
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <ShareResultsButton
            measurements={m}
            heightCm={savedProfile.heightCm}
            recommendedSize={savedProfile.recommendedSize}
            fitPreference={fit}
            variant="icon"
          />
        </div>
        <BodyDiagram measurements={m} heightCm={savedProfile.heightCm} />
      </div>

      <MeasurementGrid measurements={m} heightCm={savedProfile.heightCm} />

      <div className="bg-card border border-border rounded-xl p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="h-3.5 w-3.5 text-primary" />
          <p className="text-[13px] font-bold text-foreground">Fit Identity</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <div className="bg-background rounded-lg py-1.5 text-center cursor-default">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Fit</p>
            <p className="text-[12px] font-bold text-foreground capitalize">{fit}</p>
          </div>
          <div className="bg-background rounded-lg py-1.5 text-center cursor-default">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Size</p>
            <p className="text-[12px] font-bold text-foreground">{savedProfile.recommendedSize}</p>
          </div>
          <div className="bg-background rounded-lg py-1.5 text-center cursor-default">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Height</p>
            <p className="text-[12px] font-bold text-foreground">{savedProfile.heightCm}cm</p>
          </div>
          <button
            onClick={() => setShowConfidence(true)}
            className="bg-background rounded-lg py-1.5 text-center active:scale-95 transition-transform cursor-pointer"
          >
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-0.5">
              Confidence
              <Info className="h-2.5 w-2.5 text-primary opacity-80" />
            </p>
            <div className="flex items-center justify-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: tier.color }}
              />
              <span className="text-[12px] font-bold text-foreground">{pct}%</span>
              <span className="text-[9px] text-muted-foreground">{tier.label}</span>
            </div>
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">Last scan: {new Date(savedProfile.date).toLocaleDateString()}</p>
      </div>

      <Button variant="outline" className="w-full rounded-lg text-[11px] h-9 mb-2" onClick={() => navigate('/capture')}>
        <Camera className="mr-1.5 h-3.5 w-3.5" /> Update Body Scan
      </Button>

      <ConfidenceSheet
        open={showConfidence}
        onOpenChange={setShowConfidence}
        confidence={(savedProfile.confidence as any) || 'medium'}
      />
    </>
  );
};

export default BodyTab;
