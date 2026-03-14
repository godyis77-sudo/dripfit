import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Ruler, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CALIBRATION_BRANDS } from '@/lib/types';

interface LowConfidenceRescueProps { onCalibrate: (data: { type: 'waist'; value: number } | { type: 'brand'; brand: string; size: string }) => void; }

const QUICK_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const LowConfidenceRescue = ({ onCalibrate }: LowConfidenceRescueProps) => {
  const [mode, setMode] = useState<'pick' | 'waist' | 'brand'>('pick');
  const [waistValue, setWaistValue] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-bold text-foreground">Improve accuracy</p>
          <p className="text-[10px] text-muted-foreground">One quick input to boost confidence.</p>
        </div>
      </div>

      {mode === 'pick' && (
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] rounded-lg" onClick={() => setMode('waist')}>
            <Ruler className="mr-1 h-3 w-3" /> Waist
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] rounded-lg" onClick={() => setMode('brand')}>
            <Tag className="mr-1 h-3 w-3" /> Brand size
          </Button>
        </div>
      )}

      {mode === 'waist' && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <Input type="number" placeholder="Waist cm" value={waistValue} onChange={e => setWaistValue(e.target.value)} className="h-8 text-[13px] rounded-lg" />
            <Button size="sm" className="h-8 rounded-lg px-3 btn-gold-3d text-primary-foreground text-[11px]" onClick={() => { const v = parseFloat(waistValue); if (v > 0) onCalibrate({ type: 'waist', value: v }); }}>Apply</Button>
          </div>
          <button onClick={() => setMode('pick')} className="text-[10px] text-muted-foreground underline">Back</button>
        </div>
      )}

      {mode === 'brand' && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {CALIBRATION_BRANDS.map(b => (
              <button key={b} onClick={() => setSelectedBrand(b)} className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${selectedBrand === b ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{b}</button>
            ))}
          </div>
          {selectedBrand && (
            <div className="flex flex-wrap gap-1">
              {QUICK_SIZES.map(s => (
                <button key={s} onClick={() => setSelectedSize(s)} className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${selectedSize === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{s}</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Button size="sm" className="h-8 rounded-lg px-3 btn-gold-3d text-primary-foreground text-[11px]" disabled={!selectedBrand || !selectedSize} onClick={() => { if (selectedBrand && selectedSize) onCalibrate({ type: 'brand', brand: selectedBrand, size: selectedSize }); }}>Apply</Button>
            <button onClick={() => setMode('pick')} className="text-[10px] text-muted-foreground underline">Back</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LowConfidenceRescue;
