import { forwardRef } from 'react';
import BodyDiagram from '@/components/results/BodyDiagram';
import type { MeasurementRange } from '@/lib/types';

interface DripCardProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
  recommendedSize: string;
  memberNumber?: number;
  tryOnImageUrl?: string | null;
  brandMatch?: { brand: string; size: string; confidence: number } | null;
  displayName?: string | null;
}

/**
 * Drip Card v2 — Shareable 1080×1920 card with:
 * - AR try-on photo (if available)
 * - Brand match % + size
 * - BodyDiagram HUD
 * - Premium branding
 */
const DripCard = forwardRef<HTMLDivElement, DripCardProps>(
  ({ measurements, heightCm, recommendedSize, memberNumber, tryOnImageUrl, brandMatch, displayName }, ref) => {
    const memberTag = memberNumber ? `#${String(memberNumber).padStart(3, '0')}` : '';
    const hasTryOn = !!tryOnImageUrl;

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          position: 'fixed',
          left: -9999,
          top: 0,
          zIndex: -1,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #0A0A0A 0%, #111111 40%, #0D0D0D 100%)',
          fontFamily: "'Inter', sans-serif",
          color: '#FAFAFA',
        }}
      >
        {/* ── Top bar: Accuracy + Member ── */}
        <div style={{ position: 'absolute', top: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 36px', borderRadius: 999,
            border: '1px solid rgba(212, 175, 55, 0.4)',
            background: 'rgba(212, 175, 55, 0.08)',
            boxShadow: '0 0 40px 8px rgba(212, 175, 55, 0.15)',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px 2px rgba(74, 222, 128, 0.6)' }} />
            <span style={{
              fontSize: 24, fontWeight: 800, letterSpacing: 3,
              background: 'linear-gradient(135deg, #D4AF37, #F5D780, #D4AF37)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              VERIFIED FIT IDENTITY
            </span>
            {memberTag && (
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{memberTag}</span>
            )}
          </div>
        </div>

        {/* ── Size + Brand Match Badge ── */}
        <div style={{ position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20, zIndex: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '10px 28px',
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 2 }}>SIZE</span>
            <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: 1 }}>{recommendedSize}</span>
          </div>
          {brandMatch && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px',
              borderRadius: 12, border: '1px solid rgba(212, 175, 55, 0.3)', background: 'rgba(212, 175, 55, 0.06)',
            }}>
              <span style={{ fontSize: 18, color: 'rgba(212,175,55,0.8)', fontWeight: 700, letterSpacing: 1 }}>
                {brandMatch.brand.toUpperCase()}
              </span>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#D4AF37' }}>{brandMatch.size}</span>
              <span style={{
                fontSize: 16, fontWeight: 700, color: '#4ADE80',
                background: 'rgba(74,222,128,0.12)', padding: '4px 10px', borderRadius: 8,
              }}>
                {Math.round(brandMatch.confidence * 100)}% match
              </span>
            </div>
          )}
        </div>

        {/* ── Main content area ── */}
        {hasTryOn ? (
          /* Split layout: Try-on left, Diagram right */
          <div style={{ position: 'absolute', top: 240, left: 0, right: 0, bottom: 320, display: 'flex', zIndex: 10 }}>
            {/* Try-on photo */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
              <div style={{
                width: 440, height: '100%', maxHeight: 1100, borderRadius: 24,
                overflow: 'hidden', border: '2px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 0 60px rgba(212, 175, 55, 0.15)',
              }}>
                <img
                  src={tryOnImageUrl!}
                  alt="Try-on result"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  crossOrigin="anonymous"
                />
              </div>
            </div>
            {/* Body diagram */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ width: 480, height: 900 }}>
                <div style={{ transform: 'scale(1.23)', transformOrigin: 'top center', width: 390, height: 625 }}>
                  <BodyDiagram measurements={measurements} heightCm={heightCm} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Full-width diagram (no try-on photo) */
          <div style={{ position: 'absolute', top: 240, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ width: 810, height: 1300 }}>
              <div style={{ transform: 'scale(2.08)', transformOrigin: 'top left', width: 390, height: 625 }}>
                <BodyDiagram measurements={measurements} heightCm={heightCm} />
              </div>
            </div>
          </div>
        )}

        {/* ── Display name ── */}
        {displayName && (
          <div style={{
            position: 'absolute', bottom: 340, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', zIndex: 20,
          }}>
            <span style={{
              fontSize: 24, fontWeight: 700, letterSpacing: 4, color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
            }}>
              @{displayName}
            </span>
          </div>
        )}

        {/* ── Bottom branding ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 320,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 20,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.9) 40%)',
        }}>
          <div style={{
            fontSize: 52, fontWeight: 900, letterSpacing: 12,
            background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F5D780, #D4AF37, #B8860B)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            DRIPFIT
          </div>
          <div style={{
            fontSize: 18, fontWeight: 600, letterSpacing: 6, color: 'rgba(255,255,255,0.4)',
            borderTop: '1px solid rgba(212, 175, 55, 0.25)', paddingTop: 12,
          }}>
            YOUR SIZE. VERIFIED.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginTop: 4 }}>
            dripfitcheck.lovable.app
          </div>
        </div>

        {/* Corner accents */}
        {[
          { top: 30, left: 30 },
          { top: 30, right: 30 },
          { bottom: 340, left: 30 },
          { bottom: 340, right: 30 },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', ...pos, width: 50, height: 50, zIndex: 15,
              borderTop: i < 2 ? '2px solid rgba(212, 175, 55, 0.3)' : undefined,
              borderBottom: i >= 2 ? '2px solid rgba(212, 175, 55, 0.3)' : undefined,
              borderLeft: i % 2 === 0 ? '2px solid rgba(212, 175, 55, 0.3)' : undefined,
              borderRight: i % 2 !== 0 ? '2px solid rgba(212, 175, 55, 0.3)' : undefined,
            } as React.CSSProperties}
          />
        ))}
      </div>
    );
  }
);

DripCard.displayName = 'DripCard';
export default DripCard;
