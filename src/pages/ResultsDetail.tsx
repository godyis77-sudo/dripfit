import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Ruler } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import BottomTabBar from '@/components/BottomTabBar';
import type { BodyScanResult } from '@/lib/types';

const ResultsDetail = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle('Scan Results');
  const [scan, setScan] = useState<BodyScanResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scanId || !user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('body_scans')
        .select('*')
        .eq('id', scanId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        const profile: BodyScanResult = {
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
        };
        setScan(profile);
      }
      setLoading(false);
    })();
  }, [scanId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
        <div className="max-w-sm mx-auto text-center pt-20">
          <Ruler className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-base font-bold text-foreground mb-1">Scan not found</p>
          <p className="text-[12px] text-muted-foreground mb-4">This scan may have been deleted.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate('/profile')}>
            Back to Profile
          </Button>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  // Redirect to Results page with state
  navigate('/results', { state: { result: scan }, replace: true });
  return null;
};

export default ResultsDetail;
