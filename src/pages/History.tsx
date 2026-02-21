import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, Ruler } from 'lucide-react';
import { MeasurementResult, MEASUREMENT_LABELS } from '@/lib/types';
import { getMeasurements, deleteMeasurement } from '@/lib/storage';

const History = () => {
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<MeasurementResult[]>([]);

  useEffect(() => { setMeasurements(getMeasurements()); }, []);

  const handleDelete = (id: string) => { deleteMeasurement(id); setMeasurements(prev => prev.filter(m => m.id !== id)); };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold text-foreground">Saved Measurements</h1>
        </div>

        {measurements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Ruler className="h-8 w-8 text-muted-foreground/25 mb-3" />
            <p className="text-[13px] font-semibold text-muted-foreground mb-3">No saved measurements</p>
            <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5" onClick={() => navigate('/capture')}>Start Scan</Button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {measurements.map((m) => (
                <motion.div key={m.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -80 }}>
                  <Card className="rounded-xl cursor-pointer" onClick={() => navigate('/results', { state: { result: m } })}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[13px] font-medium text-foreground">{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">{m.sizeRecommendation}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['chest', 'waist', 'hips', 'inseam'] as const).map(key => (
                          <div key={key} className="text-center">
                            <p className="text-[9px] text-muted-foreground">{MEASUREMENT_LABELS[key]}</p>
                            <p className="text-[13px] font-semibold text-foreground">{m[key]}"</p>
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
    </div>
  );
};

export default History;
