// Path:    src/modules/category-manager/index.ts
// Purpose: CategoryManager — Module #5 of 6 Core Modules.
//          CRUD for categories. Dispatches ypwork:category-changed.

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';
import type { Category, CreateCategoryDTO } from '@/lib/types';

type CategoryCtx = {
  categories: Category[];
  loading: boolean;
  fetchCategories: () => Promise<void>;
  createCategory: (dto: CreateCategoryDTO) => Promise<Category | null>;
  updateCategory: (id: string, patch: Partial<CreateCategoryDTO>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getById: (id: string | null) => Category | null;
};

const CategoryContext = createContext<CategoryCtx>({
  categories: [],
  loading: true,
  fetchCategories: async () => {},
  createCategory: async () => null,
  updateCategory: async () => {},
  deleteCategory: async () => {},
  getById: () => null,
});

export function useCategory() { return useContext(CategoryContext); }

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const sb = getBrowserSupabase();
      const { data, error } = await sb
        .from('ypwork_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      setCategories((data ?? []) as Category[]);
    } catch (e) {
      console.error('[CategoryManager] fetchCategories error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(async (dto: CreateCategoryDTO): Promise<Category | null> => {
    try {
      const sb = getBrowserSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('กรุณาเข้าสู่ระบบ');

      const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
      const { data, error } = await sb.from('ypwork_categories').insert({
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        sort_order: maxOrder + 1,
        created_by: user.id,
      }).select().single();

      if (error) throw new Error(error.message);
      const newCat = data as Category;
      setCategories(prev => [...prev, newCat]);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ypwork:category-changed', {
          detail: { categoryId: newCat.id },
        }));
      }
      return newCat;
    } catch (e: any) {
      console.error('[CategoryManager] createCategory error:', e);
      throw e;
    }
  }, [categories]);

  const updateCategory = useCallback(async (id: string, patch: Partial<CreateCategoryDTO>) => {
    try {
      const sb = getBrowserSupabase();
      const { error } = await sb.from('ypwork_categories').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
      setCategories(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ypwork:category-changed', { detail: { categoryId: id } }));
      }
    } catch (e: any) {
      console.error('[CategoryManager] updateCategory error:', e);
      throw e;
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      const sb = getBrowserSupabase();
      const { error } = await sb.from('ypwork_categories').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setCategories(prev => prev.filter(c => c.id !== id));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ypwork:category-changed', { detail: { categoryId: id } }));
      }
    } catch (e: any) {
      console.error('[CategoryManager] deleteCategory error:', e);
      throw e;
    }
  }, []);

  const getById = useCallback((id: string | null): Category | null => {
    if (!id) return null;
    return categories.find(c => c.id === id) ?? null;
  }, [categories]);

  return (
    <CategoryContext.Provider value={{
      categories, loading, fetchCategories, createCategory, updateCategory, deleteCategory, getById,
    }}>
      {children}
    </CategoryContext.Provider>
  );
}

export const CategoryManagerAPI = Object.freeze({
  useCategory,
  EVENTS: Object.freeze({
    CATEGORY_CHANGED: 'ypwork:category-changed',
  }),
} as const);
