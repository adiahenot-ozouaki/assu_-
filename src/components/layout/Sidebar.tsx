import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Users, FileText, AlertTriangle,
  CreditCard, Settings, LogOut, ChevronRight, Shield, BarChart2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NotificationBell } from './NotificationBell';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/clients',    label: 'Clients',          icon: Users           },
  { to: '/contrats',   label: 'Contrats',         icon: FileText        },
  { to: '/sinistres',  label: 'Sinistres',        icon: AlertTriangle   },
  { to: '/quittances', label: 'Paiements',        icon: CreditCard      },
  { to: '/reporting',  label: 'Reporting',        icon: BarChart2       },
  { to: '/parametres', label: 'Paramètres',       icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-[#0A1628] text-white">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00C875] flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">AssurZen</span>
          </div>
          <NotificationBell />
        </div>
        <p className="text-xs text-white/40 mt-1 ml-10">ERP Assurance</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group',
              isActive
                ? 'bg-[#00C875]/15 text-[#00C875] font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-[#00C875]' : 'text-white/40 group-hover:text-white/70'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={13} className="text-[#00C875]/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profil + déconnexion */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00C875] to-[#00A35E] flex items-center justify-center text-xs font-bold shrink-0">
            {profile ? `${profile.prenom[0]}${profile.nom[0]}` : '??'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {profile ? `${profile.prenom} ${profile.nom}` : '…'}
            </p>
            <p className="text-xs text-white/40 capitalize">{profile?.role ?? '…'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
