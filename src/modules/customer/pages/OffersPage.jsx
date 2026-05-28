import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Tag,
  Clock,
  Sparkles,
  Copy,
  ChevronRight,
  MapPin,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { customerApi } from '../services/customerApi';
import { useSettings } from '@core/context/SettingsContext';
import { brandColor, brandLogo } from '../constants/brandTheme';
import { useLocation as useAppLocation } from '../context/LocationContext';
import { useToast } from '@shared/components/ui/Toast';
import { PAGE_CONTAINER } from '../components/home/homeLayout';
import {
  getSideImageByKey,
  getBackgroundColorByValue,
} from '@/shared/constants/offerSectionOptions';

const ICONS = {
  tag: Tag,
  clock: Clock,
  sparkles: Sparkles,
};

function OfferSectionCard({ section, onClick }) {
  const imageUrl = getSideImageByKey(section.sideImageKey);
  const accent = getBackgroundColorByValue(section.backgroundColor);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md md:rounded-2xl"
    >
      <div className="flex min-h-[88px] flex-1 flex-col justify-center gap-1 px-4 py-3 md:min-h-[100px] md:px-5">
        <span
          className="inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: accent }}
        >
          Near you
        </span>
        <h3 className="text-sm font-bold leading-tight text-slate-900 md:text-base">
          {section.title}
        </h3>
        <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600 md:text-sm">
          Shop deal
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="relative hidden w-[30%] shrink-0 sm:block md:w-[34%]">
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
      </div>
    </button>
  );
}

function CouponCard({ offer, onCopy }) {
  const Icon = ICONS[offer.icon] || Sparkles;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:rounded-2xl md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 md:text-base">{offer.title}</h3>
          {offer.description ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-600 md:text-sm">
              {offer.description}
            </p>
          ) : null}
          {offer.appliesOnOrderNumber ? (
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              Valid on order #{offer.appliesOnOrderNumber}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <code className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold tracking-wider text-slate-800 md:text-sm">
          {offer.code || 'AUTO'}
        </code>
        <button
          type="button"
          onClick={() => onCopy(offer)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 md:text-sm"
        >
          <Copy size={14} />
          Copy & shop
        </button>
      </div>
    </div>
  );
}

const OffersPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { currentLocation } = useAppLocation();
  const primary = brandColor(settings);
  const logoUrl = brandLogo(settings);
  const appName = settings?.appName || 'App';

  const [coupons, setCoupons] = useState([]);
  const [offerSections, setOfferSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const hasValidLocation =
    Number.isFinite(currentLocation?.latitude) &&
    Number.isFinite(currentLocation?.longitude);

  const loadOffers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const offersPromise = customerApi.getOffers().catch(() => ({ data: {} }));
      const sectionsPromise = hasValidLocation
        ? customerApi.getOfferSections({
            lat: currentLocation.latitude,
            lng: currentLocation.longitude,
          })
        : Promise.resolve({ data: {} });

      const [offersRes, sectionsRes] = await Promise.all([
        offersPromise,
        sectionsPromise,
      ]);

      const offersList =
        offersRes.data?.results ||
        offersRes.data?.result ||
        offersRes.data ||
        [];
      setCoupons(Array.isArray(offersList) ? offersList : []);

      const sectionsRaw =
        sectionsRes.data?.results ||
        (Array.isArray(sectionsRes.data?.result) ? sectionsRes.data.result : []) ||
        sectionsRes.data?.result?.items ||
        [];
      setOfferSections(Array.isArray(sectionsRaw) ? sectionsRaw : []);
    } catch (e) {
      console.error('[OffersPage]', e);
      setError('Could not load offers');
      setCoupons([]);
      setOfferSections([]);
    } finally {
      setIsLoading(false);
    }
  }, [hasValidLocation, currentLocation?.latitude, currentLocation?.longitude]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const activeCoupons = useMemo(
    () =>
      [...coupons]
        .filter((o) => o.status === 'active')
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [coupons],
  );

  const activeSections = useMemo(
    () =>
      [...offerSections]
        .filter((s) => s.status === 'active')
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [offerSections],
  );

  const handleCopyCoupon = async (offer) => {
    const code = offer.code || '';
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        showToast(`Coupon ${code} copied`, 'success');
      } catch {
        showToast(`Use code: ${code}`, 'info');
      }
    }
    navigate('/checkout');
  };

  const handleSectionClick = (section) => {
    const categoryId =
      section.categoryIds?.[0]?._id ||
      section.categoryIds?.[0] ||
      section.categoryId?._id ||
      section.categoryId;

    if (categoryId) {
      navigate(`/category/${categoryId}`);
      return;
    }

    const product = section.productIds?.[0];
    const productId = product?._id || product;
    if (productId) {
      navigate(`/product/${productId}`);
      return;
    }

    navigate('/categories');
  };

  const hasContent = activeCoupons.length > 0 || activeSections.length > 0;

  return (
    <div className="min-h-screen bg-white font-sans md:bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className={cn(PAGE_CONTAINER, 'py-3 md:py-4')}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="shrink-0 rounded-full p-1.5 hover:bg-slate-50 md:hidden"
              aria-label="Back"
            >
              <ChevronLeft size={22} className="text-slate-900" />
            </button>

            <Link to="/" className="hidden shrink-0 md:flex">
              <img src={logoUrl} alt={appName} className="h-9 w-auto object-contain" />
            </Link>

            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-slate-900 md:text-lg">Offers</h1>
              <p className="text-xs text-slate-500 md:text-sm">
                Coupons and deals for your area
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className={cn(PAGE_CONTAINER, 'py-4 pb-24 md:py-6 md:pb-12')}>
        {error ? (
          <p className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
            {error}
          </p>
        ) : null}

        {!hasValidLocation && (
          <div className="mb-6 flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
            <MapPin size={20} className="mt-0.5 shrink-0 text-brand-600" />
            <div>
              <p className="text-sm font-bold text-slate-900">Set delivery location</p>
              <p className="mt-1 text-xs text-slate-600 md:text-sm">
                Location-based deals appear after you choose an address on home.
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-3 text-sm font-bold text-brand-600 hover:underline"
              >
                Go to home
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: primary }} />
            <p className="text-sm font-semibold">Loading offers…</p>
          </div>
        ) : (
          <>
            {activeSections.length > 0 && (
              <section className="mb-8 md:mb-10">
                <h2 className="mb-3 text-sm font-bold text-slate-900 md:mb-4 md:text-base">
                  Deals near you
                </h2>
                <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
                  {activeSections.map((section) => (
                    <OfferSectionCard
                      key={section._id}
                      section={section}
                      onClick={() => handleSectionClick(section)}
                    />
                  ))}
                </div>
              </section>
            )}

            {activeCoupons.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold text-slate-900 md:mb-4 md:text-base">
                  Coupon codes
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
                  {activeCoupons.map((offer) => (
                    <CouponCard
                      key={offer._id}
                      offer={offer}
                      onCopy={handleCopyCoupon}
                    />
                  ))}
                </div>
              </section>
            )}

            {!hasContent && (
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-16 text-center shadow-sm">
                <Tag size={32} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800 md:text-lg">
                  No active offers right now
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                  Check back soon — fresh deals are added regularly.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/categories')}
                  className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Browse categories
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default OffersPage;
