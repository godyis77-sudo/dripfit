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

  useEffect(() => {
    setMeasurements(getMeasurements());
  }, []);

  const handleDelete = (id: string) => {
    deleteMeasurement(id);
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-background px-6 py-6">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Saved Measurements</h1>
        </div>

        {measurements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Ruler className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No saved measurements yet</p>
            <Button
              className="mt-4 rounded-2xl"
              onClick={() => navigate('/capture')}
            >
              Start Measuring
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {measurements.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                >
                  <Card
                    className="rounded-2xl cursor-pointer"
                    onClick={() => navigate('/results', { state: { result: m } })}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">
                          {new Date(m.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-medium">
                            {m.sizeRecommendation}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(m.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(['chest', 'waist', 'hips', 'inseam'] as const).map(key => (
                          <div key={key} className="text-center">
                            <p className="text-[10px] text-muted-foreground">{MEASUREMENT_LABELS[key]}</p>
                            <p className="text-sm font-semibold text-foreground">{m[key]}"</p>
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
