// src/components/PageShell.tsx
//
// The standard page frame: dark green hero with the FolliSense eyebrow, then a
// contained body. Every page should use this instead of hand-rolling its own
// hero and padding, so headings line up and breakpoints stay in one place.
//
// All layout lives in src/styles/layout.css. Nothing here sets widths.
//
// Usage:
//   <PageShell title="Learn" subtitle="Scalp and hair health explained">
//     ...page content...
//   </PageShell>

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageShellProps {
  title: string;
  subtitle?: string;
  /** Optional content pinned to the right of the title on wide screens,
   *  e.g. the tab switcher on the Progress page. */
  heroRight?: ReactNode;
  /** 'browse' (default) is the wide 1080px container for content and card
   *  grids. 'form' is the narrow 560px column for linear flows: check-in,
   *  onboarding, baseline capture, profile edit. */
  variant?: 'browse' | 'form';
  children: ReactNode;
}

const PageShell = ({ title, subtitle, heroRight, variant = 'browse', children }: PageShellProps) => {
  const isForm = variant === 'form';
  const shell = isForm ? 'fs-form-shell' : 'fs-shell';

  return (
    <div className={`fs-page${isForm ? ' fs-page-form' : ''}`}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <header className="fs-hero">
          <span className="fs-hero-glow-a" aria-hidden="true" />
          <span className="fs-hero-glow-b" aria-hidden="true" />
          <div className={`${shell} fs-hero-inner`}>
            <div className="fs-hero-eyebrow">
              <span className="fs-hero-dot" aria-hidden="true" />
              <span className="fs-hero-brand">FolliSense</span>
            </div>

            {heroRight ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h1 className="fs-hero-title">{title}</h1>
                  {subtitle && <p className="fs-hero-sub">{subtitle}</p>}
                </div>
                {heroRight}
              </div>
            ) : (
              <>
                <h1 className="fs-hero-title">{title}</h1>
                {subtitle && <p className="fs-hero-sub">{subtitle}</p>}
              </>
            )}
          </div>
        </header>

        <div className={`${shell} fs-body`}>
          {isForm ? <div className="fs-form-card">{children}</div> : children}
        </div>
      </motion.div>
    </div>
  );
};

export default PageShell;