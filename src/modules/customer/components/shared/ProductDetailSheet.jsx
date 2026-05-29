import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Heart, Share2, Minus, Plus } from 'lucide-react';
import { useProductDetail } from '../../context/ProductDetailContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '@shared/components/ui/Toast';
import { useSettings } from '@core/context/SettingsContext';
import { cn } from '@/lib/utils';
import { brandColor } from '../../constants/brandTheme';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=400&h=400&fit=crop';

function cleanDescription(text) {
  if (!text) return null;
  const t = String(text);
  if (t.trim().startsWith('{\\rtf') || t.includes('\\par')) {
    return t
      .replace(/\{\\[^}]*\}/g, '')
      .replace(/\\[a-z]+\d*\s?/gi, '')
      .replace(/[{}]/g, '')
      .replace(/\\'/g, "'")
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return t;
}

function resolveVariantKey(v) {
  return v?._id || v?.id || v?.sku || v?.name;
}

function cartKey(productId, variantId) {
  return `${String(productId || "").trim()}::${variantId ? String(variantId).trim() : ""}`;
}

const ProductDetailSheet = () => {
  const { selectedProduct, isOpen, closeProduct } = useProductDetail();
  const { cart, cartCount, addToCart, updateQuantity, removeFromCart } =
    useCart();
  const { toggleWishlist: toggleWishlistGlobal, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const primary = brandColor(settings);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantKey, setSelectedVariantKey] = useState(null);

  useEffect(() => {
    setActiveImageIndex(0);
    const first = selectedProduct?.variants?.[0];
    setSelectedVariantKey(first ? resolveVariantKey(first) : null);
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const images = useMemo(() => {
    if (!selectedProduct) return [];
    const out = [];
    if (selectedProduct.mainImage) out.push(selectedProduct.mainImage);
    else if (selectedProduct.image) out.push(selectedProduct.image);
    if (Array.isArray(selectedProduct.galleryImages)) {
      out.push(...selectedProduct.galleryImages.filter(Boolean));
    }
    return out.length ? out : [FALLBACK_IMAGE];
  }, [selectedProduct]);

  const selectedVariant = useMemo(() => {
    const variants = selectedProduct?.variants;
    if (!Array.isArray(variants) || variants.length === 0) return null;
    if (!selectedVariantKey) return variants[0];
    return (
      variants.find((v) => resolveVariantKey(v) === selectedVariantKey) ||
      variants[0]
    );
  }, [selectedProduct?.variants, selectedVariantKey]);

  const effectiveProduct = useMemo(() => {
    if (!selectedProduct) return null;
    if (!selectedVariant) return selectedProduct;
    const sale = Number(selectedVariant.salePrice ?? selectedVariant.price) || 0;
    const mrp = Number(selectedVariant.price) || sale;
    const stock = Number(selectedVariant.stock);
    return {
      ...selectedProduct,
      selectedVariantId: String(selectedVariant?._id || selectedVariant?.id || ""),
      price: sale || selectedProduct.price,
      originalPrice: mrp || selectedProduct.originalPrice,
      weight: selectedVariant.name || selectedProduct.weight,
      variantLabel: selectedVariant.name || selectedProduct.variantLabel,
      stockQty: Number.isFinite(stock) ? stock : selectedProduct.stockQty,
    };
  }, [selectedProduct, selectedVariant]);

  const productId = effectiveProduct?.id || effectiveProduct?._id;
  const selectedVariantId =
    effectiveProduct?.selectedVariantId ||
    (selectedVariant?._id ? String(selectedVariant._id) : selectedVariant?.id ? String(selectedVariant.id) : "");
  const cartItem =
    productId != null
      ? cart.find((item) => {
          const itemKey = cartKey(
            item.productId || item.id || item._id,
            item.variantId || item.selectedVariantId,
          );
          return itemKey === cartKey(productId, selectedVariantId || null);
        })
      : null;
  const quantity = cartItem?.quantity || 0;
  const isWishlisted = productId ? isInWishlist(productId) : false;
  const inStock =
    effectiveProduct?.inStock !== false &&
    (effectiveProduct?.stockQty == null || Number(effectiveProduct.stockQty) > 0);

  const desc = cleanDescription(effectiveProduct?.description);
  const categoryLine = [
    effectiveProduct?.subcategoryName,
    effectiveProduct?.categoryName,
  ]
    .filter(Boolean)
    .join(' · ');

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: effectiveProduct?.name || 'Product',
          text: effectiveProduct?.name || 'Product',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied', 'success');
      }
    } catch {
      // ignore
    }
  };

  const toggleWishlist = (e) => {
    e?.stopPropagation?.();
    if (!effectiveProduct) return;
    toggleWishlistGlobal(effectiveProduct);
    showToast(
      isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist',
      isWishlisted ? 'info' : 'success',
    );
  };

  const handleAdd = () => {
    if (!effectiveProduct || !inStock) return;
    const vId = selectedVariant?._id || selectedVariant?.id || null;
    addToCart({
      ...effectiveProduct,
      selectedVariantId: vId ? String(vId) : null,
      variantId: vId ? String(vId) : null,
    });
    showToast(`${effectiveProduct.name} added to cart`, 'success');
  };

  const inc = () =>
    productId &&
    updateQuantity(
      productId,
      1,
      selectedVariant?._id || selectedVariant?.id || undefined,
    );
  const dec = () => {
    if (!productId) return;
    const vId = selectedVariant?._id || selectedVariant?.id || undefined;
    if (quantity <= 1) removeFromCart(productId, vId);
    else updateQuantity(productId, -1, vId);
  };

  if (!selectedProduct) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeProduct}
            className="fixed inset-0 z-220 bg-black/60 backdrop-blur-sm"
          />

          {/* Desktop modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="fixed inset-0 z-230 hidden items-center justify-center p-6 md:flex"
          >
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="grid grid-cols-2">
                <div className="relative border-r border-slate-100 bg-slate-50">
                  <div className="absolute left-4 top-4 flex gap-2">
                    <button
                      type="button"
                      onClick={closeProduct}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm"
                      aria-label="Close"
                    >
                      <X size={18} className="text-slate-700" />
                    </button>
                  </div>
                  <div className="flex aspect-square items-center justify-center p-10">
                    <img
                      src={images[activeImageIndex]}
                      alt={effectiveProduct?.name || 'Product'}
                      className="h-full w-full object-contain mix-blend-multiply"
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="flex justify-center gap-2 pb-5">
                      {images.slice(0, 6).map((img, i) => (
                        <button
                          key={img + i}
                          type="button"
                          onClick={() => setActiveImageIndex(i)}
                          className={cn(
                            'h-12 w-12 overflow-hidden rounded-lg border bg-white',
                            i === activeImageIndex
                              ? 'border-brand-600'
                              : 'border-slate-200 opacity-80 hover:opacity-100',
                          )}
                        >
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-contain p-1"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-6">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {effectiveProduct?.brand ? (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                            {effectiveProduct.brand}
                          </span>
                        ) : null}
                        {effectiveProduct?.fulfillmentLabel ? (
                          <span className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700">
                            {effectiveProduct.fulfillmentLabel}
                          </span>
                        ) : null}
                        {!inStock ? (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                            Out of stock
                          </span>
                        ) : null}
                      </div>
                      <h2 className="line-clamp-2 text-xl font-bold text-slate-900">
                        {effectiveProduct?.name}
                      </h2>
                      {categoryLine ? (
                        <p className="mt-1 text-sm text-slate-500">
                          {categoryLine}
                        </p>
                      ) : null}
                      {effectiveProduct?.variantLabel || effectiveProduct?.unit ? (
                        <p className="mt-1 text-sm font-semibold text-brand-600">
                          {[effectiveProduct?.variantLabel, effectiveProduct?.unit]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      ) : null}
                      {effectiveProduct?.stockQty != null && inStock ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {effectiveProduct.stockQty} available
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={share}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                        aria-label="Share"
                      >
                        <Share2 size={18} className="text-slate-700" />
                      </button>
                      <button
                        type="button"
                        onClick={toggleWishlist}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg border',
                          isWishlisted
                            ? 'border-brand-200 bg-brand-50 text-brand-700'
                            : 'border-slate-200 hover:bg-slate-50',
                        )}
                        aria-label="Wishlist"
                      >
                        <Heart
                          size={18}
                          className={cn(
                            isWishlisted
                              ? 'fill-brand-600 text-brand-600'
                              : 'text-slate-500',
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-5 overflow-auto p-6">
                    {Array.isArray(selectedProduct?.variants) &&
                    selectedProduct.variants.length > 1 ? (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Select variant
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {selectedProduct.variants.map((v) => {
                            const key = resolveVariantKey(v);
                            const active = key === selectedVariantKey;
                            const sale =
                              Number(v.salePrice ?? v.price) ||
                              Number(v.price) ||
                              0;
                            const mrp = Number(v.price) || sale;
                            const savings = Math.max(0, mrp - sale);
                            const pct =
                              mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
                            const vStock = Math.max(0, Number(v.stock) || 0);
                            const vInStock = vStock > 0;
                            return (
                              <button
                                key={String(key)}
                                type="button"
                                onClick={() => setSelectedVariantKey(key)}
                                className={cn(
                                  'rounded-xl border p-3 text-left transition-colors',
                                  active
                                    ? 'border-brand-600 bg-brand-50'
                                    : 'border-slate-200 hover:bg-slate-50',
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p
                                      className={cn(
                                        'text-sm font-bold',
                                        active
                                          ? 'text-brand-700'
                                          : 'text-slate-900',
                                      )}
                                    >
                                      {v.name}
                                    </p>
                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                      {vInStock ? `${vStock} left` : 'Out of stock'}
                                    </p>
                                  </div>
                                  {pct > 0 && vInStock ? (
                                    <span className="shrink-0 rounded-lg bg-[#E23744] px-2 py-1 text-[10px] font-black text-white">
                                      {pct}% OFF
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                  <span className="text-base font-black text-slate-900">
                                    ₹{Number(sale || 0).toLocaleString('en-IN')}
                                  </span>
                                  {mrp > sale && vInStock ? (
                                    <span className="text-xs font-semibold text-slate-400 line-through">
                                      ₹{Number(mrp).toLocaleString('en-IN')}
                                    </span>
                                  ) : null}
                                  {savings > 0 && vInStock ? (
                                    <span className="text-xs font-semibold text-emerald-700">
                                      Save ₹{Number(savings).toLocaleString('en-IN')}
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {desc ? (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          About
                        </p>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                          {desc}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-slate-100 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Price
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-slate-900">
                            ₹{Number(effectiveProduct?.price || 0).toLocaleString('en-IN')}
                          </span>
                          {effectiveProduct?.originalPrice > effectiveProduct?.price ? (
                            <span className="text-sm text-slate-400 line-through">
                              ₹{Number(effectiveProduct.originalPrice).toLocaleString('en-IN')}
                            </span>
                          ) : null}
                        </div>
                        {effectiveProduct?.originalPrice > effectiveProduct?.price ? (
                          <p className="mt-1 text-xs font-semibold text-emerald-700">
                            Save ₹{Number(effectiveProduct.originalPrice - effectiveProduct.price).toLocaleString('en-IN')}
                          </p>
                        ) : null}
                      </div>

                      {quantity > 0 ? (
                        <div className="flex min-w-[160px] items-center justify-between rounded-xl border-2 border-brand-600 px-2 py-1">
                          <button
                            type="button"
                            onClick={dec}
                            className="p-2 text-brand-600"
                            aria-label="Decrease"
                          >
                            <Minus size={18} strokeWidth={3} />
                          </button>
                          <span className="text-base font-bold text-brand-600">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={inc}
                            className="p-2 text-brand-600"
                            aria-label="Increase"
                          >
                            <Plus size={18} strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAdd}
                          disabled={!inStock}
                          className={cn(
                            'rounded-xl px-6 py-3 text-sm font-semibold text-white',
                            inStock ? 'bg-brand-600 hover:bg-brand-700' : 'cursor-not-allowed bg-slate-300',
                          )}
                        >
                          Add to cart
                        </button>
                      )}
                    </div>

                    {cartCount > 0 ? (
                      <Link
                        to="/checkout"
                        onClick={closeProduct}
                        className="mt-4 flex w-full items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        <span>View cart</span>
                        <span>
                          {cartCount} item{cartCount === 1 ? '' : 's'}
                        </span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mobile bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="fixed bottom-0 left-0 right-0 z-230 md:hidden"
          >
            <div className="rounded-t-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between px-4 pb-2 pt-3">
                <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                <button
                  type="button"
                  onClick={closeProduct}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
                  aria-label="Close"
                >
                  <X size={18} className="text-slate-700" />
                </button>
              </div>

              <div className="max-h-[72vh] overflow-y-auto px-4 pb-32">
                <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  <div className="flex aspect-square items-center justify-center p-6">
                    <img
                      src={images[activeImageIndex]}
                      alt={effectiveProduct?.name || 'Product'}
                      className="h-full w-full object-contain mix-blend-multiply"
                    />
                  </div>
                  {images.length > 1 ? (
                    <div className="flex justify-center gap-1.5 pb-3">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveImageIndex(i)}
                          className={cn(
                            'h-1.5 rounded-full',
                            i === activeImageIndex ? 'w-6 bg-brand-600' : 'w-1.5 bg-slate-300',
                          )}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {effectiveProduct?.brand ? (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                        {effectiveProduct.brand}
                      </span>
                    ) : null}
                    {effectiveProduct?.fulfillmentLabel ? (
                      <span className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700">
                        {effectiveProduct.fulfillmentLabel}
                      </span>
                    ) : null}
                    {!inStock ? (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                        Out of stock
                      </span>
                    ) : null}
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    {effectiveProduct?.name}
                  </h2>
                  {categoryLine ? (
                    <p className="mt-1 text-sm text-slate-500">{categoryLine}</p>
                  ) : null}

                  {effectiveProduct?.variantLabel || effectiveProduct?.unit ? (
                    <p className="mt-1 text-sm font-semibold text-brand-600">
                      {[effectiveProduct?.variantLabel, effectiveProduct?.unit]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}

                  {effectiveProduct?.stockQty != null && inStock ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {effectiveProduct.stockQty} available
                    </p>
                  ) : null}

                  {Array.isArray(selectedProduct?.variants) &&
                  selectedProduct.variants.length > 1 ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Variant
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedProduct.variants.map((v) => {
                          const key = resolveVariantKey(v);
                          const active = key === selectedVariantKey;
                          const sale =
                            Number(v.salePrice ?? v.price) ||
                            Number(v.price) ||
                            0;
                          const mrp = Number(v.price) || sale;
                          const savings = Math.max(0, mrp - sale);
                          const pct =
                            mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
                          const vStock = Math.max(0, Number(v.stock) || 0);
                          const vInStock = vStock > 0;
                          return (
                            <button
                              key={String(key)}
                              type="button"
                              onClick={() => setSelectedVariantKey(key)}
                              className={cn(
                                'rounded-2xl border p-3 text-left',
                                active
                                  ? 'border-brand-600 bg-brand-50'
                                  : 'border-slate-200 bg-white',
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      'text-sm font-bold',
                                      active
                                        ? 'text-brand-700'
                                        : 'text-slate-900',
                                    )}
                                  >
                                    {v.name}
                                  </p>
                                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                                    {vInStock ? `${vStock} left` : 'Out of stock'}
                                  </p>
                                </div>
                                {pct > 0 && vInStock ? (
                                  <span className="shrink-0 rounded-lg bg-[#E23744] px-2 py-1 text-[10px] font-black text-white">
                                    {pct}% OFF
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-base font-black text-slate-900">
                                  ₹{Number(sale || 0).toLocaleString('en-IN')}
                                </span>
                                {mrp > sale && vInStock ? (
                                  <span className="text-xs font-semibold text-slate-400 line-through">
                                    ₹{Number(mrp).toLocaleString('en-IN')}
                                  </span>
                                ) : null}
                                {savings > 0 && vInStock ? (
                                  <span className="text-xs font-semibold text-emerald-700">
                                    Save ₹{Number(savings).toLocaleString('en-IN')}
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {desc ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                        About
                      </p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                        {desc}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="fixed bottom-0 left-0 right-0 z-240 border-t border-slate-100 bg-white/95 backdrop-blur px-4 py-4 md:hidden">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Price</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">
                        ₹{Number(effectiveProduct?.price || 0).toLocaleString('en-IN')}
                      </span>
                      {effectiveProduct?.originalPrice > effectiveProduct?.price ? (
                        <span className="text-sm text-slate-400 line-through">
                          ₹{Number(effectiveProduct.originalPrice).toLocaleString('en-IN')}
                        </span>
                      ) : null}
                    </div>
                    {effectiveProduct?.originalPrice > effectiveProduct?.price ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        Save ₹{Number(effectiveProduct.originalPrice - effectiveProduct.price).toLocaleString('en-IN')}
                      </p>
                    ) : null}
                  </div>

                  {quantity > 0 ? (
                    <div className="flex min-w-[160px] items-center justify-between rounded-xl border-2 border-brand-600 px-2 py-1">
                      <button
                        type="button"
                        onClick={dec}
                        className="p-2 text-brand-600"
                        aria-label="Decrease"
                      >
                        <Minus size={18} strokeWidth={3} />
                      </button>
                      <span className="text-base font-bold text-brand-600">{quantity}</span>
                      <button
                        type="button"
                        onClick={inc}
                        className="p-2 text-brand-600"
                        aria-label="Increase"
                      >
                        <Plus size={18} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={!inStock}
                      className={cn(
                        'rounded-xl px-6 py-3 text-sm font-semibold text-white',
                        inStock ? 'bg-brand-600 hover:bg-brand-700' : 'cursor-not-allowed bg-slate-300',
                      )}
                    >
                      Add
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleWishlist}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <Heart
                      size={16}
                      className={cn(isWishlisted ? 'fill-brand-600 text-brand-600' : 'text-slate-500')}
                    />
                    Wishlist
                  </button>
                  <button
                    type="button"
                    onClick={share}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <Share2 size={16} className="text-slate-500" />
                    Share
                  </button>
                </div>

                {cartCount > 0 ? (
                  <Link
                    to="/checkout"
                    onClick={closeProduct}
                    className="mt-3 flex w-full items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                  >
                    <span>View cart</span>
                    <span>
                      {cartCount} item{cartCount === 1 ? '' : 's'}
                    </span>
                  </Link>
                ) : null}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailSheet;
