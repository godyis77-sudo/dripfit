import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { Save, Share2, ArrowLeft, Check, Ruler } from 'lucide-react';
import { MeasurementResult, MEASUREMENT_LABELS } from '@/lib/types';
import { saveMeasurement } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

const CM_RATIO = 2.54;

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const result = (location.state as { result: MeasurementResult })?.result;
  const [useCm, setUseCm] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!result) {
    navigate('/', { replace: true });
    return null;
  }

  const convert = (val: number) => useCm ? +(val * CM_RATIO).toFixed(1) : val;
  const unitLabel = useCm ? 'cm' : 'in';

  const measurementKeys = ['chest', 'waist', 'hips', 'inseam', 'armLength', 'shoulderWidth', 'neck', 'torsoLength'] as const;

  const handleSave = () => {
    saveMeasurement({ ...result, unit: useCm ? 'cm' : 'in' });
    setSaved(true);
    toast({ title: 'Saved!', description: 'Measurements saved to your device.' });
  };

  const handleShare = async () => {
    const text = measurementKeys
      .map(k => `${MEASUREMENT_LABELS[k]}: ${convert(result[k])} ${unitLabel}`)
      .join('\n');
    const shareText = `BodyMeasure Results\n${new Date(result.date).toLocaleDateString()}\n\n${text}\n\nRecommended Size: ${result.sizeRecommendation}`;

    if (navigator.share) {
      await navigator.share({ title: 'My Body Measurements', text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: 'Copied!', description: 'Measurements copied to clipboard.' });
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-6">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Your Measurements</h1>
          <div className="w-10" />
        </div>

        {/* Unit toggle */}
        <div className="flex items-center justify-between mb-6 bg-card rounded-2xl p-4 border border-border">
          <span className="text-sm text-muted-foreground">Show in centimeters</span>
          <Switch checked={useCm} onCheckedChange={setUseCm} />
        </div>

        {/* Measurements grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {measurementKeys.map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="rounded-2xl">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{MEASUREMENT_LABELS[key]}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {convert(result[key])}
                    <span className="text-sm font-normal text-muted-foreground ml-1">{unitLabel}</span>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Size recommendation */}
        <Card className="rounded-2xl mb-6 bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Recommended Size</p>
            <p className="text-3xl font-bold text-primary">{result.sizeRecommendation}</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-14 rounded-2xl"
              onClick={handleShare}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button
              className="flex-1 h-14 rounded-2xl"
              onClick={handleSave}
              disabled={saved}
            >
              {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => navigate('/capture')}
          >
            Measure Again
          </Button>
          <Button
            variant="outline"
            className="w-full h-14 rounded-2xl"
            onClick={() => navigate('/size-guide')}
          >
            <Ruler className="mr-2 h-4 w-4" /> Match to Brand Size Guide
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
