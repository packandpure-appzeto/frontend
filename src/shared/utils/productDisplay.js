/**
 * Customer catalog display — card price from first variant; keeps full variants[] for picker.
 */
export function normalizeCustomerProduct(p) {
  if (!p || typeof p !== 'object') return p;

  const variants = Array.isArray(p.variants) ? p.variants : [];
  const sellPrices = variants
    .map((v) => Number(v.salePrice ?? v.price) || 0)
    .filter((n) => n > 0);

  let price = Number(p.salePrice ?? p.price) || 0;
  let originalPrice = Number(p.price) || price;
  let weight = p.weight || p.unit || '1 pc';

  if (variants.length > 0) {
    const first = variants[0];
    const firstSale = Number(first.salePrice ?? first.price) || 0;
    const firstMrp = Number(first.price) || firstSale;
    const minSell = sellPrices.length ? Math.min(...sellPrices) : firstSale;
    const maxSell = sellPrices.length ? Math.max(...sellPrices) : firstSale;

    price = minSell;
    originalPrice = firstMrp;
    weight = first.name ? String(first.name) : weight;

    return {
      ...p,
      id: p._id || p.id,
      _id: p._id || p.id,
      image: p.mainImage || p.image || '',
      price,
      originalPrice: originalPrice > price ? originalPrice : firstMrp,
      displayPrice: minSell,
      displayPriceMax: maxSell,
      variantCount: variants.length,
      hasMultipleVariants: variants.length > 1,
      variantLabel:
        variants.length > 1 && minSell !== maxSell
          ? `${variants.length} options · from ₹${minSell.toLocaleString('en-IN')}`
          : variants.length > 1
            ? `${variants.length} sizes`
            : null,
      weight,
      inStock:
        (Number(p.stock) || 0) > 0 ||
        variants.some((v) => (Number(v.stock) || 0) > 0) ||
        p.inStock !== false,
      variants,
    };
  }

  return {
    ...p,
    id: p._id || p.id,
    _id: p._id || p.id,
    image: p.mainImage || p.image || '',
    price,
    originalPrice,
    weight,
    variantCount: 0,
    hasMultipleVariants: false,
    variantLabel: null,
    inStock: (Number(p.stock) || 0) > 0 || p.inStock !== false,
    variants: [],
  };
}

export function normalizeCustomerProducts(raw = []) {
  return (Array.isArray(raw) ? raw : []).map(normalizeCustomerProduct);
}
