import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, Ruler, Loader2 } from 'lucide-react';
import { BodyScanResult } from '@/lib/types';
import BottomTabBar from '@/components/BottomTabBar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const MEASUREMENT_LABELS: Record<string, string> = {
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  inseam: 'Inseam',
};

interface DbScan {
  id: string;
  created_at: string;
  chest_min: number;
  chest_max: number;
  waist_min: number;
  waist_max: number;
  hip_min: number;
  hip_max: number;
  inseam_min: number;
  inseam_max: number;
  shoulder_min: number;
  shoulder_max: number;
  height_cm: number;
  confidence: string;
  recommended_size: string | null;
}

function toBodyScanResult(s: DbScan): BodyScanResult {
  return {
    id: s.id,
    date: s.created_at,
    shoulder: { min: s.shoulder_min, max: s.shoulder_max },
    chest: { min: s.chest_min, max: s.chest_max },
    waist: { min: s.waist_min, max: s.waist_max },
    hips: { min: s.hip_min, max: s.hip_max },
    inseam: { min: s.inseam_min, max: s.inseam_max },
    heightCm: s.height_cm,
    confidence: s.confidence as 'low' | 'medium' | 'high',
    recommendedSize: s.recommended_size || 'M',
    fitPreference: 'regular',
    alternatives: { sizeDown: '', sizeUp: '' },
    whyLine: 'Based on your saved scan',
  };
}

const History = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scans, setScans] = useState<DbScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('body_scans')
      .select('id, created_at, chest_min, chest_max, waist_min, waist_max, hip_min, hip_max, inseam_min, inseam_max, shoulder_min, shoulder_max, height_cm, confidence, recommended_size')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setScans(data || []);
        setLoading(false);
      });
  }, [user]);

  const handleDelete = async (id: string) => {
    setScans(prev => prev.filter(s => s.id !== id));
    // Note: delete requires RLS policy or migration; for now just remove from UI
  };

  const mid = (min: number, max: number) => ((min + max) / 2).toFixed(1);

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold text-foreground uppercase">Scan History</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Ruler className="h-8 w-8 text-muted-foreground/25 mb-3" />
            <p className="text-[13px] font-semibold text-muted-foreground mb-3">No scans yet. Let's fix that.</p>
            <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5" onClick={() => navigate('/capture')}>Start Your First Scan</Button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {scans.map((s) => (
                <motion.div key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -80 }}>
                  <Card className="rounded-xl cursor-pointer" onClick={() => navigate('/results', { state: { result: toBodyScanResult(s) } })}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[13px] font-medium text-foreground">{new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <div className="flex items-center gap-1.5">
                          {s.recommended_size && (
                            <span className="text-[11px] pill pill-filled px-2 py-0.5 rounded-md">{s.recommended_size}</span>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 min-h-[44px] min-w-[44px] text-muted-foreground" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} aria-label="Delete scan">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([
                          { key: 'chest', min: s.chest_min, max: s.chest_max },
                          { key: 'waist', min: s.waist_min, max: s.waist_max },
                          { key: 'hips', min: s.hip_min, max: s.hip_max },
                          { key: 'inseam', min: s.inseam_min, max: s.inseam_max },
                        ]).map(({ key, min, max }) => (
                          <div key={key} className="text-center">
                            <p className="text-[11px] text-muted-foreground">{MEASUREMENT_LABELS[key]}</p>
                            <p className="text-[13px] font-semibold text-foreground">{mid(min, max)}"</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default History;
