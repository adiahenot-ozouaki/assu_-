import { supabase } from './supabase';
import type { Profile, Produit, BranchType } from '../types';

// ── Types ─────────────────────────────────────────────────────
export interface Agence {
  id: string;
  code: string;
  nom: string;
  ville: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  responsable_id?: string;
  actif: boolean;
  created_at: string;
  responsable?: Pick<Profile, 'id' | 'nom' | 'prenom'>;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  agence_id?: string;
  expire_at: string;
  accepte: boolean;
  created_at: string;
  agence?: Pick<Agence, 'nom'>;
}

// ── Utilisateurs ──────────────────────────────────────────────
export async function getUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Profile[];
}

export async function updateUser(id: string, payload: Partial<{
  nom: string; prenom: string; telephone: string;
  role: string; agence: string; actif: boolean;
}>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function toggleUserActif(id: string, actif: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ actif, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Invitations ───────────────────────────────────────────────
export async function getInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*, agence:agences(nom)')
    .eq('accepte', false)
    .gte('expire_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Invitation[];
}

export async function createInvitation(payload: {
  email: string; role: string; agence_id?: string;
}): Promise<Invitation> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('invitations')
    .insert({ ...payload, invite_par: user?.id })
    .select('*, agence:agences(nom)')
    .single();
  if (error) throw error;
  return data as Invitation;
}

export async function deleteInvitation(id: string): Promise<void> {
  const { error } = await supabase.from('invitations').delete().eq('id', id);
  if (error) throw error;
}

// ── Agences ───────────────────────────────────────────────────
export async function getAgences(): Promise<Agence[]> {
  const { data, error } = await supabase
    .from('agences')
    .select('*, responsable:profiles!responsable_id(id, nom, prenom)')
    .order('code');
  if (error) throw error;
  return data as Agence[];
}

export async function createAgence(payload: Omit<Agence, 'id' | 'created_at' | 'responsable'>): Promise<Agence> {
  const { data, error } = await supabase
    .from('agences')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Agence;
}

export async function updateAgence(id: string, payload: Partial<Omit<Agence, 'id' | 'created_at' | 'responsable'>>): Promise<Agence> {
  const { data, error } = await supabase
    .from('agences')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Agence;
}

export async function toggleAgenceActif(id: string, actif: boolean): Promise<void> {
  const { error } = await supabase.from('agences').update({ actif }).eq('id', id);
  if (error) throw error;
}

// ── Produits ──────────────────────────────────────────────────
export async function getAllProduits(): Promise<Produit[]> {
  const { data, error } = await supabase
    .from('produits')
    .select('*')
    .order('branche', { ascending: true });
  if (error) throw error;
  return data as Produit[];
}

export async function createProduit(payload: Omit<Produit, 'id' | 'created_at'>): Promise<Produit> {
  const { data, error } = await supabase
    .from('produits')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Produit;
}

export async function updateProduit(id: string, payload: Partial<Omit<Produit, 'id' | 'created_at'>>): Promise<Produit> {
  const { data, error } = await supabase
    .from('produits')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Produit;
}

export async function toggleProduitActif(id: string, actif: boolean): Promise<void> {
  const { error } = await supabase.from('produits').update({ actif }).eq('id', id);
  if (error) throw error;
}
