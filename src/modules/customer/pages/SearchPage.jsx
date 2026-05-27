import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useNavigate,
  useLocation as useRouterLocation,
  useSearchParams,
  Link,
} from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  X,
  Clock,
  TrendingUp,
  Loader2,
  MapPin,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { customerApi } from '../services/customerApi';
import { useProductDetail } from '../context/ProductDetailContext';
import { useLocation as useAppLocation } from '../context/LocationContext';
import { useCart } from '../context/CartContext';
import { normalizeCustomerProduct } from '@shared/utils/productDisplay';
import CategoryProductRow from '../components/category/CategoryProductRow';
import ProductCard from '../components/shared/ProductCard';
import ProductDetailSheet from '../components/shared/ProductDetailSheet';
import MiniCart from '../components/shared/MiniCart';
import { useDebouncedValue, DEBOUNCE_MS } from '@shared/hooks/useDebounce';

const BLINKIT_RED = '#E23744';
const RECENT_KEY = 'appzeto_recent_searches';
const SUGGESTED = ['Milk', 'Bread', 'Eggs', 'Rice', 'Vegetables', 'Fruits', 'Snacks'];

function parseProductsResponse(response) {
  if (!response?.data?.success) return [];
  const rawResult = response.data.result;
  const dbProds = Array.isArray(response.data.results)
    ? response.data.results
    : Array.isArray(rawResult?.items)
      ? rawResult.items
      : Array.isArray(rawResult)
        ? rawResult
        : [];
  return dbProds.map((p) => normalizeCustomerProduct(p));
}

