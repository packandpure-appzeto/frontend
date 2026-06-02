/** Shared variant + cart key helpers for customer catalog UI. */

export function resolveVariantKey(v) {
  return v?._id || v?.id || v?.sku || v?.name;
}

export function getVariantId(v) {
  if (!v) return "";
  const id = v._id || v.id;
  return id ? String(id) : "";
}

export function cartKey(productId, variantId) {
  return `${String(productId || "").trim()}::${variantId ? String(variantId).trim() : ""}`;
}

export function getVariantPricing(v) {
  const sale = Number(v?.salePrice ?? v?.price) || 0;
  const mrp = Number(v?.price) || sale;
  const savings = Math.max(0, mrp - sale);
  const discountPct = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
  return { sale, mrp, savings, discountPct };
}

export function getVariantStock(v) {
  return Math.max(0, Number(v?.stock) || 0);
}

export function isVariantInStock(v) {
  return getVariantStock(v) > 0;
}

/** Build map variantId -> quantity for a product from cart items. */
export function buildVariantCartMap(cart, productId) {
  const map = new Map();
  if (!productId || !Array.isArray(cart)) return map;
  const pid = String(productId);
  cart.forEach((item) => {
    if (String(item.productId || item.id || item._id) !== pid) return;
    const vId = String(item.variantId || item.selectedVariantId || "");
    map.set(vId, (map.get(vId) || 0) + (Number(item.quantity) || 0));
  });
  return map;
}

export function pickDefaultVariant(variants = []) {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  return variants.find(isVariantInStock) || variants[0];
}

export function applySelectedVariant(product, variant) {
  if (!product) return null;
  if (!variant) return product;
  const { sale, mrp } = getVariantPricing(variant);
  const stock = getVariantStock(variant);
  return {
    ...product,
    selectedVariantId: getVariantId(variant),
    price: sale || product.price,
    originalPrice: mrp || product.originalPrice,
    weight: variant.name || product.weight,
    variantLabel: variant.name || product.variantLabel,
    unit: variant.unit || product.unit,
    stockQty: stock,
    inStock: stock > 0,
  };
}
// for product detail page