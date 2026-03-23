import { motion } from 'framer-motion';
import BrandLogo from '@/components/ui/BrandLogo';
import { usePageMeta } from '@/hooks/usePageMeta';

const links = [
  {
    label: 'Join the Waitlist (Free Early Access)',
    href: '/waitlist',
    style: 'primary' as const,
  },
  {
    label: 'Apply: Founding 50 Discord',
    href: '/founding-members',
    style: 'outline' as const,
  },
  {
    label: 'Creator Affiliate Program',
    href: '/partnership',
    style: 'matte' as const,
  },
  {
    label: 'Visit Main Website',
    href: '/',
    style: 'matte' as const,
  },
];

const socials = [
  {
    name: 'Instagram',
    href: 'https://instagram.com/dripfitcheck',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: 'https://tiktok.com/@dripfitcheck',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.12V9.01a6.37 6.37 0 00-.82-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.28 8.28 0 004.76 1.5V7.1a4.83 4.83 0 01-1-.41z" />
      </svg>
    ),
  },
  {
    name: 'X',
    href: 'https://x.com/dripfitcheck',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

const LinkHub = () => {
  usePageMeta({ title: 'Links', description: 'All DripFit links in one place — waitlist, Discord, Instagram, and more.', path: '/links' });

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md flex flex-col items-center">

        {/* ── Header ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-10"
        >
          <BrandLogo size="xl" />
          <p className="text-[13px] text-muted-foreground mt-3 tracking-wide">
            The smarter way to shop fashion.
          </p>
        </motion.div>

        {/* ── Button Stack ────────────────────── */}
        <div className="w-full space-y-3">
          {links.map((link, i) => (
            <motion.a
              key={link.label}
              href={link.href}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
              className={`
                block w-full text-center rounded-xl py-3.5 text-[13px] font-bold tracking-wide transition-all active:scale-[0.97]
                ${link.style === 'primary'
                  ? 'btn-luxury text-primary-foreground shadow-[0_4px_20px_hsl(42_76%_42%/0.3)]'
                  : link.style === 'outline'
                    ? 'bg-transparent border-2 border-primary/50 text-primary hover:bg-primary/10'
                    : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border'
                }
              `}
            >
              {link.label}
            </motion.a>
          ))}
        </div>

        {/* ── Social Footer ───────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex items-center gap-5 mt-12"
        >
          {socials.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              className="text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {s.icon}
            </a>
          ))}
        </motion.div>

        <p className="text-[10px] text-muted-foreground/40 mt-6">
          © {new Date().getFullYear()} DripFit Check
        </p>
      </div>
    </div>
  );
};

export default LinkHub;
