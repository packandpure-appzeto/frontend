import React, { useState, useEffect, useCallback } from 'react';
import { customerApi } from '../services/customerApi';
import { buildHomeCategorySections } from '../utils/categoryTree';
import HomeCategorySections from '../components/home/HomeCategorySections';

/**
 * `/categories` — full “browse all” view (parent categories with name + image).
 * Linked from cart, wishlist, header, and “See all”.
 */
const CategoriesPage = () => {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [catRes, heroRes] = await Promise.all([
        customerApi.getCategories({ roots: true }),
        customerApi.getHeroConfig({ pageType: 'home' }).catch(() => null),
      ]);

      const roots = catRes.data?.results || catRes.data?.result || [];
      if (!Array.isArray(roots) || !roots.length) {
        setSections([]);
        return;
      }
      const heroResult = heroRes?.data?.result || heroRes?.data || null;
      const preferredIds = Array.isArray(heroResult?.categoryIds)
        ? heroResult.categoryIds
        : [];

      setSections(buildHomeCategorySections(roots, preferredIds));
    } catch (e) {
      console.error('[CategoriesPage]', e);
      setError('Could not load categories');
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="min-h-screen bg-brand-50/30 pb-24 md:pb-8">
      <div className="max-w-lg mx-auto md:max-w-3xl px-4 pt-4 pb-8">
        <h1 className="text-xl font-black text-slate-900 mb-2">All categories</h1>
        <p className="text-sm text-slate-600 mb-6">
          Browse by department, then open a category to see products.
        </p>

        {error && (
          <p className="text-sm text-brand-700 font-medium mb-4">{error}</p>
        )}

        {isLoading ? (
          <p className="text-center text-slate-400 text-sm py-12">Loading categories…</p>
        ) : sections.length ? (
          <HomeCategorySections sections={sections} />
        ) : (
          <p className="text-center text-slate-500 text-sm py-12">No categories to show yet.</p>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;
