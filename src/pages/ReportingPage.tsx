import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  getKpisDirection, getPrimesParMois, getPortefeuilleBranches,
  getSinistralite, getModesPaiement, getTopClients, getTauxRecouvrement,
  type KpisDirection, type PrimeMoisGrouped, type PortefeuilleBranche,
  type Sinistralite, type ModePaiement,
} from '../lib/analytics.service';
import { formatCurrency } from '../lib/supabase';
import { Card, Spinner } from '../components/ui';

// ── Palette ───────────────────────────────────────────────────
const COLORS = {
  green:  '#00C875',
  navy:   '#0A1628',
  amber:  '#FFB020',
  red:    '#EF4444',
  blue:   '#3B82F6',
  purple: '#8B5CF6',
  rose:   '#F43F5E',
};

const BRANCH_COLORS: Record<string, string> = {
  auto:  COLORS.blue,
  mrh:   COLORS.amber,
  sante: COLORS.green,
  vie:   COLORS.rose,
  autre: '#94A3B8',
};

const BRANCH_LABELS: Record<string, string> = {
  auto: 'Auto', mrh: 'Habitation', sante: 'Santé', vie: 'Vie', autre: 'Autre',
};

const MODE_LABELS: Record<string, string> = {
  mobile_money: '📱 Mobile Money',
  especes:      '💵 Espèces',
  virement:     '🏦 Virement',
  cheque:       '📄 Chèque',
  carte:        '💳 Carte',
};

// ── Format tooltip ────────────────────────────────────────────
const fmtK = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{BRANCH_LABELS[p.name] ?? p.name} :</span>
          <span className="font-semibold text-gray-800">{fmtK(p.value)} FCFA</span>
        </div>
      ))}
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, trend, color = 'green' }: {
  label: string; value: string | number; sub?: string;
  icon: string; trend?: 'up' | 'down' | 'flat'; color?: 'green' | 'blue' | 'amber' | 'red' | 'purple';
}) {
  const colors = {
    green:  'bg-emerald-50 text-emerald-600',
    blue:   'bg-blue-50 text-blue-600',
    amber:  'bg-amber-50 text-amber-700',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 leading-none">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colors[color]}`}>
            {icon}
          </div>
          {trend && <TrendIcon size={14} className={trendColor} />}
        </div>
      </div>
    </Card>
  );
}

