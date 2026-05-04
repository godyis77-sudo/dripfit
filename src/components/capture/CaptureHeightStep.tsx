import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { Ruler, AlertTriangle, Lock } from 'lucide-react';
import { ReferenceObject, REFERENCE_OBJECTS } from '@/lib/types';

interface CaptureHeightStepProps {
  heightCm: string;
  heightFt: string;
  heightIn: string;
  useCm: boolean;
  heightValid: boolean;
  heightTouched: boolean;
  refObject: ReferenceObject;
  genderLoaded: boolean;
  genderSet: string | null;
  onHeightCmChange: (v: string) => void;
  onHeightFtChange: (v: string) => void;
  onHeightInChange: (v: string) => void;
  onUseCmChange: (v: boolean) => void;
  onRefObjectChange: (v: ReferenceObject) => void;
  onGenderSelect: (v: string) => void;
}

const CaptureHeightStep = ({
  heightCm, heightFt, heightIn, useCm, heightValid, heightTouched,
  refObject, genderLoaded, genderSet,
  onHeightCmChange, onHeightFtChange, onHeightInChange, onUseCmChange,
  onRefObjectChange, onGenderSelect,
}: CaptureHeightStepProps) => (
  <motion.div key="height" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm pt-1">
    <h2 className="font-display text-xl text-white mb-1 uppercase tracking-wider">Height.</h2>
    <p className="text-[13px] text-white/40 mb-3">Improves mapping accuracy by 23%.</p>

    {/* Gender selector */}
    {genderLoaded && !genderSet && (
      <div className="mb-3">
        <p className="text-[13px] font-semibold text-white mb-1.5">I typically shop in the…</p>
        <div className="flex gap-1.5">
          {[
            { value: 'male', label: "Men's section" },
            { value: 'female', label: "Women's section" },
            { value: 'non-binary', label: 'Both' },
          ].map(g => (
            <button
              key={g.value}
              onClick={() => onGenderSelect(g.value)}
              className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold border transition-all active:scale-95 backdrop-blur-sm ${
                genderSet === g.value
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    )}

    <div className="flex items-center justify-between mb-3">
      <p className="text-[13px] font-semibold text-white flex items-center gap-1.5">
        <Ruler className="h-3.5 w-3.5 text-primary" /> Height
      </p>
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className={!useCm ? 'text-primary font-semibold' : 'text-white/40'}>ft/in</span>
        <Switch checked={useCm} onCheckedChange={onUseCmChange} className="scale-[0.8]" />
        <span className={useCm ? 'text-primary font-semibold' : 'text-white/40'}>cm</span>
      </div>
    </div>

    {useCm ? (
      <Input
        type="number" placeholder="e.g. 175" value={heightCm}
        onChange={e => onHeightCmChange(e.target.value)}
        className={`rounded-xl h-14 text-2xl text-center font-display bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 ${heightTouched && !heightValid ? 'field-error' : ''}`}
        min={120} max={230}
      />
    ) : (
      <div className="flex gap-2">
        <Input
          type="number" placeholder="5" value={heightFt}
          onChange={e => onHeightFtChange(e.target.value)}
          className={`rounded-xl flex-1 h-14 text-2xl text-center font-display bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 ${heightTouched && !heightValid ? 'field-error' : ''}`}
          min={4} max={7}
        />
        <Input
          type="number" placeholder="10" value={heightIn}
          onChange={e => onHeightInChange(e.target.value)}
          className={`rounded-xl flex-1 h-14 text-2xl text-center font-display bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 ${heightTouched && !heightValid ? 'field-error' : ''}`}
          min={0} max={11}
        />
      </div>
    )}

    {heightTouched && !heightValid && (
      <p className="field-error-message flex items-center gap-1 mt-2">
        <AlertTriangle className="h-3 w-3" /> Valid range: 120–230 cm / 4'0"–7'6"
      </p>
    )}

    {/* Reference object */}
    <div className="mt-6">
      <Accordion type="single" collapsible>
        <AccordionItem value="ref" className="bg-primary/8 backdrop-blur-md border border-primary/15 rounded-xl px-3">
          <AccordionTrigger className="text-[12px] font-semibold text-white py-2.5 hover:no-underline">
            <span className="flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5 text-primary" />
              Reference object <span className="text-white/40 font-normal">(optional)</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-[11px] text-white/50 mb-2">
              Place a known-size object near you for better calibration.
            </p>
            <div className="grid grid-cols-3 gap-1.5 pb-2">
              {(Object.entries(REFERENCE_OBJECTS) as [ReferenceObject, { label: string; description: string }][])
                .filter(([key]) => key !== 'none')
                .map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => onRefObjectChange(refObject === key ? 'none' : key)}
                    className={`text-center p-2 rounded-lg border transition-all active:scale-95 min-h-[44px] backdrop-blur-sm ${
                      refObject === key ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <p className="font-semibold text-[10px] text-white/70">{val.label}</p>
                    <p className="text-[11px] text-white/40">{val.description}</p>
                  </button>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>

    {/* Privacy tip card */}
    <div className="mt-4 rounded-xl p-4 bg-black/40 backdrop-blur-md border border-white/8">
      <div className="flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-primary/70 shrink-0 mt-0.5" />
        <p className="text-xs text-white/50">
          Your height improves scan accuracy by 23%. We never store or share this data.
        </p>
      </div>
    </div>
  </motion.div>
);

export default CaptureHeightStep;
