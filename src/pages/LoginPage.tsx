import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect.');
      } else {
        setError(authError.message);
      }
      return;
    }

    // onAuthStateChange dans useAuth se charge du reste.
    // On redirige simplement vers le dashboard.
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00C875]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#00C875] flex items-center justify-center mb-4 shadow-lg shadow-[#00C875]/30">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AssurZen ERP</h1>
          <p className="text-sm text-white/40 mt-1">Connectez-vous à votre espace</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-white/70">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@assurzen.ga"
                required
                autoComplete="email"
                className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-white/70">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#00C875] focus:border-transparent"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" loading={loading} size="lg">
              Se connecter
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          © {new Date().getFullYear()} AssurZen · Tous droits réservés
        </p>
      </div>
    </div>
  );
}
