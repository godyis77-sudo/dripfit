import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { Save, Share2, ArrowLeft, Check, Shirt, Trash2, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { BodyScanResult, MEASUREMENT_LABELS } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const CM_TO_IN = 0.3937;

const confidenceColors: Record<string, string> = {
  high: 'bg-primary/10 text-primary',
  medium: 'bg-accent/20 text-accent-foreground',
  low: 'bg-destructive/10 text-destructive',
};

const confidenceDotColors: Record<string, string> = {
  high: 'bg-primary',
  medium: 'bg-accent',
  low: 'bg-destructive',
};

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const result = (location.state as { result: BodyScanResult })?.result;
  const [useCm, setUseCm] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!result) {
    navigate('/', { replace: true });
    return null;
  }

  const formatRange = (r: { min: number; max: number }) => {
    if (useCm) return `${r.min.toFixed(0)}–${r.max.toFixed(0)}`;
    return `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)}`;
  };

  const unitLabel = useCm ? 'cm' : 'in';
  const measurementKeys = ['shoulder', 'chest', 'waist', 'hips', 'inseam'] as const;

  const handleSave = () => {
    // Save to localStorage for now
    const history = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    history.unshift(result);
    localStorage.setItem('dripcheck_scans', JSON.stringify(history));
    setSaved(true);
    toast({ title: 'Saved!', description: 'Body profile saved to your device.' });
  };

  const handleDelete = () => {
    toast({ title: 'Deleted', description: 'Photos removed from this session.' });
    navigate('/');
  };

  const handleShare = async () => {
    const text = measurementKeys
      .map(k => `${MEASUREMENT_LABELS[k]}: ${formatRange(result[k])} ${unitLabel}`)
      .join('\n');
    const shareText = `DripCheck Results\nRecommended: ${result.recommendedSize}\nConfidence: ${result.confidence}\n\n${text}\nHeight: ${useCm ? result.heightCm : (result.heightCm * CM_TO_IN).toFixed(1)} ${unitLabel}`;

    if (navigator.share) {
      await navigator.share({ title: 'My Size Results', text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: 'Copied!', description: 'Results copied to clipboard.' });
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-6 pb-8">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Your Results</h1>
          <div className="w-10" />
        </div>

        {/* Main recommendation */}
        <Card className="rounded-2xl mb-4 bg-primary/5 border-primary/20">
          <CardContent className="p-5 text-center">
            <p className="text-xs font-semibold text-foreground/70 mb-1">Recommended Size</p>
            <p className="text-4xl font-bold text-primary mb-2">{result.recommendedSize}</p>
            <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 ${confidenceColors[result.confidence]}`}>
              <div className={`h-2 w-2 rounded-full ${confidenceDotColors[result.confidence]}`} />
              <span className="text-xs font-bold capitalize">{result.confidence} confidence</span>
            </div>
          </CardContent>
        </Card>

        {/* Alternatives */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="rounded-2xl">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground">Fitted</p>
              <p className="text-lg font-bold text-foreground">{result.alternatives.sizeDown}</p>
              <p className="text-[10px] text-muted-foreground">Size down</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground">Relaxed</p>
              <p className="text-lg font-bold text-foreground">{result.alternatives.sizeUp}</p>
              <p className="text-[10px] text-muted-foreground">Size up</p>
            </CardContent>
          </Card>
        </div>

        {/* Why line */}
        {result.whyLine && (
          <Card className="rounded-2xl mb-4">
            <CardContent className="p-3">
              <p className="text-sm text-foreground/70">{result.whyLine}</p>
            </CardContent>
          </Card>
        )}

        {/* Unit toggle + measurements */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-foreground">Measurement Estimates</p>
          <div className="flex items-center gap-2 text-xs">
            <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
            <Switch checked={!useCm} onCheckedChange={v => setUseCm(!v)} />
            <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>in</span>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-sm text-muted-foreground mb-3"
        >
          <span>{showDetails ? 'Hide ranges' : 'Show measurement ranges'}</span>
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="grid grid-cols-2 gap-3 mb-4"
          >
            {measurementKeys.map((key, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="rounded-2xl">
                  <CardContent className="p-3">
                    <p className="text-[10px] font-semibold text-foreground/70 mb-1">{MEASUREMENT_LABELS[key]}</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatRange(result[key])}
                      <span className="text-xs font-normal text-muted-foreground ml-1">{unitLabel}</span>
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            <Card className="rounded-2xl">
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-foreground/70 mb-1">Height</p>
                <p className="text-lg font-bold text-foreground">
                  {useCm ? result.heightCm.toFixed(0) : (result.heightCm * CM_TO_IN).toFixed(1)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{unitLabel}</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <div className="space-y-3 mt-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl"
              onClick={handleShare}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl"
              onClick={handleSave}
              disabled={saved}
            >
              {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              {saved ? 'Saved' : 'Save Body Profile'}
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl"
            onClick={() => navigate('/tryon', { state: { bodyProfile: result } })}
          >
            <Shirt className="mr-2 h-4 w-4" /> Use for Try-On
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => navigate('/capture')}
          >
            Scan Again
          </Button>
          <Button
            variant="ghost"
            className="w-full text-destructive/60 hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete Photos
          </Button>
          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" /> Private by default • delete anytime
          </p>
        </div>
      </div>
    </div>
  );
};

export default Results;
