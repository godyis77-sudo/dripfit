import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Crown, Trash2, Shield, Download, Ruler, Camera, ChevronRight, Bookmark } from 'lucide-react';
import type { FitPreference, BodyScanResult } from '@/lib/types';
import { SUPPORTED_RETAILERS } from '@/lib/types';
import { trackEvent } from '@/lib/analytics';

const SectionHeader = forwardRef<HTMLParagraphElement, { children: React.ReactNode }>(
  ({ children }, ref) => (
    <p ref={ref} className="section-label mb-2 mt-4 first:mt-0">{children}</p>
  )
);
SectionHeader.displayName = 'SectionHeader';

interface SettingsTabProps {
  user: { email?: string };
  displayName: string;
  avatarUrl: string | null;
  savedProfile: BodyScanResult | null;
  fit: FitPreference;
  useCm: boolean;
  savedItemCount: number;
  onFitChange: (f: FitPreference) => void;
  onUnitToggle: (v: boolean) => void;
  onExport: () => void;
  onDeletePhotos: () => void;
  onDeleteAccount: () => void;
  onAvatarTap: () => void;
}

const SettingsTab = ({
  user, displayName, avatarUrl, savedProfile, fit, useCm, savedItemCount,
  onFitChange, onUnitToggle, onExport, onDeletePhotos, onDeleteAccount, onAvatarTap,
}: SettingsTabProps) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Fit Identity Card */}
      {savedProfile ? (
        <div className="bg-card border border-border rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-7 w-7 rounded-lg gradient-drip flex items-center justify-center">
              <Ruler className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <p className="text-[13px] font-bold text-foreground">Fit Identity</p>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Fit', value: fit, cls: 'capitalize' },
              { label: 'Size', value: savedProfile.recommendedSize },
              { label: 'Unit', value: useCm ? 'cm' : 'in' },
              { label: 'Confidence', value: savedProfile.confidence, cls: 'capitalize' },
            ].map(d => (
              <div key={d.label} className="bg-background rounded-lg py-1.5 text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{d.label}</p>
                <p className={`text-[12px] font-bold text-foreground ${d.cls || ''}`}>{d.value}</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-2">
            Last scan: {new Date(savedProfile.date).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 text-center">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Ruler className="h-5 w-5 text-primary/50" />
          </div>
          <p className="text-[13px] font-bold text-foreground mb-0.5">No fit profile yet</p>
          <p className="text-[10px] text-muted-foreground mb-3 max-w-[220px] mx-auto">
            Complete a quick Scan to get accurate size recommendations across all retailers.
          </p>
          <Button className="rounded-lg btn-luxury text-primary-foreground text-[11px] h-9 px-4 font-bold" onClick={() => navigate('/capture')}>
            <Camera className="mr-1.5 h-3.5 w-3.5" /> Start Scan
          </Button>
        </div>
      )}

      {/* Account */}
      <SectionHeader>Account</SectionHeader>
      <div className="bg-card border border-border rounded-xl divide-y divide-border mb-1">
        <button onClick={onAvatarTap} className="w-full flex items-center justify-between px-3 py-2.5 active:bg-muted/50 transition-colors">
          <span className="text-[12px] text-foreground">Profile Photo</span>
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <div className="h-6 w-6 rounded-full gradient-drip flex items-center justify-center">
                <span className="text-[8px] font-bold text-primary-foreground">{displayName[0]?.toUpperCase() || 'U'}</span>
              </div>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </button>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-[12px] text-foreground">Email</span>
          <span className="text-[11px] text-muted-foreground">{user.email}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-[12px] text-foreground">Display name</span>
          <span className="text-[11px] text-muted-foreground">{displayName}</span>
        </div>
      </div>

      {/* Fit Preferences */}
      <SectionHeader>Fit Preferences</SectionHeader>
      <div className="bg-card border border-border rounded-xl divide-y divide-border mb-1">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-[12px] text-foreground font-medium">Default unit</span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
            <Switch checked={!useCm} onCheckedChange={v => onUnitToggle(v)} className="scale-[0.75]" />
            <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>in</span>
          </div>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[12px] text-foreground font-medium mb-1.5">Default fit</p>
          <div className="flex gap-1.5">
            {(['fitted', 'regular', 'relaxed'] as FitPreference[]).map(f => (
              <button key={f} onClick={() => onFitChange(f)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all capitalize active:scale-95 ${fit === f ? 'gradient-drip text-primary-foreground' : 'bg-background border border-border text-muted-foreground'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Saved Items */}
      <SectionHeader>Saved Items</SectionHeader>
      <div className="bg-card border border-border rounded-xl mb-1">
        <button onClick={() => navigate('/saved')} className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-muted/50 transition-colors">
          <Bookmark className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] text-foreground font-medium">View Saved for Later</span>
          {savedItemCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{savedItemCount}</span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        </button>
      </div>

      {/* Body Profile */}
      {savedProfile && (
        <>
          <SectionHeader>Body Profile</SectionHeader>
          <div className="bg-card border border-border rounded-xl p-3 mb-1">
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { l: 'Size', v: savedProfile.recommendedSize },
                  { l: 'Confidence', v: savedProfile.confidence },
                  { l: 'Height', v: `${savedProfile.heightCm} cm` },
                ].map(d => (
                  <div key={d.l} className="bg-background rounded-lg py-1.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{d.l}</p>
                    <p className="text-[12px] font-bold text-foreground capitalize">{d.v}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/capture')} className="w-full flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 group active:scale-[0.98] transition-transform">
                <span className="text-[11px] text-muted-foreground">Update body scan</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Premium */}
      <SectionHeader>Premium</SectionHeader>
      <div className="bg-card border border-primary/20 rounded-xl mb-1">
        <button onClick={() => { trackEvent('premium_viewed'); navigate('/premium'); }} className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-primary/5 transition-colors">
          <Crown className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] text-foreground font-medium">Upgrade to Premium</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        </button>
      </div>

      {/* Retailers */}
      <SectionHeader>Supported Retailers</SectionHeader>
      <div className="bg-card border border-border rounded-xl p-3 mb-1">
        <div className="flex flex-wrap gap-1">
          {SUPPORTED_RETAILERS.map(r => (
            <span key={r} className="px-2 py-0.5 rounded-md bg-background border border-border text-[10px] font-semibold text-muted-foreground">{r}</span>
          ))}
        </div>
      </div>

      {/* Privacy & Data */}
      <SectionHeader>Privacy & Data</SectionHeader>
      <div className="bg-card border border-border rounded-xl divide-y divide-border mb-2">
        <button onClick={onExport} className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-muted/50 transition-colors">
          <Download className="h-3.5 w-3.5 text-foreground/60" />
          <span className="text-[12px] text-foreground">Export my data</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        </button>
      </div>

      {/* Destructive */}
      <div className="bg-card border border-destructive/10 rounded-xl divide-y divide-border mt-2 mb-3">
        <button onClick={onDeletePhotos} className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-destructive/5 transition-colors">
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground">Delete photos & scans</span>
        </button>
        <button onClick={onDeleteAccount} className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-destructive/5 transition-colors">
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground">Delete account</span>
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1 pb-2">
        <Shield className="h-3 w-3" /> Private by default · delete anytime
      </p>
    </>
  );
};

export default SettingsTab;
