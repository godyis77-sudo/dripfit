import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Camera, Ruler, Sparkles, CircleDollarSign, Banknote, Check, Shirt, Users, LogIn, LogOut } from 'lucide-react';
import { CalibrationObject, CALIBRATION_OBJECTS } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

const steps = [
  { icon: Ruler, label: 'Hold a reference object visible in frame' },
  { icon: Camera, label: 'Take 3 guided photos' },
  { icon: Sparkles, label: 'Get instant measurements' },
];

const objectIcons: Record<CalibrationObject, typeof Ruler> = {
  ruler: Ruler,
  loonie: CircleDollarSign,
  quarter: CircleDollarSign,
  five_dollar_bill: Banknote,
};

const Welcome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [selectedObject, setSelectedObject] = useState<CalibrationObject>('ruler');

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background px-6 py-12">
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
            <Ruler className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
            DripCheck
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Check your drip before you buy. AI-powered body measurements & virtual try-on — no tape measure needed.
          </p>
        </motion.div>

        {/* Calibration object selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full mb-6"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Reference object</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(CALIBRATION_OBJECTS) as [CalibrationObject, typeof CALIBRATION_OBJECTS[CalibrationObject]][]).map(([key, obj]) => {
              const Icon = objectIcons[key];
              const isSelected = selectedObject === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedObject(key)}
                  className={`flex items-center gap-3 rounded-2xl p-3 border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{obj.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{obj.description}</p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-full space-y-4 mb-12"
        >
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
              className="flex items-center gap-4 rounded-2xl bg-card p-4 border border-border"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{step.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-2xl bg-accent/10 border border-accent/20 p-4 mb-8 w-full"
        >
          <p className="text-xs text-accent-foreground/70 leading-relaxed">
            <strong className="text-accent">Tips for best results:</strong> Wear fitted clothing, use good lighting, stand against a plain background, and keep the ruler clearly visible in every photo.
          </p>
        </motion.div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Button
          onClick={() => navigate('/capture', { state: { calibrationObject: selectedObject } })}
          className="w-full h-14 text-base font-semibold rounded-2xl"
          size="lg"
        >
          Start Measuring
        </Button>
        <Button
          onClick={() => navigate('/tryon')}
          variant="outline"
          className="w-full h-12 rounded-2xl"
        >
          <Shirt className="mr-2 h-5 w-5" /> Virtual Try-On
        </Button>
        <Button
          onClick={() => navigate('/community')}
          variant="outline"
          className="w-full h-12 rounded-2xl"
        >
          <Users className="mr-2 h-5 w-5" /> Community Looks
        </Button>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/history')}
            variant="ghost"
            className="flex-1 text-muted-foreground"
          >
            View History
          </Button>
          {user ? (
            <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          ) : (
            <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={() => navigate('/auth')}>
              <LogIn className="mr-2 h-4 w-4" /> Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
