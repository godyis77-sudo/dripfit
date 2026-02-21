import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Ruler, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CALIBRATION_BRANDS } from '@/lib/types';

interface LowConfidenceRescueProps {
  onCalibrate: (data: { type: 'waist'; value: number } | { type: 'brand'; brand: string; size: string }) => void;
}

const QUICK_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const LowConfidenceRescue = ({ onCalibrate }: LowConfidenceRescueProps) => {
  const [mode, setMode] = useState<'pick' | 'waist' | 'brand'>('pick');
  const [waistValue, setWaistValue] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const handleWaistSubmit = () => {
    const v = parseFloat(waistValue);
    if (v > 0) onCalibrate({ type: 'waist', value: v });
  };

  const handleBrandSubmit = () => {
    if (selectedBrand && selectedSize) {
      onCalibrate({ type: 'brand', brand: selectedBrand, size: selectedSize });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-5"
    >
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-foreground">Improve accuracy in 10 seconds</p>
          <p className="text-[11px] text-muted-foreground">Add one quick input to boost your confidence score.</p>
        </div>
      </div>

      {mode === 'pick' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs rounded-xl"
            onClick={() => setMode('waist')}
          >
            <Ruler className="mr-1.5 h-3.5 w-3.5" /> Enter waist
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs rounded-xl"
            onClick={() => setMode('brand')}
          >
            <Tag className="mr-1.5 h-3.5 w-3.5" /> Pick brand size
          </Button>
        </div>
      )}

      {mode === 'waist' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Waist in cm"
              value={waistValue}
              onChange={e => setWaistValue(e.target.value)}
              className="h-9 text-sm rounded-xl"
            />
            <Button size="sm" className="h-9 rounded-xl px-4 gradient-drip text-primary-foreground" onClick={handleWaistSubmit}>
              Apply
            </Button>
          </div>
          <button onClick={() => setMode('pick')} className="text-[11px] text-muted-foreground underline">Back</button>
        </div>
      )}

      {mode === 'brand' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {CALIBRATION_BRANDS.map(b => (
              <button
                key={b}
                onClick={() => setSelectedBrand(b)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  selectedBrand === b
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          {selectedBrand && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    selectedSize === s
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-9 rounded-xl px-4 gradient-drip text-primary-foreground"
              disabled={!selectedBrand || !selectedSize}
              onClick={handleBrandSubmit}
            >
              Apply
            </Button>
            <button onClick={() => setMode('pick')} className="text-[11px] text-muted-foreground underline">Back</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LowConfidenceRescue;
