import { useEffect, useState, useCallback } from 'react';
import {
  Users, Building2, Package, Plus, Edit2,
  ToggleLeft, ToggleRight, Trash2, Send, Check, X, Shield,
} from 'lucide-react';
import {
  getUsers, updateUser, toggleUserActif,
  getInvitations, createInvitation, deleteInvitation,
  getAgences, createAgence, updateAgence, toggleAgenceActif,
  getAllProduits, createProduit, updateProduit, toggleProduitActif,
  type Agence, type Invitation,
} from '../lib/settings.service';
import type { Profile, Produit, BranchType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Button, Card, Input, Select, Spinner, Badge } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/supabase';
import { clsx } from 'clsx';

// ── Constants ──────────────────────────────────────────────────
const ROLE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  admin:    { label: 'Admin',    color: 'text-purple-700', bg: 'bg-purple-50' },
  agent:    { label: 'Agent',    color: 'text-blue-700',   bg: 'bg-blue-50'   },
  courtier: { label: 'Courtier', color: 'text-amber-700',  bg: 'bg-amber-50'  },
};

const BRANCH_CFG: Record<BranchType, { label: string; icon: string }> = {
  auto:  { label: 'Auto',       icon: '🚗' },
  mrh:   { label: 'Habitation', icon: '🏠' },
  sante: { label: 'Santé',      icon: '🏥' },
  vie:   { label: 'Vie',        icon: '❤️' },
  autre: { label: 'Autre',      icon: '📋' },
};

type Tab = 'utilisateurs' | 'agences' | 'produits';

// ── Inline edit input ──────────────────────────────────────────

// ── Role chip ──────────────────────────────────────────────────
function RoleChip({ role }: { role: string }) {
  const cfg = ROLE_CFG[role] ?? { label: role, color: 'text-gray-600', bg: 'bg-gray-50' };
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold', cfg.bg, cfg.color)}>
      <Shield size={10} /> {cfg.label}
    </span>
  );
}

// ── Toggle switch ──────────────────────────────────────────────
function Toggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!active)}
      className={clsx('transition-colors', active ? 'text-[#00C875]' : 'text-gray-300')}>
      {active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
    </button>
  );
}

