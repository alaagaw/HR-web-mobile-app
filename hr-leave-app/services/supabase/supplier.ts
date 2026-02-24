import { supabase } from './client';
import type { SupplierService } from '../types';
import type { Supplier } from '@/types/models';

export const supplierService: SupplierService = {
  async getAll() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as Supplier[];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Supplier;
  },

  async create(draft) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(draft)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Supplier;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('suppliers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Supplier;
  },

  async delete(id) {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
