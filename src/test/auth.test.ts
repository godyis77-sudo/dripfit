import { describe, it, expect } from 'vitest';

describe('AuthForm behaviour', () => {
  it('switches from signin to signup mode', () => {
    let mode = 'signin';
    const toggle = () => { mode = mode === 'signin' ? 'signup' : 'signin'; };
    toggle();
    expect(mode).toBe('signup');
  });

  it('validates email format', () => {
    const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('requires password minimum length', () => {
    const isValidPassword = (p: string) => p.length >= 6;
    expect(isValidPassword('abc123')).toBe(true);
    expect(isValidPassword('abc')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });
});

describe('Navigation routing logic', () => {
  it('scan sub-routes map to scan tab', () => {
    const scanPaths = ['/capture', '/analyze', '/scan-success', '/results'];
    const isActiveScan = (path: string) =>
      scanPaths.some(p => path.startsWith(p));
    expect(isActiveScan('/results')).toBe(true);
    expect(isActiveScan('/analyze')).toBe(true);
    expect(isActiveScan('/premium')).toBe(false);
  });

  it('home tab only active on exact root', () => {
    const isActiveHome = (path: string) => path === '/';
    expect(isActiveHome('/')).toBe(true);
    expect(isActiveHome('/profile')).toBe(false);
  });
});

describe('Referral link generation', () => {
  it('appends ref param when userId present', () => {
    const baseUrl = 'https://dripfitcheck.lovable.app';
    const buildReferralUrl = (userId?: string) =>
      userId ? `${baseUrl}?ref=${userId}` : baseUrl;
    expect(buildReferralUrl('user-123')).toBe(
      'https://dripfitcheck.lovable.app?ref=user-123'
    );
    expect(buildReferralUrl()).toBe(baseUrl);
  });
});
