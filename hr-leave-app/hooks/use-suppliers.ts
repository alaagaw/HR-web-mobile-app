import { useState, useCallback } from 'react';
import { supplierService } from '@/services';
import type { Supplier, SupplierDraft } from '@/types/models';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await supplierService.getAll();
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data: SupplierDraft) => {
    const supplier = await supplierService.create(data);
    setSuppliers((prev) => [supplier, ...prev]);
    return supplier;
  }, []);

  const update = useCallback(async (id: string, data: Partial<SupplierDraft>) => {
    const supplier = await supplierService.update(id, data);
    setSuppliers((prev) => prev.map((s) => (s.id === id ? supplier : s)));
    return supplier;
  }, []);

  const remove = useCallback(async (id: string) => {
    await supplierService.delete(id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { suppliers, loading, error, fetchAll, create, update, remove };
}
