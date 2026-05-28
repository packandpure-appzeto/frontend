import React from 'react';
import { Heart, Minus, Plus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '@shared/components/ui/Toast';
import { useProductDetail } from '../../context/ProductDetailContext';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=200&h=200&fit=crop';

/**
 * Mobile landing product row — shows brand, category, variant, price, stock.
 */
const HomeProductCard = ({ product }) => {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const { openProduct } = useProductDetail();

  const productId = product.id || product._id;
  const cartItem = cart.find(
    (item) =>
      String(item.productId || item.id || item._id) === String(productId) &&
      String(item.variantId || item.selectedVariantId || "") ===
        String(product.selectedVariantId || ""),
  );
  const quantity = cartItem?.quantity || 0;
  const wishlisted = isInWishlist(productId);

  const inStock = product.inStock !== false;
  const mustPickVariant =
    product.hasMultipleVariants &&
    (product.variantCount > 1 || (product.variants?.length || 0) > 1);

  const priceText =
    product.hasMultipleVariants && product.displayPrice != null
      ? `From ₹${Number(product.displayPrice).toLocaleString('en-IN')}`
      : `₹${Number(product.price || product.displayPrice || 0).toLocaleString('en-IN')}`;

  const categoryLine = [product.subcategoryName, product.categoryName]
    .filter(Boolean)
    .join(' · ');

  const metaLine = [product.variantLabel || product.weight, product.unit]
    .filter(Boolean)
    .join(' · ');

  const stockLine =
    !inStock
      ? 'Out of stock'
      : product.stockQty != null
        ? `${product.stockQty} available`
        : 'In stock';

  const handleOpen = () => openProduct?.(product);

  const firstVariantProduct = React.useMemo(() => {
    const first = product?.variants?.[0];
    if (!first) return product;
    const sale = Number(first.salePrice ?? first.price) || 0;
    const mrp = Number(first.price) || sale;
    const stock = Number(first.stock);
    return {
      ...product,
      selectedVariantId: String(first._id || first.id || ""),
      price: sale || product.price,
      originalPrice: mrp || product.originalPrice,
      weight: first.name || product.weight,
      variantLabel: first.name || product.variantLabel,
      stockQty: Number.isFinite(stock) ? stock : product.stockQty,
    };
  }, [product]);

  const handleAdd = (e) => {
    e.stopPropagation();
    if (!inStock) return;
    if (mustPickVariant) {
      openProduct?.(product);
      return;
    }
    addToCart(product);
    showToast(`${product.name} added to cart`, 'success');
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    toggleWishlist(product);
    showToast(
      wishlisted ? 'Removed from wishlist' : 'Saved to wishlist',
      wishlisted ? 'info' : 'success',
    );
  };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm',
        !inStock && 'opacity-95',
      )}
    >
      {!inStock && (
        <div className="border-b border-brand-100 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
          Out of stock — tap to get notified
        </div>
      )}

      <div className="flex gap-3 p-3" onClick={handleOpen} role="button" tabIndex={0}>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {product.brand ? (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                {product.brand}
              </span>
            ) : null}
            {product.fulfillmentLabel ? (
              <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                {product.fulfillmentLabel}
              </span>
            ) : null}
          </div>

          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
            {product.name}
          </h3>

          {categoryLine ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-slate-500">
              {categoryLine}
            </p>
          ) : null}

          {metaLine ? (
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-brand-600">
              {metaLine}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span
              className={cn(
                'text-lg font-bold',
                inStock ? 'text-slate-900' : 'text-slate-400',
              )}
            >
              {priceText}
            </span>
            {product.originalPrice > product.price && inStock ? (
              <span className="text-xs text-slate-400 line-through">
                ₹{Number(product.originalPrice).toLocaleString('en-IN')}
              </span>
            ) : null}
          </div>

          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <Package size={12} className="shrink-0" />
            {stockLine}
          </p>
        </div>

        <div className="relative flex w-[92px] shrink-0 flex-col items-center">
          <button
            type="button"
            onClick={handleWishlist}
            className="absolute right-0 top-0 z-10 rounded-full p-1 text-slate-300 hover:text-brand-600"
            aria-label="Wishlist"
          >
            <Heart
              size={18}
              className={cn(wishlisted && 'fill-brand-600 text-brand-600')}
            />
          </button>

          <div className="mt-5 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
            <img
              src={product.image || PLACEHOLDER_IMAGE}
              alt={product.name}
              className="h-full w-full object-contain p-1"
              loading="lazy"
            />
          </div>

          <div className="mt-2 w-full">
            {quantity > 0 && !mustPickVariant ? (
              <div className="flex min-w-[88px] items-center justify-between rounded-xl border-2 border-brand-600 px-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (quantity <= 1)
                      removeFromCart(productId, product.selectedVariantId);
                    else
                      updateQuantity(productId, -1, product.selectedVariantId);
                  }}
                  className="p-1.5 text-brand-600"
                >
                  <Minus size={14} strokeWidth={3} />
                </button>
                <span className="min-w-[20px] text-center text-sm font-bold text-brand-600">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuantity(productId, 1, product.selectedVariantId);
                  }}
                  className="p-1.5 text-brand-600"
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!inStock}
                onClick={handleAdd}
                className={cn(
                  'w-full rounded-xl border-2 py-2 text-xs font-bold uppercase tracking-wide',
                  inStock
                    ? 'border-brand-600 bg-white text-brand-600 hover:bg-brand-50'
                    : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300',
                )}
              >
                {mustPickVariant && inStock ? 'Options' : 'Add'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default HomeProductCard;
