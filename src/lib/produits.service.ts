import { supabase } from './supabase';
import type { Produit, BranchType } from '../types';

export async function getProduits(branche?: BranchType): Promise<Produit[]> {
  let query = supabase.from('produits').select('*').eq('actif', true).order('nom');
  if (branche) query = query.eq('branche', branche);
  const { data, error } = await query;
  if (error) throw error;
  return data as Produit[];
}
