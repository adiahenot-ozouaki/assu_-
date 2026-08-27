// ── CORS headers ─────────────────────────────────────────────
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// ── JSON response helper ──────────────────────────────────────
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function jsonError(message: string, status = 400): Response {
  return json({ error: message }, status);
}

// ── Auth: extrait l'utilisateur depuis le JWT Supabase ────────
export async function requireAuth(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Non authentifié');

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (error || !user) throw new Error('Token invalide');
  return user;
}