// ── Section header ─────────────────────────────────────────────
function SectionHeader({ title, count, action }: {
  title: string; count?: number; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {count !== undefined && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function ParametresPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('utilisateurs');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'utilisateurs', label: 'Utilisateurs', icon: <Users size={15} /> },
    { id: 'agences',      label: 'Agences',      icon: <Building2 size={15} /> },
    { id: 'produits',     label: 'Produits',     icon: <Package size={15} /> },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestion de l'organisation AssurZen</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'utilisateurs' && <UsersTab isAdmin={isAdmin} />}
      {tab === 'agences'      && <AgencesTab isAdmin={isAdmin} />}
      {tab === 'produits'     && <ProduitsTab isAdmin={isAdmin} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB : UTILISATEURS
// ─────────────────────────────────────────────────────────────
function UsersTab({ isAdmin }: { isAdmin: boolean }) {
  const [users, setUsers]           = useState<Profile[]>([]);
  const [invites, setInvites]       = useState<Invitation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState('agent');
  const [inviting, setInviting]       = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editData, setEditData]       = useState<Partial<Profile>>({});
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    const [u, i] = await Promise.all([getUsers(), getInvitations()]);
    setUsers(u); setInvites(i); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (u: Profile) => {
    await toggleUserActif(u.id, !u.actif);
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, actif: !u.actif } : x));
  };

  const handleStartEdit = (u: Profile) => {
    setEditingId(u.id);
    setEditData({ nom: u.nom, prenom: u.prenom, telephone: u.telephone, role: u.role, agence: u.agence });
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    try {
      const updated = await updateUser(id, editData);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const inv = await createInvitation({ email: inviteEmail, role: inviteRole });
      setInvites(prev => [inv, ...prev]);
      setInviteSuccess(`Invitation créée pour ${inviteEmail} (token: ${inv.token?.slice(0, 8)}…)`);
      setInviteEmail(''); setShowInvite(false);
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    await deleteInvitation(id);
    setInvites(prev => prev.filter(i => i.id !== id));
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-[#00C875]" /></div>;

  return (
    <div className="space-y-6">
      {/* Utilisateurs actifs */}
      <div>
        <SectionHeader
          title="Membres de l'équipe"
          count={users.length}
          action={isAdmin && (
            <Button size="sm" onClick={() => setShowInvite(true)}>
              <Plus size={14} /> Inviter un utilisateur
            </Button>
          )}
        />

        {/* Formulaire invitation */}
        {showInvite && (
          <Card className="p-4 mb-4 border-2 border-[#00C875]/30 bg-[#00C875]/5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Nouvelle invitation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Email"
                  type="email"
                  placeholder="agent@assurzen.ga"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <Select
                label="Rôle"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                options={[
                  { value: 'agent',    label: 'Agent'    },
                  { value: 'courtier', label: 'Courtier' },
                  { value: 'admin',    label: 'Admin'    },
                ]}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" loading={inviting} onClick={handleInvite}>
                <Send size={13} /> Envoyer l'invitation
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowInvite(false)}>
                Annuler
              </Button>
            </div>
          </Card>
        )}

        {inviteSuccess && (
          <div className="mb-4 text-sm text-[#00A35E] bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span>✅ {inviteSuccess}</span>
            <button onClick={() => setInviteSuccess('')}><X size={14} /></button>
          </div>
        )}

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {['Utilisateur', 'Rôle', 'Agence', 'Téléphone', 'Statut', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#00C875]/15 flex items-center justify-center text-xs font-bold text-[#00A35E] shrink-0">
                        {u.prenom?.[0]}{u.nom[0]}
                      </div>
                      <div>
                        {editingId === u.id ? (
                          <div className="flex gap-1">
                            <input value={editData.prenom ?? ''} onChange={e => setEditData(d => ({...d, prenom: e.target.value}))}
                              className="text-sm border border-gray-200 rounded px-2 py-0.5 w-20 focus:outline-none focus:ring-1 focus:ring-[#00C875]" placeholder="Prénom" />
                            <input value={editData.nom ?? ''} onChange={e => setEditData(d => ({...d, nom: e.target.value}))}
                              className="text-sm border border-gray-200 rounded px-2 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-[#00C875]" placeholder="Nom" />
                          </div>
                        ) : (
                          <p className="font-medium text-gray-900">{u.prenom} {u.nom}</p>
                        )}
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {editingId === u.id ? (
                      <select value={editData.role ?? u.role}
                        onChange={e => setEditData(d => ({...d, role: e.target.value as any}))}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#00C875]">
                        <option value="agent">Agent</option>
                        <option value="courtier">Courtier</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : <RoleChip role={u.role} />}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">
                    {editingId === u.id ? (
                      <input value={editData.agence ?? ''} onChange={e => setEditData(d => ({...d, agence: e.target.value}))}
                        placeholder="Agence" className="text-sm border border-gray-200 rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-[#00C875]" />
                    ) : (u.agence ?? '—')}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">
                    {editingId === u.id ? (
                      <input value={editData.telephone ?? ''} onChange={e => setEditData(d => ({...d, telephone: e.target.value}))}
                        placeholder="+241 …" className="text-sm border border-gray-200 rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-[#00C875]" />
                    ) : (u.telephone ?? '—')}
                  </td>
                  <td className="px-4 py-3.5">
                    {isAdmin ? (
                      <Toggle active={u.actif} onChange={() => handleToggle(u)} />
                    ) : (
                      <Badge variant={u.actif ? 'green' : 'gray'} dot>{u.actif ? 'Actif' : 'Inactif'}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {isAdmin && (
                      editingId === u.id ? (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleSaveEdit(u.id)} disabled={saving}
                            className="text-[#00C875] hover:text-[#00A35E] p-1"><Check size={15} /></button>
                          <button onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:text-gray-600 p-1"><X size={15} /></button>
                        </div>
                      ) : (
                        <button onClick={() => handleStartEdit(u)}
                          className="text-gray-300 hover:text-gray-600 p-1 transition-colors"><Edit2 size={14} /></button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Invitations en attente */}
      {invites.length > 0 && (
        <div>
          <SectionHeader title="Invitations en attente" count={invites.length} />
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {['Email', 'Rôle', 'Expire le', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invites.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{inv.email}</td>
                    <td className="px-4 py-3"><RoleChip role={inv.role} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(inv.expire_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteInvite(inv.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors p-1"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB : AGENCES
// ─────────────────────────────────────────────────────────────
function AgencesTab({ isAdmin }: { isAdmin: boolean }) {
  const [agences, setAgences]   = useState<Agence[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState({ code: '', nom: '', ville: '', adresse: '', telephone: '', email: '' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    const data = await getAgences();
    setAgences(data); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (editId) {
        const updated = await updateAgence(editId, form);
        setAgences(prev => prev.map(a => a.id === editId ? { ...a, ...updated } : a));
      } else {
        const created = await createAgence({ ...form, actif: true });
        setAgences(prev => [created, ...prev]);
      }
      setShowForm(false); setEditId(null);
      setForm({ code: '', nom: '', ville: '', adresse: '', telephone: '', email: '' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: Agence) => {
    setEditId(a.id);
    setForm({ code: a.code, nom: a.nom, ville: a.ville, adresse: a.adresse ?? '', telephone: a.telephone ?? '', email: a.email ?? '' });
    setShowForm(true);
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-[#00C875]" /></div>;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Agences"
        count={agences.length}
        action={isAdmin && (
          <Button size="sm" onClick={() => { setEditId(null); setForm({ code:'',nom:'',ville:'',adresse:'',telephone:'',email:'' }); setShowForm(true); }}>
            <Plus size={14} /> Nouvelle agence
          </Button>
        )}
      />

      {showForm && (
        <Card className="p-5 border-2 border-[#00C875]/30 bg-[#00C875]/5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {editId ? 'Modifier l\'agence' : 'Nouvelle agence'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Code *" placeholder="LBV-01" value={form.code}
              onChange={e => setForm(f => ({...f, code: e.target.value}))} />
            <Input label="Nom *" placeholder="Agence Libreville Centre" value={form.nom}
              onChange={e => setForm(f => ({...f, nom: e.target.value}))} />
            <Input label="Ville *" placeholder="Libreville" value={form.ville}
              onChange={e => setForm(f => ({...f, ville: e.target.value}))} />
            <Input label="Adresse" placeholder="Boulevard Triomphal..." value={form.adresse}
              onChange={e => setForm(f => ({...f, adresse: e.target.value}))} />
            <Input label="Téléphone" placeholder="+241 01 72 00 00" value={form.telephone}
              onChange={e => setForm(f => ({...f, telephone: e.target.value}))} />
            <Input label="Email" type="email" placeholder="agence@assurzen.ga" value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))} />
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <Button size="sm" loading={saving} onClick={handleSave}>
              <Check size={13} /> {editId ? 'Enregistrer' : 'Créer l\'agence'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
              Annuler
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {agences.map(a => (
          <Card key={a.id} className={clsx('p-5', !a.actif && 'opacity-60')}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{a.code}</span>
                  {!a.actif && <span className="text-xs text-gray-400 italic">Inactive</span>}
                </div>
                <h3 className="font-semibold text-gray-900 mt-1">{a.nom}</h3>
                <p className="text-sm text-gray-500">📍 {a.ville}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(a)}
                    className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors"><Edit2 size={14} /></button>
                  <Toggle active={a.actif} onChange={v => { toggleAgenceActif(a.id, v); setAgences(prev => prev.map(x => x.id === a.id ? {...x, actif: v} : x)); }} />
                </div>
              )}
            </div>
            <div className="space-y-1 text-xs text-gray-500">
              {a.telephone && <p>📞 {a.telephone}</p>}
              {a.email     && <p>✉️ {a.email}</p>}
              {a.adresse   && <p>🏢 {a.adresse}</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB : PRODUITS
// ─────────────────────────────────────────────────────────────
function ProduitsTab({ isAdmin }: { isAdmin: boolean }) {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState({
    code: '', nom: '', branche: 'auto' as BranchType,
    description: '', prime_min: 0, prime_max: 0, duree_mois: 12, actif: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const load = useCallback(async () => {
    const data = await getAllProduits();
    setProduits(data); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (editId) {
        const updated = await updateProduit(editId, form);
        setProduits(prev => prev.map(p => p.id === editId ? { ...p, ...updated } : p));
      } else {
        const created = await createProduit(form);
        setProduits(prev => [...prev, created]);
      }
      setShowForm(false); setEditId(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: Produit) => {
    setEditId(p.id);
    setForm({
      code: p.code, nom: p.nom, branche: p.branche,
      description: p.description ?? '', prime_min: p.prime_min ?? 0,
      prime_max: p.prime_max ?? 0, duree_mois: p.duree_mois, actif: p.actif,
    });
    setShowForm(true);
  };

  const grouped = produits.reduce((acc, p) => {
    const b = p.branche as BranchType;
    if (!acc[b]) acc[b] = [];
    acc[b].push(p);
    return acc;
  }, {} as Record<BranchType, Produit[]>);

  if (loading) return <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-[#00C875]" /></div>;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Catalogue produits"
        count={produits.length}
        action={isAdmin && (
          <Button size="sm" onClick={() => {
            setEditId(null);
            setForm({ code:'', nom:'', branche:'auto', description:'', prime_min:0, prime_max:0, duree_mois:12, actif:true });
            setShowForm(true);
          }}>
            <Plus size={14} /> Nouveau produit
          </Button>
        )}
      />

      {showForm && (
        <Card className="p-5 border-2 border-[#00C875]/30 bg-[#00C875]/5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {editId ? 'Modifier le produit' : 'Nouveau produit'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Code *" placeholder="AUTO-TR" value={form.code}
              onChange={e => setForm(f => ({...f, code: e.target.value}))} />
            <Input label="Nom *" placeholder="Auto Tous Risques" value={form.nom}
              onChange={e => setForm(f => ({...f, nom: e.target.value}))} />
            <Select label="Branche *" value={form.branche}
              onChange={e => setForm(f => ({...f, branche: e.target.value as BranchType}))}
              options={Object.entries(BRANCH_CFG).map(([v, c]) => ({ value: v, label: `${c.icon} ${c.label}` }))} />
            <Input label="Durée (mois)" type="number" value={form.duree_mois}
              onChange={e => setForm(f => ({...f, duree_mois: Number(e.target.value)}))} />
            <Input label="Prime min (FCFA)" type="number" value={form.prime_min}
              onChange={e => setForm(f => ({...f, prime_min: Number(e.target.value)}))} />
            <Input label="Prime max (FCFA)" type="number" value={form.prime_max}
              onChange={e => setForm(f => ({...f, prime_max: Number(e.target.value)}))} />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={2} value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                placeholder="Description du produit..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C875] resize-none" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <Button size="sm" loading={saving} onClick={handleSave}>
              <Check size={13} /> {editId ? 'Enregistrer' : 'Créer le produit'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
              Annuler
            </Button>
          </div>
        </Card>
      )}

      {/* Grouped by branch */}
      {(Object.entries(grouped) as [BranchType, Produit[]][]).map(([branche, items]) => {
        const cfg = BRANCH_CFG[branche];
        return (
          <div key={branche}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{cfg.icon}</span>
              <h3 className="text-sm font-semibold text-gray-700">{cfg.label}</h3>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    {['Code', 'Nom', 'Prime min', 'Prime max', 'Durée', 'Statut', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(p => (
                    <tr key={p.id} className={clsx('hover:bg-gray-50 transition-colors', !p.actif && 'opacity-50')}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p.code}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.nom}</td>
                      <td className="px-4 py-3 text-gray-500">{p.prime_min ? formatCurrency(p.prime_min) : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{p.prime_max ? formatCurrency(p.prime_max) : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{p.duree_mois} mois</td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <Toggle active={p.actif} onChange={v => {
                            toggleProduitActif(p.id, v);
                            setProduits(prev => prev.map(x => x.id === p.id ? {...x, actif: v} : x));
                          }} />
                        ) : (
                          <Badge variant={p.actif ? 'green' : 'gray'} dot>{p.actif ? 'Actif' : 'Inactif'}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                          <button onClick={() => handleEdit(p)}
                            className="text-gray-300 hover:text-gray-600 p-1 transition-colors">
                            <Edit2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