const SearchPage = () => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOpen: isProductDetailOpen } = useProductDetail();
  const { currentLocation } = useAppLocation();
  const { cartCount } = useCart();

  const initialQuery =
    routerLocation.state?.query ||
    searchParams.get('q') ||
    '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [browseProducts, setBrowseProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS.search);

  const [pastSearches, setPastSearches] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const hasValidLocation =
    Number.isFinite(currentLocation?.latitude) &&
    Number.isFinite(currentLocation?.longitude);

  const saveSearch = useCallback((term) => {
    const t = String(term || '').trim();
    if (!t) return;
    setPastSearches((prev) => {
      const updated = [t, ...prev.filter((s) => s !== t)].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const applyQuery = useCallback(
    (term, { persist = true } = {}) => {
      const t = String(term || '').trim();
      setQuery(t);
      if (persist && t) {
        setSearchParams(t ? { q: t } : {}, { replace: true });
      }
    },
    [setSearchParams],
  );

  const handleRemoveSearch = (e, term) => {
    e.stopPropagation();
    setPastSearches((prev) => {
      const updated = prev.filter((s) => s !== term);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearchParams({}, { replace: true });
  };

  // Browse rail when query empty (lowest price / discovery)
  useEffect(() => {
    if (!hasValidLocation) {
      setBrowseProducts([]);
      setIsBrowseLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsBrowseLoading(true);
      try {
        const response = await customerApi.getProducts({
          limit: 40,
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        });
        if (!cancelled) setBrowseProducts(parseProductsResponse(response));
      } catch (e) {
        console.error('[SearchPage] browse', e);
        if (!cancelled) setBrowseProducts([]);
      } finally {
        if (!cancelled) setIsBrowseLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [hasValidLocation, currentLocation?.latitude, currentLocation?.longitude]);

  const debouncedTerm = String(debouncedQuery ?? '').trim();

  // Server search when debounced query changes (debounce, not throttle — best for search API)
  useEffect(() => {
    if (!debouncedTerm) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (!hasValidLocation) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    (async () => {
      try {
        const response = await customerApi.getProducts({
          search: debouncedTerm,
          limit: 50,
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
        });
        if (!cancelled) setResults(parseProductsResponse(response));
      } catch (e) {
        console.error('[SearchPage] search', e);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedTerm, hasValidLocation, currentLocation?.latitude, currentLocation?.longitude]);

  const isPendingSearch = Boolean(query.trim()) && debouncedTerm !== query.trim();

  const lowestPriceProducts = useMemo(() => {
    return [...browseProducts]
      .filter((p) => p.inStock !== false && (Number(p.stock) || 0) > 0)
      .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
      .slice(0, 12);
  }, [browseProducts]);

  const handleSubmitSearch = () => {
    const term = query.trim();
    if (!term) return;
    saveSearch(term);
    setSearchParams({ q: term }, { replace: true });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmitSearch();
  };

  const pickSuggestion = (term) => {
    applyQuery(term);
    saveSearch(term);
  };

  const showResults = Boolean(query.trim());
  const showSearchLoading = isSearching || isPendingSearch;

  return (
    <div className="flex flex-col min-h-full bg-white max-w-lg mx-auto relative font-sans shadow-xl">
      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-50 bg-white border-b border-gray-100',
          isProductDetailOpen && 'hidden md:block',
        )}
      >
        <div className="px-3 pt-3 pb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full hover:bg-gray-50 shrink-0"
            aria-label="Back"
          >
            <ChevronLeft size={22} className="text-gray-900" />
          </button>

          <div className="flex-1 relative min-w-0">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              autoFocus
              type="search"
              enterKeyHint="search"
              placeholder='Search "milk, bread, snacks…"'
              value={query}
              onChange={(e) => applyQuery(e.target.value, { persist: false })}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (query.trim()) setSearchParams({ q: query.trim() }, { replace: true });
              }}
              className={cn(
                'w-full h-11 pl-10 pr-10 rounded-xl bg-gray-50 border border-gray-200',
                'text-[14px] font-semibold text-gray-900 placeholder:text-gray-400',
                'outline-none focus:border-[#E23744] focus:ring-2 focus:ring-[#E23744]/15',
              )}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-200/80 hover:bg-gray-300"
                aria-label="Clear search"
              >
                <X size={14} className="text-gray-600" />
              </button>
            )}
          </div>

          <Link
            to="/checkout"
            className="p-2 rounded-full hover:bg-gray-50 relative shrink-0"
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
      </header>

      <main className="flex-1 pb-4">
        {!hasValidLocation && (
          <div className="mx-3 mt-4 p-4 rounded-xl bg-[#FFF5F5] border border-[#FFE4E4] flex gap-3">
            <MapPin size={20} className="text-[#E23744] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-900">Set delivery location</p>
              <p className="text-xs text-gray-600 mt-1">
                Search and shop are available after you choose an address on home.
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-2 text-xs font-bold"
                style={{ color: BLINKIT_RED }}
              >
                Go to home →
              </button>
            </div>
          </div>
        )}

        {showResults ? (
          <section className="mt-2">
            <div className="px-3 py-2 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-[15px] font-bold text-gray-900">Results</h2>
              {!showSearchLoading && (
                <span className="text-[11px] font-semibold text-gray-500">
                  {results.length} item{results.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {showSearchLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-500">
                <Loader2 className="h-7 w-7 animate-spin" style={{ color: BLINKIT_RED }} />
                <p className="text-xs font-semibold">Searching…</p>
              </div>
            )}

            {!showSearchLoading && results.length > 0 && (
              <div>
                {results.map((product) => (
                  <div
                    key={product.id || product._id}
                    onClick={() => saveSearch(query)}
                  >
                    <CategoryProductRow product={product} />
                  </div>
                ))}
              </div>
            )}

            {!showSearchLoading && results.length === 0 && hasValidLocation && (
              <div className="py-16 px-6 text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <Search size={28} className="text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-800">No matches for &quot;{query}&quot;</p>
                <p className="text-xs text-gray-500 mt-1">
                  Try another spelling or browse suggestions below
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {SUGGESTED.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pickSuggestion(s)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-700 hover:border-[#E23744] hover:text-[#E23744]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="px-3 pt-4 space-y-6">
            {/* Recent */}
            {pastSearches.length > 0 && (
              <section>
                <div className="flex items-center gap-1.5 mb-3">
                  <Clock size={14} className="text-gray-500" />
                  <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wide">
                    Recent searches
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pastSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => pickSuggestion(term)}
                      className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-2 rounded-full border border-gray-200 bg-white text-[13px] font-semibold text-gray-800 hover:border-[#E23744]/40 active:scale-[0.98]"
                    >
                      {term}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleRemoveSearch(e, term)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRemoveSearch(e, term);
                        }}
                        className="p-1 rounded-full hover:bg-gray-100"
                        aria-label={`Remove ${term}`}
                      >
                        <X size={12} className="text-gray-400" />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Suggested */}
            <section>
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp size={14} style={{ color: BLINKIT_RED }} />
                <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wide">
                  Popular searches
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => pickSuggestion(term)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors',
                      'border border-gray-200 text-gray-800 hover:bg-[#FFF5F5] hover:border-[#E23744]/30',
                    )}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>

            {/* Lowest price rail */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[16px] font-bold text-gray-900">Lowest prices near you</h2>
              </div>
              {isBrowseLoading ? (
                <div className="flex gap-3 overflow-hidden">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="min-w-[120px] h-44 rounded-xl bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : lowestPriceProducts.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-3 px-3 pb-2 snap-x">
                  {lowestPriceProducts.map((product) => (
                    <div
                      key={product.id || product._id}
                      className="min-w-[130px] max-w-[130px] snap-start shrink-0"
                    >
                      <ProductCard product={product} compact />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 py-4 text-center">
                  {hasValidLocation
                    ? 'No products available in your area yet'
                    : 'Set location to see deals'}
                </p>
              )}
            </section>
          </div>
        )}
      </main>

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

export default SearchPage;
