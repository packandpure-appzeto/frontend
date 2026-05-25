import { DEFAULT_PRODUCT_UNIT, PRODUCT_UNITS } from '@shared/constants/productUnits';

export { PRODUCT_UNITS, DEFAULT_PRODUCT_UNIT };

export const EMPTY_SELLER_PRODUCT_FORM = {
  name: '',
  description: '',
  price: '',
  salePrice: '',
  stock: '',
  lowStockAlert: 5,
  unit: DEFAULT_PRODUCT_UNIT,
  category: '',
  subcategory: '',
  status: 'pending_approval',
  tags: '',
  weight: '',
  brand: '',
  shelfLife: '',
  countryOfOrigin: '',
  fssaiLicense: '',
  customerCare: '',
  masterProductId: '',
  mainImage: null,
  mainImageFile: null,
  galleryItems: [],
  variants: [
    {
      id: Date.now(),
      name: 'Default',
      unit: DEFAULT_PRODUCT_UNIT,
      price: '',
      salePrice: '',
      stock: '',
    },
  ],
};

export function totalVariantStock(variants = []) {
  return (variants || []).reduce((sum, v) => sum + (Number(v?.stock) || 0), 0);
}

export function variantPricesList(item) {
  const variants = Array.isArray(item?.variants) ? item.variants : [];
  if (!variants.length) {
    const price = Number(item?.salePrice ?? item?.price) || 0;
    return [{ name: 'Default', display: price }];
  }
  return variants.map((v, i) => ({
    name: String(v?.name || '').trim() || `Variant ${i + 1}`,
    display: Number(v?.salePrice ?? v?.price) || 0,
  }));
}

export function variantPriceRangeLabel(item) {
  const list = variantPricesList(item);
  const amounts = list.map((r) => r.display).filter((n) => n > 0);
  if (!amounts.length) return '—';
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const fmt = (n) => Number(n).toLocaleString('en-IN');
  if (min === max) return `₹${fmt(min)}`;
  return `₹${fmt(min)} – ₹${fmt(max)}`;
}

/** Load API product into seller edit form state. */
export function productToSellerForm(item) {
  if (!item) return { ...EMPTY_SELLER_PRODUCT_FORM, variants: [{ ...EMPTY_SELLER_PRODUCT_FORM.variants[0], id: Date.now() }] };

  const variants =
    item.variants?.length > 0
      ? item.variants.map((v, i) => ({
          id: v._id || `v-${i}-${Date.now()}`,
          name: v.name || '',
          unit: v.unit || item.unit || DEFAULT_PRODUCT_UNIT,
          price: v.price ?? '',
          salePrice: v.salePrice ?? v.price ?? '',
          stock: Number.isFinite(Number(v.stock)) ? Number(v.stock) : '',
        }))
      : [
          {
            id: Date.now(),
            name: 'Default',
            unit: item.unit || DEFAULT_PRODUCT_UNIT,
            price: item.price ?? '',
            salePrice: item.salePrice ?? item.price ?? '',
            stock: item.stock ?? '',
          },
        ];

  const totalStock = totalVariantStock(variants);

  return {
    name: item.name || '',
    description: item.description || '',
    price: variants[0]?.price ?? item.price ?? '',
    salePrice: variants[0]?.salePrice ?? item.salePrice ?? '',
    stock: totalStock,
    lowStockAlert: item.lowStockAlert ?? 5,
    unit: item.unit || DEFAULT_PRODUCT_UNIT,
    category: item.categoryId?._id || item.categoryId || '',
    subcategory: item.subcategoryId?._id || item.subcategoryId || '',
    status: item.status || 'pending_approval',
    tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
    weight: item.weight || '',
    brand: item.brand || '',
    shelfLife: item.shelfLife || '',
    countryOfOrigin: item.countryOfOrigin || '',
    fssaiLicense: item.fssaiLicense || '',
    customerCare: item.customerCare || '',
    masterProductId: item.masterProductId?._id || item.masterProductId || '',
    mainImage: item.mainImage || null,
    mainImageFile: null,
    galleryItems: (Array.isArray(item.galleryImages) ? item.galleryImages : []).map((url) => ({
      id: `existing-${url}`,
      preview: url,
      file: null,
    })),
    variants,
  };
}

export function validateSellerProductForm(formData) {
  const missing = [];
  if (!String(formData.name || '').trim()) missing.push('Product title');
  if (!formData.category) missing.push('Parent category');
  if (!formData.subcategory) missing.push('Subcategory');

  const variants = formData.variants || [];
  if (!variants.length) {
    missing.push('At least one variant');
  } else {
    variants.forEach((v, i) => {
      const label = variants.length > 1 ? `Variant ${i + 1}` : 'Variant';
      if (!String(v.name || '').trim()) missing.push(`${label} name`);
      const price = Number(v.price);
      if (!Number.isFinite(price) || price <= 0) missing.push(`${label} supply price`);
      const stock = Number(v.stock);
      if (!Number.isFinite(stock) || stock < 0) missing.push(`${label} stock`);
    });
  }
  return missing;
}

export function buildSellerProductFormData(formData, { editingItem } = {}) {
  const data = new FormData();
  const variants = formData.variants || [];
  const totalStock = totalVariantStock(variants);
  const first = variants[0] || {};
  const resolvedPrice = Number(first.price) || 0;
  const resolvedSale = Number(first.salePrice ?? first.price) || resolvedPrice;

  const cleanVariants = variants.map((v, index) => ({
    name: String(v.name || '').trim() || `Variant ${index + 1}`,
    unit: v.unit || formData.unit || DEFAULT_PRODUCT_UNIT,
    price: Number(v.price) || resolvedPrice,
    salePrice: Number(v.salePrice ?? v.price) || resolvedPrice,
    stock: Number(v.stock) || 0,
  }));

  const fields = {
    name: String(formData.name || '').trim(),
    description: String(formData.description || '').trim(),
    price: resolvedPrice,
    salePrice: resolvedSale,
    stock: totalStock,
    purchasePrice: resolvedPrice,
    lowStockAlert: Number(formData.lowStockAlert) || 5,
    unit: formData.unit || DEFAULT_PRODUCT_UNIT,
    tags: String(formData.tags || '').trim(),
    weight: String(formData.weight || '').trim(),
    brand: String(formData.brand || '').trim(),
    shelfLife: formData.shelfLife,
    countryOfOrigin: formData.countryOfOrigin,
    fssaiLicense: formData.fssaiLicense,
    customerCare: formData.customerCare,
    masterProductId: formData.masterProductId,
  };

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      data.append(key, value);
    }
  });

  data.append('categoryId', formData.category);
  data.append('subcategoryId', formData.subcategory);
  data.append('variants', JSON.stringify(cleanVariants));

  if (editingItem) {
    const keepGalleryImages = (formData.galleryItems || [])
      .filter((it) => !it?.file && typeof it?.preview === 'string' && it.preview)
      .map((it) => it.preview);
    data.append('keepGalleryImages', JSON.stringify(keepGalleryImages));
  }

  return { data, cleanVariants, totalStock, resolvedPrice };
}
