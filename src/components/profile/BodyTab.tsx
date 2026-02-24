import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Ruler, Camera } from 'lucide-react';
import type { BodyScanResult, FitPreference } from '@/lib/types';
import BodyDiagram from '@/components/results/BodyDiagram';

interface BodyTabProps {
  savedProfile: BodyScanResult | null;
  fit: FitPreference;
}

const BodyTab = ({ savedProfile, fit }: BodyTabProps) => {
  const navigate = useNavigate();

  if (!savedProfile) {
    return (
      <div className="text-center py-10">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Ruler className="h-6 w-6 text-primary/50" />
        </div>
        <p className="text-[14px] font-bold text-foreground mb-1">No body scan yet</p>
        <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">Complete a quick scan to see your measurements and body diagram here.</p>
        <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/capture')}>
          <Camera className="mr-1.5 h-4 w-4" /> Start Scan
        </Button>
      </div>
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

  return (
    <>
      <BodyDiagram measurements={m} heightCm={savedProfile.heightCm} />

      <div className="bg-card border border-border rounded-xl p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="h-3.5 w-3.5 text-primary" />
          <p className="text-[13px] font-bold text-foreground">Fit Identity</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Size', value: savedProfile.recommendedSize },
            { label: 'Fit', value: fit, cls: 'capitalize' },
            { label: 'Confidence', value: savedProfile.confidence, cls: 'capitalize' },
            { label: 'Height', value: `${savedProfile.heightCm}cm` },
          ].map(d => (
            <div key={d.label} className="bg-background rounded-lg py-1.5 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{d.label}</p>
              <p className={`text-[12px] font-bold text-foreground ${d.cls || ''}`}>{d.value}</p>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">Last scan: {new Date(savedProfile.date).toLocaleDateString()}</p>
      </div>

      <Button variant="outline" className="w-full rounded-lg text-[11px] h-9 mb-2" onClick={() => navigate('/capture')}>
        <Camera className="mr-1.5 h-3.5 w-3.5" /> Update Body Scan
      </Button>
    </>
  );
};

export default BodyTab;
