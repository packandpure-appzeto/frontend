import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductDetailSheet from '../components/shared/ProductDetailSheet';
import { useProductDetail } from '../context/ProductDetailContext';
import { customerApi } from '../services/customerApi';
import { normalizeCustomerProduct } from '@shared/utils/productDisplay';
import MiniCart from '../components/shared/MiniCart';
import { useLocation as useAppLocation } from '../context/LocationContext';
import { useCart } from '../context/CartContext';
import CategoryProductRow from '../components/category/CategoryProductRow';

const BLINKIT_RED = '#E23744';
const DEFAULT_SUB_ICON =
  'https://cdn-icons-png.flaticon.com/128/2321/2321831.png';

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'name', label: 'Name (A–Z)' },
];

/**
 * Category PLP — `/category/:categoryId`
 * Home → tap category tile → this page (see HomeCategoryGrid).
 */
const CategoryProductsPage = () => {
  const { categoryName: catId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLocation } = useAppLocation();
  const { cartCount } = useCart();
  const { isOpen: isProductDetailOpen } = useProductDetail();

  const initialSub =
    location.state?.activeSubcategoryId || 'all';

  const [selectedSubCategory, setSelectedSubCategory] = useState(initialSub);
  const [category, setCategory] = useState(null);
  const [subCategories, setSubCategories] = useState([
    { id: 'all', name: 'All', icon: DEFAULT_SUB_ICON },
  ]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('relevance');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [ratedOnly, setRatedOnly] = useState(false);
  const [brandFilter, setBrandFilter] = useState('all');

  const hasValidLocation =
    Number.isFinite(currentLocation?.latitude) &&
    Number.isFinite(currentLocation?.longitude);

  const loadCategoryMeta = useCallback(async () => {
    try {
      const catRes = await customerApi.getCategories({ tree: true });
      if (!catRes.data?.success) return;

      const tree = catRes.data.results || catRes.data.result || [];
      const currentCat = tree.find(
        (root) => root._id === catId && root.type === 'category',
      );

      if (currentCat) {
        setCategory(currentCat);
        const subs = (currentCat.children || []).map((s) => ({
          id: s._id,
          name: s.name,
          icon: s.image || DEFAULT_SUB_ICON,
        }));
        setSubCategories([
          { id: 'all', name: 'All', icon: DEFAULT_SUB_ICON },
          ...subs,
        ]);
      }
    } catch (e) {
      console.error('[CategoryProductsPage] categories', e);
    }
  }, [catId]);

  const loadProducts = useCallback(async () => {
    if (!hasValidLocation) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const params = {
        categoryId: catId,
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        limit: 100,
      };
      if (selectedSubCategory && selectedSubCategory !== 'all') {
        params.subcategoryId = selectedSubCategory;
      }

      const prodRes = await customerApi.getProducts(params);
      if (prodRes.data?.success) {
        const rawResult = prodRes.data.result;
        const dbProds = Array.isArray(prodRes.data.results)
          ? prodRes.data.results
          : Array.isArray(rawResult?.items)
            ? rawResult.items
            : Array.isArray(rawResult)
              ? rawResult
              : [];

        const formatted = dbProds.map((p) => ({
          ...normalizeCustomerProduct(p),
          image:
            p.mainImage ||
            p.image ||
            'https://images.unsplash.com/photo-1550989460-0adf9ea622e2',
          deliveryTime: '8–12 mins',
          brand: p.brand || '',
          subcategoryId: p.subcategoryId,
        }));
        setProducts(formatted);
      } else {
        setProducts([]);
      }
    } catch (e) {
      console.error('[CategoryProductsPage] products', e);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    catId,
    selectedSubCategory,
    hasValidLocation,
    currentLocation?.latitude,
    currentLocation?.longitude,
  ]);

  useEffect(() => {
    loadCategoryMeta();
  }, [loadCategoryMeta]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setSelectedSubCategory(location.state?.activeSubcategoryId || 'all');
  }, [location.state?.activeSubcategoryId]);

  const brands = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return ['all', ...Array.from(set).sort()];
  }, [products]);

  const displayProducts = useMemo(() => {
    let list = [...products];

    if (brandFilter !== 'all') {
      list = list.filter((p) => p.brand === brandFilter);
    }

    if (ratedOnly) {
      list = list.filter((p) => Number(p.rating) >= 4);
    }

    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        list.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'name':
        list.sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || '')),
        );
        break;
      default:
        break;
    }

    const inStock = list.filter((p) => p.inStock !== false && (p.stock || 0) > 0);
    const oos = list.filter((p) => p.inStock === false || !(p.stock > 0));
    return [...inStock, ...oos];
  }, [products, sortBy, brandFilter, ratedOnly]);

  const sortLabel =
    SORT_OPTIONS.find((o) => o.id === sortBy)?.label || 'Sort';

  return (
    <div className="flex flex-col min-h-screen bg-white max-w-lg mx-auto relative font-sans shadow-xl">
      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-50 bg-white border-b border-gray-100',
          isProductDetailOpen && 'hidden md:block',
        )}
      >
        <div className="px-3 pt-3 pb-2 flex items-start gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1 mt-0.5 rounded-full hover:bg-gray-50 shrink-0"
            aria-label="Back"
          >
            <ChevronLeft size={22} className="text-gray-900" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-bold text-gray-900 leading-tight truncate">
              {category?.name || 'Category'}
            </h1>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className="text-[12px] font-semibold mt-0.5"
              style={{ color: BLINKIT_RED }}
            >
              Change category
            </button>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="p-2 rounded-full hover:bg-gray-50"
              aria-label="Search"
            >
              <Search size={22} className="text-gray-800" />
            </button>
            <Link
              to="/checkout"
              className="p-2 rounded-full hover:bg-gray-50 relative"
              aria-label="Cart"
            >
              <ShoppingCart size={22} className="text-gray-800" />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ backgroundColor: BLINKIT_RED }}
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Subcategory sidebar */}
        <aside className="w-[76px] shrink-0 border-r border-gray-100 bg-white overflow-y-auto hide-scrollbar sticky top-[72px] self-start max-h-[calc(100vh-72px)] pb-28">
          {subCategories.map((sub) => {
            const active = selectedSubCategory === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubCategory(sub.id)}
                className={cn(
                  'w-full flex flex-col items-center py-3 px-1 gap-1.5 border-l-[3px] transition-colors',
                  active
                    ? 'bg-[#FFF5F5] border-[#E23744]'
                    : 'border-transparent hover:bg-gray-50',
                )}
              >
                <div
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center p-1.5 transition-all',
                    active ? 'bg-[#FFE8EC] scale-105' : 'bg-gray-50 opacity-80',
                  )}
                >
                  <img
                    src={sub.image}
                    alt=""
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span
                  className={cn(
                    'text-[9px] text-center font-bold leading-tight px-0.5 line-clamp-2',
                    active ? 'text-[#E23744]' : 'text-gray-600',
                  )}
                >
                  {sub.name}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Main column */}
        <main className="flex-1 min-w-0 flex flex-col bg-white">
          {/* Filter chips */}
          <div className="sticky top-[72px] z-40 bg-white border-b border-gray-50 px-2 py-2">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSortMenu((v) => !v)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] font-semibold text-gray-800 whitespace-nowrap"
                >
                  <SlidersHorizontal size={14} />
                  {sortLabel}
                  <ChevronDown size={14} className="opacity-60" />
                </button>
                {showSortMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px]">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.id);
                            setShowSortMenu(false);
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2 text-[12px] font-semibold hover:bg-gray-50',
                            sortBy === opt.id && 'text-[#E23744]',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setRatedOnly((v) => !v)}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[12px] font-semibold whitespace-nowrap shrink-0',
                  ratedOnly
                    ? 'border-[#E23744] bg-[#FFF5F5] text-[#E23744]'
                    : 'border-gray-200 bg-white text-gray-800',
                )}
              >
                <Star
                  size={14}
                  className={ratedOnly ? 'fill-amber-400 text-amber-400' : 'text-amber-400'}
                />
                Rated 4.0+
              </button>

              {brands.length > 2 && (
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] font-semibold text-gray-800 shrink-0 max-w-[120px]"
                >
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b === 'all' ? 'Brand' : b}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Product list */}
          <div className="flex-1 pb-28">
            {!hasValidLocation && (
              <div className="p-6 text-center">
                <p className="text-sm font-semibold text-gray-700">
                  Set your delivery location on home to see products here.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="mt-3 text-sm font-bold"
                  style={{ color: BLINKIT_RED }}
                >
                  Go to home
                </button>
              </div>
            )}

            {hasValidLocation && isLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: BLINKIT_RED }} />
                <p className="text-xs font-semibold">Loading products…</p>
              </div>
            )}

            {hasValidLocation && !isLoading && displayProducts.length === 0 && (
              <div className="py-16 px-4 text-center">
                <p className="text-sm font-bold text-gray-500">
                  No products in this section
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Try another subcategory or change filters
                </p>
              </div>
            )}

            {hasValidLocation &&
              !isLoading &&
              displayProducts.map((product) => (
                <CategoryProductRow key={product.id || product._id} product={product} />
              ))}
          </div>
        </main>
      </div>

      <MiniCart />
      <ProductDetailSheet />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `,
        }}
      />
    </div>
  );
};

export default CategoryProductsPage;
