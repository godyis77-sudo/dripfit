import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Ruler, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import BottomTabBar from '@/components/BottomTabBar';
import type { BodyScanResult } from '@/lib/types';
import { MEASUREMENT_LABELS } from '@/lib/types';
import { getFitPreference } from '@/lib/session';

const ProfileBody = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle('Body & Fit');
  const [scan, setScan] = useState<BodyScanResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setScan({
          id: data.id,
          date: data.created_at,
          shoulder: { min: data.shoulder_min, max: data.shoulder_max },
          chest: { min: data.chest_min, max: data.chest_max },
          bust: data.bust_min != null && data.bust_max != null && (data.bust_min > 0 || data.bust_max > 0)
            ? { min: data.bust_min, max: data.bust_max } : undefined,
          waist: { min: data.waist_min, max: data.waist_max },
          hips: { min: data.hip_min, max: data.hip_max },
          inseam: { min: data.inseam_min, max: data.inseam_max },
          sleeve: data.sleeve_min != null && data.sleeve_max != null && (data.sleeve_min > 0 || data.sleeve_max > 0)
            ? { min: data.sleeve_min, max: data.sleeve_max } : undefined,
          heightCm: data.height_cm,
          confidence: (data.confidence as any) || 'medium',
          recommendedSize: data.recommended_size || 'M',
          fitPreference: 'regular',
          alternatives: { sizeDown: '', sizeUp: '' },
          whyLine: '',
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const fit = getFitPreference();
  const measurements: Record<string, { min: number; max: number }> = scan ? {
    shoulder: scan.shoulder, chest: scan.chest, waist: scan.waist,
    hips: scan.hips, inseam: scan.inseam,
    ...(scan.bust ? { bust: scan.bust } : {}),
    ...(scan.sleeve ? { sleeve: scan.sleeve } : {}),
  } : {};

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-bottom">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="h-8 w-8 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-foreground">Body & Fit Identity</h1>
            <p className="text-[10px] text-muted-foreground">Your measurements and fit preferences</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : !scan ? (
          <div className="text-center py-14">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Ruler className="h-6 w-6 text-primary/50" />
            </div>
            <p className="text-[14px] font-bold text-foreground mb-1">No body profile yet</p>
            <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">
              Complete a quick scan to get your measurements and fit identity.
            </p>
            <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/capture')}>
              <Camera className="mr-1.5 h-4 w-4" /> Start Scan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Fit Identity Card */}
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-7 w-7 rounded-lg gradient-drip flex items-center justify-center">
                  <Ruler className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <p className="text-[13px] font-bold text-foreground">Fit Identity</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Fit', value: fit, cls: 'capitalize' },
                  { label: 'Size', value: scan.recommendedSize },
                  { label: 'Height', value: `${scan.heightCm}cm` },
                  { label: 'Confidence', value: scan.confidence, cls: 'capitalize' },
                ].map(d => (
                  <div key={d.label} className="bg-background rounded-lg py-1.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{d.label}</p>
                    <p className={`text-[12px] font-bold text-foreground ${d.cls || ''}`}>{d.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground mt-2">
                Last scan: {new Date(scan.date).toLocaleDateString()}
              </p>
            </div>

            {/* Measurements */}
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-[11px] font-bold text-foreground mb-2">Measurements (cm)</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(measurements).map(([key, range]) => (
                  <div key={key} className="bg-background rounded-lg px-3 py-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{MEASUREMENT_LABELS[key] || key}</p>
                    <p className="text-[13px] font-bold text-foreground">{range.min.toFixed(1)} – {range.max.toFixed(1)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <Button
              className="w-full h-10 rounded-lg btn-luxury text-primary-foreground text-sm font-bold"
              onClick={() => navigate('/results', { state: { result: scan } })}
            >
              View Full Results
            </Button>
            <Button
              variant="outline"
              className="w-full h-9 rounded-lg text-[12px] font-bold"
              onClick={() => navigate('/capture')}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" /> New Scan
            </Button>
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default ProfileBody;
