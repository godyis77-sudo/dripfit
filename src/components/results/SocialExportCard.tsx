import { forwardRef } from 'react';
import BodyDiagram from '@/components/results/BodyDiagram';
import type { MeasurementRange } from '@/lib/types';

interface SocialExportCardProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
  recommendedSize: string;
  memberNumber?: number;
}

/**
 * Hidden 1080×1920 card rendered off-screen for html-to-image export.
 * Reuses the BodyDiagram HUD with founding-member branding.
 */
const SocialExportCard = forwardRef<HTMLDivElement, SocialExportCardProps>(
  ({ measurements, heightCm, recommendedSize, memberNumber }, ref) => {
    const memberTag = memberNumber
      ? `#${String(memberNumber).padStart(3, '0')}`
      : '#—';

    return (
      <div
        ref={ref}
        aria-hidden="true"
        style={{
          width: 1080,
          height: 1920,
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: -1,
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, #0A0A0A 0%, #111111 40%, #0D0D0D 100%)',
          fontFamily: "'Inter', sans-serif",
          color: '#FAFAFA',
        }}
      >
        {/* ── Accuracy Badge (top) ── */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 36px',
              borderRadius: 999,
              border: '1px solid rgba(212, 175, 55, 0.4)',
              background: 'rgba(212, 175, 55, 0.08)',
              boxShadow: '0 0 40px 8px rgba(212, 175, 55, 0.15), inset 0 0 20px rgba(212, 175, 55, 0.06)',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#4ADE80',
                boxShadow: '0 0 8px 2px rgba(74, 222, 128, 0.6)',
              }}
            />
            <span
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: 3,
                background: 'linear-gradient(135deg, #D4AF37, #F5D780, #D4AF37)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              99.8% MEASUREMENT ACCURACY
            </span>
          </div>
        </div>

        {/* ── Size badge ── */}
        <div
          style={{
            position: 'absolute',
            top: 170,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '10px 28px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 2 }}>
              RECOMMENDED
            </span>
            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1 }}>
              {recommendedSize}
            </span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
              {memberTag}
            </span>
          </div>
        </div>

        {/* ── BodyDiagram HUD (center) ── */}
        <div
          style={{
            position: 'absolute',
            top: 250,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div style={{ width: 810, height: 1300 }}>
            {/* Scale the diagram to fill the export card */}
            <div
              style={{
                width: 810,
                height: 1300,
                transformOrigin: 'top left',
              }}
            >
              <div style={{ transform: 'scale(2.08)', transformOrigin: 'top left', width: 390, height: 625 }}>
                <BodyDiagram measurements={measurements} heightCm={heightCm} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom branding ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 320,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            zIndex: 20,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.9) 40%)',
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              letterSpacing: 12,
              background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F5D780, #D4AF37, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            DRIPFIT
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 8,
              color: 'rgba(212, 175, 55, 0.7)',
              borderTop: '1px solid rgba(212, 175, 55, 0.25)',
              paddingTop: 12,
            }}
          >
            FOUNDING 100
          </div>
          <div
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: 2,
              marginTop: 8,
            }}
          >
            dripfitcheck.lovable.app
          </div>
        </div>

        {/* ── Subtle corner accents ── */}
        {[
          { top: 30, left: 30 },
          { top: 30, right: 30 },
          { bottom: 340, left: 30 },
          { bottom: 340, right: 30 },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...pos,
              width: 50,
              height: 50,
              zIndex: 15,
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

SocialExportCard.displayName = 'SocialExportCard';
export default SocialExportCard;
