import { useState, useCallback } from 'react';
import { projectService } from '@/services';
import type { Project, ProjectDraft, ProjectFilters } from '@/types/models';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (filters?: ProjectFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getAll(filters);
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data: ProjectDraft, createdBy: string) => {
    const project = await projectService.create(data, createdBy);
    setProjects((prev) => [project, ...prev]);
    return project;
  }, []);

  const update = useCallback(async (id: string, data: Partial<ProjectDraft>) => {
    const project = await projectService.update(id, data);
    setProjects((prev) => prev.map((p) => (p.id === id ? project : p)));
    return project;
  }, []);

  const remove = useCallback(async (id: string) => {
    await projectService.delete(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { projects, loading, error, fetchAll, create, update, remove };
}
