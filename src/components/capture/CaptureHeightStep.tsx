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
  <motion.div key="height" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm pt-4">
    <h2 className="text-xl font-bold text-foreground mb-1">What's your height?</h2>
    <p className="text-[12px] text-muted-foreground mb-6">This improves accuracy by 23%</p>

    {/* Gender selector */}
    {genderLoaded && !genderSet && (
      <div className="mb-6">
        <p className="text-[13px] font-bold text-foreground mb-2">I typically shop in the…</p>
        <div className="flex gap-1.5">
          {[
            { value: 'male', label: "Men's section" },
            { value: 'female', label: "Women's section" },
            { value: 'non-binary', label: 'Both' },
          ].map(g => (
            <button
              key={g.value}
              onClick={() => onGenderSelect(g.value)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                genderSet === g.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    )}

    <div className="flex items-center justify-between mb-3">
      <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
        <Ruler className="h-3.5 w-3.5 text-primary" /> Height
      </p>
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>ft/in</span>
        <Switch checked={useCm} onCheckedChange={onUseCmChange} className="scale-[0.8]" />
        <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
      </div>
    </div>

    {useCm ? (
      <Input
        type="number" placeholder="e.g. 175" value={heightCm}
        onChange={e => onHeightCmChange(e.target.value)}
        className={`rounded-xl h-14 text-lg text-center font-bold ${heightTouched && !heightValid ? 'field-error' : ''}`}
        min={120} max={230}
      />
    ) : (
      <div className="flex gap-2">
        <Input
          type="number" placeholder="ft" value={heightFt}
          onChange={e => onHeightFtChange(e.target.value)}
          className={`rounded-xl flex-1 h-14 text-lg text-center font-bold ${heightTouched && !heightValid ? 'field-error' : ''}`}
          min={4} max={7}
        />
        <Input
          type="number" placeholder="in" value={heightIn}
          onChange={e => onHeightInChange(e.target.value)}
          className={`rounded-xl flex-1 h-14 text-lg text-center font-bold ${heightTouched && !heightValid ? 'field-error' : ''}`}
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
        <AccordionItem value="ref" className="border border-border rounded-xl px-3">
          <AccordionTrigger className="text-[12px] font-bold text-foreground py-2.5 hover:no-underline">
            <span className="flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5 text-primary" />
              Reference object <span className="text-muted-foreground font-normal">(optional)</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-[11px] text-muted-foreground mb-2">
              Place a known-size object near you for better calibration.
            </p>
            <div className="grid grid-cols-3 gap-1.5 pb-2">
              {(Object.entries(REFERENCE_OBJECTS) as [ReferenceObject, { label: string; description: string }][])
                .filter(([key]) => key !== 'none')
                .map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => onRefObjectChange(refObject === key ? 'none' : key)}
                    className={`text-center p-2 rounded-xl border transition-all active:scale-95 min-h-[44px] ${
                      refObject === key ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <p className="font-bold text-[10px] text-foreground">{val.label}</p>
                    <p className="text-[9px] text-muted-foreground">{val.description}</p>
                  </button>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>

    {/* Privacy tip card */}
    <div className="mt-4 rounded-xl p-4 bg-card border border-border/40">
      <div className="flex items-start gap-2.5">
        <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Your height improves scan accuracy by 23%. We never store or share this data.
        </p>
      </div>
    </div>
  </motion.div>
);

export default CaptureHeightStep;
