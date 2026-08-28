import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { useTheme } from '../../hooks/useTheme';
import { Moon, Sun, Monitor } from 'lucide-react';
import { clsx } from 'clsx';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode, setMode, isDark } = useTheme();

  // Close drawer on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Skip link a11y */}
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-250 ease-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-display font-bold text-ink text-sm">AssurZen</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme cycle: system → light → dark */}
            <button
              type="button"
              onClick={() => {
                const order: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
                const idx = order.indexOf(mode);
                setMode(order[(idx + 1) % order.length]);
              }}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
              aria-label={
                mode === 'system'
                  ? 'Thème système'
                  : mode === 'light'
                  ? 'Thème clair'
                  : 'Thème sombre'
              }
              title={
                mode === 'system'
                  ? 'Système'
                  : mode === 'light'
                  ? 'Clair'
                  : 'Sombre'
              }
            >
              {mode === 'system' ? (
                <Monitor size={18} />
              ) : isDark ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} />
              )}
            </button>
            <div className="text-ink">
              <NotificationBell variant="light" />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto scrollbar-thin" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