// ── Section title ─────────────────────────────────────────────
function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ReportingPage() {
  const [kpis, setKpis]           = useState<KpisDirection | null>(null);
  const [primes, setPrimes]       = useState<PrimeMoisGrouped[]>([]);
  const [branches, setBranches]   = useState<PortefeuilleBranche[]>([]);
  const [sinistres, setSinistres] = useState<Sinistralite[]>([]);
  const [modes, setModes]         = useState<ModePaiement[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [recouvrement, setRecouvrement] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const [k, p, b, s, m, tc, r] = await Promise.all([
        getKpisDirection(),
        getPrimesParMois(),
        getPortefeuilleBranches(),
        getSinistralite(),
        getModesPaiement(),
        getTopClients(5),
        getTauxRecouvrement(),
      ]);
      setKpis(k); setPrimes(p); setBranches(b); setSinistres(s);
      setModes(m); setTopClients(tc); setRecouvrement(r);
      setRefreshedAt(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !kpis) return (
    <div className="flex items-center justify-center h-full">
      <Spinner className="w-8 h-8 text-[#00C875]" />
    </div>
  );

  const pieData = branches.map(b => ({
    name: BRANCH_LABELS[b.branche] ?? b.branche,
    value: Number(b.nb_contrats),
    prime: Number(b.prime_totale),
    color: BRANCH_COLORS[b.branche] ?? '#94A3B8',
  }));

  const sinistraliteData = sinistres
    .filter(s => Number(s.prime_totale_branche) > 0)
    .map(s => ({
      name: BRANCH_LABELS[s.branche] ?? s.branche,
      taux: Number(s.taux_sinistralite) || 0,
      sinistres: Number(s.nb_sinistres),
      indemnise: Number(s.montant_indemnise_total),
      color: BRANCH_COLORS[s.branche] ?? '#94A3B8',
    }));

  const tauxRecouv = recouvrement?.taux ?? 0;
  const radialData = [{ name: 'Recouvrement', value: tauxRecouv, fill: COLORS.green }];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporting Direction</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Données au {refreshedAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* ── KPIs row 1 ── */}
      <div>
        <SectionTitle title="Vue d'ensemble" sub="Indicateurs clés du portefeuille" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Masse primes annuelles" value={formatCurrency(kpis?.masse_prime_annuelle ?? 0)} icon="💰" color="green" trend="up" />
          <KpiCard label="Encaissé YTD" value={formatCurrency(kpis?.encaisse_ytd ?? 0)} sub={`ce mois : ${formatCurrency(kpis?.encaisse_ce_mois ?? 0)}`} icon="✅" color="blue" trend="up" />
          <KpiCard label="En attente" value={formatCurrency(kpis?.en_attente_total ?? 0)} sub={`${kpis?.nb_retards ?? 0} en retard`} icon="⏳" color="amber" trend="flat" />
          <KpiCard label="Total indemnisé" value={formatCurrency(kpis?.total_indemnise ?? 0)} sub={`${kpis?.total_sinistres ?? 0} sinistres`} icon="🩺" color="red" />
        </div>
      </div>

      {/* ── KPIs row 2 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Clients actifs" value={kpis?.clients_actifs ?? 0} sub={`${kpis?.nouveaux_ce_mois ?? 0} nouveaux ce mois`} icon="👥" color="purple" />
        <KpiCard label="Contrats actifs" value={kpis?.contrats_actifs ?? 0} sub={`sur ${kpis?.total_contrats ?? 0} total`} icon="📋" color="blue" />
        <KpiCard label="Sinistres ouverts" value={kpis?.sinistres_ouverts ?? 0} sub={`sur ${kpis?.total_sinistres ?? 0} déclarés`} icon="🚨" color={kpis?.sinistres_ouverts ? 'amber' : 'green'} />
        <KpiCard label="Taux recouvrement" value={`${tauxRecouv}%`} sub={`${recouvrement?.payees ?? 0}/${recouvrement?.total ?? 0} quittances`} icon="📈" color={tauxRecouv >= 80 ? 'green' : tauxRecouv >= 60 ? 'amber' : 'red'} />
      </div>

      {/* ── Graphique primes évolution ── */}
      <div>
        <SectionTitle title="Évolution des encaissements" sub="Primes encaissées par mois et par branche (12 derniers mois)" />
        <Card className="p-5">
          {primes.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Aucune donnée de paiement disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={primes} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <defs>
                  {['auto','mrh','sante','vie'].map(b => (
                    <linearGradient key={b} id={`grad-${b}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRANCH_COLORS[b]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={BRANCH_COLORS[b]} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois_label" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<TooltipContent />} />
                <Legend formatter={v => BRANCH_LABELS[v] ?? v} wrapperStyle={{ fontSize: 12 }} />
                {['auto','mrh','sante','vie'].map(b => (
                  <Area
                    key={b}
                    type="monotone"
                    dataKey={b}
                    stackId="1"
                    stroke={BRANCH_COLORS[b]}
                    fill={`url(#grad-${b})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Row : Pie + Sinistralité ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition portefeuille */}
        <div>
          <SectionTitle title="Répartition du portefeuille" sub="Contrats par branche" />
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, n: any, p: any) => [
                      `${v} contrats · ${formatCurrency(p.payload.prime)}`,
                      p.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-sm text-gray-600">{d.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{d.value}</span>
                      <span className="text-xs text-gray-400 ml-1">contrats</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Taux sinistralité */}
        <div>
          <SectionTitle title="Sinistralité par branche" sub="Taux indemnisation / primes collectées" />
          <Card className="p-5">
            {sinistraliteData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sinistraliteData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip formatter={(v: any) => [`${v}%`, 'Taux sinistralité']} />
                  <Bar dataKey="taux" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {sinistraliteData.map((d, i) => (
                      <Cell key={i} fill={Number(d.taux) > 60 ? COLORS.red : Number(d.taux) > 30 ? COLORS.amber : COLORS.green} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>

      {/* ── Row : Taux recouvrement + Modes paiement + Top clients ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Taux recouvrement jauge */}
        <div>
          <SectionTitle title="Recouvrement" sub="Quittances payées vs émises" />
          <Card className="p-5 text-center">
            <ResponsiveContainer width="100%" height={160}>
              <RadialBarChart
                cx="50%" cy="80%"
                innerRadius="60%" outerRadius="100%"
                startAngle={180} endAngle={0}
                data={radialData}
              >
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f0f4f0' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="-mt-8">
              <p className="text-3xl font-bold text-gray-900">{tauxRecouv}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {recouvrement?.payees ?? 0} / {recouvrement?.total ?? 0} quittances
              </p>
              <p className="text-sm font-semibold mt-2" style={{
                color: tauxRecouv >= 80 ? COLORS.green : tauxRecouv >= 60 ? COLORS.amber : COLORS.red,
              }}>
                {tauxRecouv >= 80 ? '✅ Excellent' : tauxRecouv >= 60 ? '⚠️ À surveiller' : '🔴 Critique'}
              </p>
            </div>
          </Card>
        </div>

        {/* Modes de paiement */}
        <div>
          <SectionTitle title="Modes de paiement" sub="Répartition des encaissements" />
          <Card className="p-5 space-y-3">
            {modes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucune donnée</p>
            ) : modes.map(m => {
              const pct = recouvrement?.payees
                ? Math.round((m.count / recouvrement.payees) * 100) : 0;
              return (
                <div key={m.mode}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{MODE_LABELS[m.mode] ?? m.mode}</span>
                    <span className="font-semibold text-gray-900">{pct}% · {m.count} quittances</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: COLORS.green }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Top clients */}
        <div>
          <SectionTitle title="Top clients" sub="Par prime annuelle" />
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-50">
              {topClients.map((c, i) => {
                const nom = c.client?.est_personne_morale
                  ? c.client.raison_sociale
                  : `${c.client?.prenom ?? ''} ${c.client?.nom ?? ''}`.trim();
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-[#00C875]/15 flex items-center justify-center text-xs font-bold text-[#00A35E] shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{nom}</p>
                      <p className="text-xs text-gray-400">{c.client?.code_client}</p>
                    </div>
                    <span className="text-sm font-bold text-[#00A35E] shrink-0">
                      {formatCurrency(c.prime_annuelle)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Tableau sinistralité détaillé ── */}
      <div>
        <SectionTitle title="Détail sinistralité" sub="Analyse par branche" />
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0A1628] text-white">
                {['Branche', 'Contrats actifs', 'Sinistres', 'Déclaré', 'Indemnisé', 'Primes collectées', 'Taux S/P', 'En cours'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider opacity-70">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sinistres.map((s, i) => {
                const taux = Number(s.taux_sinistralite) || 0;
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: BRANCH_COLORS[s.branche] }} />
                        <span className="font-medium text-gray-800">{BRANCH_LABELS[s.branche] ?? s.branche}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700">{s.contrats_actifs}</td>
                    <td className="px-4 py-3.5 text-gray-700">{s.nb_sinistres}</td>
                    <td className="px-4 py-3.5 text-gray-700">{formatCurrency(s.montant_declare_total)}</td>
                    <td className="px-4 py-3.5 text-gray-700">{formatCurrency(s.montant_indemnise_total)}</td>
                    <td className="px-4 py-3.5 text-gray-700">{formatCurrency(s.prime_totale_branche)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                        taux > 60 ? 'bg-red-100 text-red-700' :
                        taux > 30 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {taux}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {Number(s.sinistres_ouverts) > 0
                        ? <span className="font-semibold text-amber-600">{s.sinistres_ouverts}</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
