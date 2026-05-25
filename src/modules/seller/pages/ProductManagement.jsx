import React, { useState, useMemo, useRef, useEffect } from "react";
import Card from "@shared/components/ui/Card";
import Badge from "@shared/components/ui/Badge";
import {
  HiOutlinePlus,
  HiOutlineCube,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineEye,
  HiOutlinePhoto,
  HiOutlineCurrencyDollar,
  HiOutlineArchiveBox,
  HiOutlineTag,
  HiOutlineScale,
  HiOutlineArrowPath,
  HiOutlineXMark,
  HiOutlineChevronRight,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineFolderOpen,
  HiOutlineSwatch,
  HiOutlineSquaresPlus,
  HiOutlineLink,
} from "react-icons/hi2";
import axiosInstance from "@core/api/axios";
import Modal from "@shared/components/ui/Modal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sellerApi } from "../services/sellerApi";
import { toast } from "sonner";
import { useAuth } from "@/core/context/AuthContext";
import { PRODUCT_UNITS, DEFAULT_PRODUCT_UNIT } from "@shared/constants/productUnits";
import {
  EMPTY_SELLER_PRODUCT_FORM,
  productToSellerForm,
  validateSellerProductForm,
  buildSellerProductFormData,
  totalVariantStock,
  variantPricesList,
  variantPriceRangeLabel,
} from "../utils/sellerProductForm";

import { MagicCard } from "@/components/ui/magic-card";
import { BlurFade } from "@/components/ui/blur-fade";
import ShimmerButton from "@/components/ui/shimmer-button";
import Pagination from "@shared/components/ui/Pagination";
import { useDebouncedValue, useDebouncedCallback, DEBOUNCE_MS } from "@shared/hooks/useDebounce";

const ProductManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isVerified = user?.isVerified;

  const [searchParams, setSearchParams] = useSearchParams();
  const qFromUrl = searchParams.get("q") || "";

  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const fetchProducts = async (requestedPage = 1) => {
    setIsLoading(true);
    try {
      const res = await sellerApi.getProducts({ page: requestedPage, limit: pageSize });
      if (res.data.success) {
        const payload = res.data.result || {};
        const rawProducts = Array.isArray(payload.items)
          ? payload.items
          : (res.data.results || []);
        const safe = Array.isArray(rawProducts) ? rawProducts : [];
        setProducts(safe);
        setTotal(typeof payload.total === "number" ? payload.total : safe.length);
        setPage(typeof payload.page === "number" ? payload.page : requestedPage);
      }
    } catch (error) {
      toast.error("Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await sellerApi.getCategoryTree();
      if (res.data.success) {
        setDbCategories(res.data.results || res.data.result || []);
      }
    } catch (error) {
      // fail silently
    }
  };

  useEffect(() => {
    fetchProducts(1);
    fetchCategories();
  }, []);

  const categories = dbCategories;
  const [searchTerm, setSearchTerm] = useState(qFromUrl);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, DEBOUNCE_MS.search);

  useEffect(() => {
    if (qFromUrl !== searchTerm) setSearchTerm(qFromUrl);
  }, [qFromUrl]);

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("All");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewingVariants, setViewingVariants] = useState(null);
  const [isVariantsViewModalOpen, setIsVariantsViewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalTab, setModalTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isFilterOpen) return;
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  const [formData, setFormData] = useState(EMPTY_SELLER_PRODUCT_FORM);

  const [masterSuggestions, setMasterSuggestions] = useState([]);
  const [showMasterSuggestions, setShowMasterSuggestions] = useState(false);
  const [isSearchingMaster, setIsSearchingMaster] = useState(false);

  const searchMasterCatalog = useDebouncedCallback(async (val) => {
    if (val.trim().length < 2) {
      setMasterSuggestions([]);
      setShowMasterSuggestions(false);
      return;
    }
    setIsSearchingMaster(true);
    try {
      const res = await axiosInstance.get("/products", {
        params: { search: val, ownerType: "admin", limit: 8 },
      });
      const items = res.data?.result?.items || res.data?.items || [];
      setMasterSuggestions(items);
      setShowMasterSuggestions(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingMaster(false);
    }
  }, DEBOUNCE_MS.search);

  const handleMasterLink = (master) => {
    setFormData((prev) => ({
      ...prev,
      masterProductId: master._id,
      category: master.categoryId?._id || master.categoryId || prev.category,
      subcategory: master.subcategoryId?._id || master.subcategoryId || prev.subcategory,
      shelfLife: master.shelfLife || prev.shelfLife,
      countryOfOrigin: master.countryOfOrigin || prev.countryOfOrigin,
      fssaiLicense: master.fssaiLicense || prev.fssaiLicense,
      customerCare: master.customerCare || prev.customerCare,
      unit: master.unit || prev.unit,
    }));
    setShowMasterSuggestions(false);
    toast.success(`Mapped to Catalog: ${master.name}`);
  };

  const safeProducts = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  const filteredProducts = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;

    return safeProducts.filter((p) => {
      const variantSkus = Array.isArray(p.variants)
        ? p.variants.map((v) => (v?.sku || "").toString().toLowerCase()).filter(Boolean)
        : [];
      const skuCandidate = (p.sku || "").toString().toLowerCase() || (variantSkus.length > 0 ? variantSkus[0] : "");

      const matchesSearch = !term || p.name.toLowerCase().includes(term) || (!!skuCandidate && skuCandidate.includes(term));
      const matchesCategory = filterCategory === "all" || (p.categoryId?._id || p.categoryId) === filterCategory || (p.subcategoryId?._id || p.subcategoryId) === filterCategory;

      let matchesStatus = filterStatus === "All";
      if (filterStatus === "Active") matchesStatus = p.status === "active";
      if (filterStatus === "Low Stock") matchesStatus = p.stock > 0 && p.stock <= 10;
      if (filterStatus === "Out of Stock") matchesStatus = p.stock === 0;

      let matchesPrice = true;
      const effectivePrice = Number(p.salePrice ?? p.price ?? 0);
      if (min !== null && !Number.isNaN(min)) matchesPrice = matchesPrice && effectivePrice >= min;
      if (max !== null && !Number.isNaN(max)) matchesPrice = matchesPrice && effectivePrice <= max;

      return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
    });
  }, [safeProducts, debouncedSearchTerm, filterCategory, filterStatus, priceMin, priceMax]);

  const stats = useMemo(() => ({
    total: safeProducts.length,
    lowStock: safeProducts.filter((p) => p.stock > 0 && p.stock <= 10).length,
    outOfStock: safeProducts.filter((p) => p.stock === 0).length,
    active: safeProducts.filter((p) => p.status === "active").length,
  }), [safeProducts]);

  const updateVariants = (variants) => {
    setFormData((prev) => ({
      ...prev,
      variants,
      stock: totalVariantStock(variants),
    }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    const missing = validateSellerProductForm(formData);
    if (missing.length) {
      toast.error(`Required: ${missing.join(", ")}`);
      if (missing.some((m) => m.includes("category"))) setModalTab("category");
      else if (missing.some((m) => m.includes("Variant"))) setModalTab("variants");
      return;
    }

    setIsSaving(true);
    try {
      const { data } = buildSellerProductFormData(formData, { editingItem });

      if (formData.mainImageFile) {
        data.append("mainImage", formData.mainImageFile);
      }

      const galleryFiles = (formData.galleryItems || []).filter((it) => !!it?.file).map((it) => it.file);
      galleryFiles.forEach((file) => data.append("galleryImages", file));

      if (editingItem) {
        await sellerApi.updateProduct(editingItem._id || editingItem.id, data);
        toast.success("Product updated successfully");
      } else {
        await sellerApi.createProduct(data);
        toast.success("Product created and sent for admin approval");
      }
      setIsProductModalOpen(false);
      setEditingItem(null);
      fetchProducts(page);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e, type) => {
    const selected = Array.from(e?.target?.files || []);
    if (selected.length === 0) return;

    if (type === "main") {
      const file = selected[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, mainImage: reader.result, mainImageFile: file }));
      };
      reader.readAsDataURL(file);
      return;
    }

    // Gallery: allow multiple (max 5 total)
    const remainingSlots = Math.max(0, 5 - (formData.galleryItems?.length || 0));
    const filesToAdd = selected.slice(0, remainingSlots);
    if (filesToAdd.length < selected.length) toast.message("Max 5 gallery images allowed");

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          galleryItems: [
            ...(prev.galleryItems || []),
            { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, preview: reader.result, file },
          ],
        }));
      };
      reader.readAsDataURL(file);
    });

    // allow selecting the same file again later
    e.target.value = "";
  };

  const removeGalleryItem = (id) => {
    setFormData((prev) => ({
      ...prev,
      galleryItems: (prev.galleryItems || []).filter((it) => it.id !== id),
    }));
  };

  const openEditModal = (item = null) => {
    setFormData(
      item
        ? productToSellerForm(item)
        : {
            ...EMPTY_SELLER_PRODUCT_FORM,
            variants: [{ ...EMPTY_SELLER_PRODUCT_FORM.variants[0], id: Date.now() }],
          },
    );
    setEditingItem(item || null);
    setModalTab("general");
    setIsProductModalOpen(true);
  };

  const formSummary = useMemo(() => {
    const variants = formData.variants || [];
    const totalStock = totalVariantStock(variants);
    const prices = variants.map((v) => Number(v.price) || 0).filter((n) => n > 0);
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : 0;
    const priceLabel =
      minP === maxP ? (minP ? `₹${minP.toLocaleString("en-IN")}` : "—") : `₹${minP.toLocaleString("en-IN")} – ₹${maxP.toLocaleString("en-IN")}`;
    return { totalStock, priceLabel, variantCount: variants.length };
  }, [formData.variants]);

  const exportProducts = () => alert("Exporting " + safeProducts.length + " products as CSV (Simulation)");

  const handleDeleteClick = (product) => {
    setItemToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await sellerApi.deleteProduct(itemToDelete._id || itemToDelete.id);
      toast.success("Product deleted successfully");
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-slate-50/50 min-h-screen font-['Outfit',_sans-serif]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Inventory Management</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Track, manage and optimize your hyperlocal stock.</p>
        </div>
        <div className="flex items-center gap-3">
          <ShimmerButton onClick={exportProducts} className="shadow-2xl" background="white" color="black">
            <span className="whitespace-pre-wrap text-center text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <HiOutlineArrowPath className="h-4 w-4" /> Export CSV
            </span>
          </ShimmerButton>
          <ShimmerButton disabled={!isVerified} onClick={() => openEditModal()} className="shadow-2xl">
            <span className="whitespace-pre-wrap text-center text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <HiOutlinePlus className="h-4 w-4" /> Add New Product
            </span>
          </ShimmerButton>
        </div>
      </div>

      {!isVerified && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800">
          <HiOutlineExclamationCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">Your account is pending admin approval. You can prepare products but they won't be visible to customers until verified.</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "All Items", val: stats.total, icon: HiOutlineCube, color: "text-indigo-600", bg: "bg-indigo-50", status: "All" },
          { label: "Active Items", val: stats.active, icon: HiOutlineCheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", status: "Active" },
          { label: "Low Stock", val: stats.lowStock, icon: HiOutlineExclamationCircle, color: "text-amber-600", bg: "bg-amber-50", status: "Low Stock" },
          { label: "Out of Stock", val: stats.outOfStock, icon: HiOutlineArchiveBox, color: "text-rose-600", bg: "bg-rose-50", status: "Out of Stock" },
        ].map((stat, i) => (
          <BlurFade key={i} delay={0.1 + i * 0.05}>
            <div
              onClick={() => setFilterStatus(stat.status)}
              className={cn(
                "cursor-pointer rounded-lg transition-all duration-300",
                filterStatus === stat.status ? "ring-2 ring-indigo-500 shadow-lg" : "hover:shadow-md"
              )}>
              <MagicCard className="border-none shadow-sm ring-1 ring-slate-100 p-0 overflow-hidden group bg-white"
                gradientColor={stat.bg.includes("indigo") ? "#eef2ff" : stat.bg.includes("emerald") ? "#ecfdf5" : stat.bg.includes("amber") ? "#fffbeb" : "#fff1f2"}>
                <div className="flex items-center gap-3 p-4 relative z-10">
                  <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-sm", stat.bg, stat.color)}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">{stat.label}</p>
                    <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stat.val}</h4>
                  </div>
                </div>
              </MagicCard>
            </div>
          </BlurFade>
        ))}
      </div>

      {/* Toolbox */}
      <BlurFade delay={0.25}>
        <Card className="relative z-30 border-none shadow-sm ring-1 ring-slate-100 p-3 bg-white/60 backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row gap-3 items-center">
            <div className="relative flex-1 group w-full">
              <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-primary transition-all" />
              <input type="text" value={searchTerm} onChange={(e) => {
                setSearchTerm(e.target.value);
                const next = new URLSearchParams(searchParams);
                if (e.target.value) next.set("q", e.target.value); else next.delete("q");
                setSearchParams(next);
              }} placeholder="Search by name or SKU..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 border-none rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/5 transition-all outline-none" />
            </div>
            <div className="relative flex gap-2 shrink-0 w-full lg:w-auto">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 lg:flex-none px-4 py-2.5 bg-white ring-1 ring-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer">
                <option value="all">All Categories</option>
                {categories.map((h) => (
                  <optgroup key={h._id || h.id} label={h.name}>
                    <option value={h._id || h.id}>All {h.name}</option>
                    {(h.children || []).map((sc) => (
                      <option key={sc._id || sc.id} value={sc._id || sc.id}>{sc.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button onClick={() => setIsFilterOpen((prev) => !prev)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white ring-1 ring-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                <HiOutlineFunnel className="h-4 w-4" /> <span>Filters</span>
              </button>
            </div>
          </div>
        </Card>
      </BlurFade>

      {/* Product Table */}
      <BlurFade delay={0.3}>
        <Card className="relative z-10 border-none shadow-xl ring-1 ring-slate-100 overflow-hidden rounded-3xl mt-8">
          {/* Mobile View: Stacked Cards */}
          <div className="block md:hidden space-y-4 p-4 bg-slate-50/50">
            {filteredProducts.map((p) => (
              <div key={p._id || p.id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                    <img src={p.mainImage || p.galleryImages?.[0] || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2"} alt={p.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-slate-900 truncate">{p.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{variantPriceRangeLabel(p)}</p>
                    <p className="text-xs text-slate-500">{p.categoryId?.name || "N/A"}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center border-t border-slate-50 pt-3 mt-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400">Supply price</span>
                    <span className="text-sm font-black text-slate-900">{variantPriceRangeLabel(p)}</span>
                    {(p.variants?.length || 0) > 1 && (
                      <span className="text-[9px] text-slate-500">{p.variants.length} variants</span>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-400">Stock</span>
                    <span className={cn("text-base font-black", p.stock === 0 ? "text-rose-600" : p.stock <= 10 ? "text-amber-600" : "text-emerald-600")}>{p.stock}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(p)} className="p-2.5 hover:bg-slate-50 text-slate-600 ring-1 ring-slate-200 rounded-xl transition-all"><HiOutlinePencilSquare className="h-4 w-4" /></button>
                    <button onClick={() => handleDeleteClick(p)} className="p-2.5 hover:bg-rose-50 hover:text-rose-600 text-slate-600 ring-1 ring-slate-200 rounded-xl transition-all"><HiOutlineTrash className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <p className="py-8 text-center text-slate-500 font-medium">No products found</p>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest">Product</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest">Variants</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest">Supply price</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest text-center">Stock</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-900 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p._id || p.id} className="hover:bg-slate-50 transition-colors group border-b border-slate-200 last:border-b-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                          <img src={p.mainImage || p.galleryImages?.[0] || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2"} alt={p.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <p className="text-base font-medium text-slate-900">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.variants?.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => { setViewingVariants(p); setIsVariantsViewModalOpen(true); }}
                          className="text-xs font-bold text-purple-700 underline underline-offset-2 hover:text-purple-900"
                        >
                          {p.variants.length} variant{p.variants.length > 1 ? "s" : ""}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">{p.categoryId?.name || "N/A"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5 max-w-[120px]">
                        {variantPricesList(p).map((row, i) => (
                          <div key={i} className="text-[10px] font-bold text-slate-800" title={row.name}>
                            {(p.variants?.length || 0) > 1 && (
                              <span className="text-slate-400 block truncate">{row.name}</span>
                            )}
                            <span>₹{row.display.toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("text-base font-bold", p.stock === 0 ? "text-rose-600" : p.stock <= 10 ? "text-amber-600" : "text-emerald-600")}>{p.stock}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => openEditModal(p)} className="p-2 hover:bg-white hover:text-primary rounded-lg transition-all text-slate-600 ring-1 ring-slate-200"><HiOutlinePencilSquare className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteClick(p)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all text-slate-600 ring-1 ring-slate-200"><HiOutlineTrash className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </BlurFade>

      <div className="mt-8">
        <Pagination page={page} totalPages={Math.ceil(total / pageSize) || 1} total={total} pageSize={pageSize} onPageChange={(p) => fetchProducts(p)} onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); fetchProducts(1); }} loading={isLoading} />
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsProductModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="w-full max-w-5xl relative z-10 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0">
                    <HiOutlineCube className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 truncate">
                      {editingItem ? "Edit product" : "Add product"}
                    </h3>
                    {editingItem && (
                      <p className="text-xs font-semibold text-slate-500 truncate">{editingItem.name}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>

              {/* Live summary — variant-wise totals */}
              <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-slate-100 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Variants</p>
                  <p className="text-sm font-black text-slate-900">{formSummary.variantCount}</p>
                </div>
                <div className="text-center border-x border-slate-200/80">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Supply prices</p>
                  <p className="text-sm font-black text-emerald-700">{formSummary.priceLabel}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total stock (S)</p>
                  <p className="text-sm font-black text-sky-700">{formSummary.totalStock}</p>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                <div className="lg:w-1/4 bg-slate-50/50 border-r border-slate-100 p-4 space-y-1 overflow-y-auto">
                  {[
                    { id: "general", label: "General", icon: HiOutlineTag },
                    { id: "variants", label: "Variants & stock", icon: HiOutlineSwatch },
                    { id: "category", label: "Category", icon: HiOutlineFolderOpen },
                    { id: "media", label: "Photos", icon: HiOutlinePhoto },
                    { id: "details", label: "Extra details", icon: HiOutlineScale },
                  ].map((tab) => (
                    <button key={tab.id} onClick={() => setModalTab(tab.id)} className={cn("w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left", modalTab === tab.id ? "bg-white text-primary shadow-sm ring-1 ring-slate-100" : "text-slate-600 hover:bg-slate-100")}>
                      <tab.icon className="h-4 w-4" /> <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex-1 p-8 overflow-y-auto">
                  {modalTab === "general" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Product title *</label>
                        <input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/5"
                          placeholder="e.g. Premium Basmati Rice"
                        />
                      </div>

                      {/* HUB-FIRST MAPPING SECTION */}
                      <div className="p-4 bg-slate-900 rounded-2xl relative overflow-visible group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <HiOutlineLink className="h-16 w-16 text-white rotate-12" />
                        </div>
                        <div className="relative z-10 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-white italic tracking-tight uppercase">Hub-First Mapping</h4>
                            {formData.masterProductId ? (
                              <Badge variant="success" className="px-2 py-0.5 text-[8px] bg-emerald-500/20 text-emerald-400">Linked</Badge>
                            ) : (
                              <Badge variant="warning" className="px-2 py-0.5 text-[8px] animate-pulse">Unlinked</Badge>
                            )}
                          </div>
                          <div className="relative">
                            <div className="relative group/search">
                              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 group-focus-within/search:text-primary transition-all" />
                              <input 
                                type="text" 
                                autoComplete="off"
                                placeholder="Search Master Catalog..." 
                                onChange={(e) => searchMasterCatalog(e.target.value)} 
                                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-primary/50" 
                              />
                            </div>
                            {showMasterSuggestions && masterSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                {masterSuggestions.map(m => (
                                  <button key={m._id} type="button" onClick={() => handleMasterLink(m)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 text-left border-b border-slate-800 last:border-0">
                                    <img src={m.mainImage} alt="" className="h-8 w-8 rounded object-cover" />
                                    <div>
                                      <p className="text-xs font-bold text-white">{m.name}</p>
                                      <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{m.categoryId?.name || 'Master'}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {formData.masterProductId && (
                            <button onClick={() => setFormData({ ...formData, masterProductId: null })} className="text-[9px] font-black text-slate-500 hover:text-rose-500 uppercase self-end">Clear Mapping</button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Description</label>
                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-semibold min-h-[120px] outline-none" placeholder="Product details..." />
                      </div>
                    </div>
                  )}

                  {modalTab === "variants" && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Variants, supply price & stock</h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Each row is one pack/size you sell. Set <strong>supply price</strong> (what hub pays you) and <strong>your stock</strong> per variant.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateVariants([
                              ...(formData.variants || []),
                              {
                                id: Date.now(),
                                name: "",
                                unit: formData.unit || DEFAULT_PRODUCT_UNIT,
                                price: "",
                                salePrice: "",
                                stock: "",
                              },
                            ])
                          }
                          className="shrink-0 flex items-center gap-1 px-3 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20"
                        >
                          <HiOutlinePlus className="h-3.5 w-3.5" /> Add variant
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(formData.variants || []).map((variant, idx) => (
                          <div
                            key={variant.id || idx}
                            className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-12 gap-3 items-end"
                          >
                            <div className="col-span-12 sm:col-span-4 space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Name *</label>
                              <input
                                value={variant.name}
                                onChange={(e) => {
                                  const next = [...formData.variants];
                                  next[idx] = { ...next[idx], name: e.target.value };
                                  updateVariants(next);
                                }}
                                placeholder="e.g. 1 kg pack"
                                className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 rounded-xl text-xs font-semibold outline-none"
                              />
                            </div>
                            <div className="col-span-6 sm:col-span-2 space-y-1">
                              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                              <select
                                value={variant.unit || formData.unit}
                                onChange={(e) => {
                                  const next = [...formData.variants];
                                  next[idx] = { ...next[idx], unit: e.target.value };
                                  updateVariants(next);
                                }}
                                className="w-full px-2 py-2 bg-white ring-1 ring-slate-200 rounded-xl text-xs font-bold outline-none"
                              >
                                {PRODUCT_UNITS.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-6 sm:col-span-3 space-y-1">
                              <label className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Supply price (₹) *</label>
                              <input
                                type="number"
                                min="0"
                                value={variant.price}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const next = [...formData.variants];
                                  next[idx] = { ...next[idx], price: val, salePrice: val };
                                  updateVariants(next);
                                }}
                                className="w-full px-3 py-2 bg-white ring-1 ring-emerald-100 rounded-xl text-xs font-black outline-none"
                              />
                            </div>
                            <div className="col-span-6 sm:col-span-2 space-y-1">
                              <label className="text-[8px] font-bold text-sky-600 uppercase tracking-widest ml-1">Stock *</label>
                              <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) => {
                                  const next = [...formData.variants];
                                  next[idx] = { ...next[idx], stock: e.target.value };
                                  updateVariants(next);
                                }}
                                className="w-full px-3 py-2 bg-white ring-1 ring-sky-100 rounded-xl text-xs font-black outline-none"
                              />
                            </div>
                            <div className="col-span-6 sm:col-span-1 flex justify-end">
                              {(formData.variants?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => updateVariants(formData.variants.filter((_, i) => i !== idx))}
                                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                                  title="Remove variant"
                                >
                                  <HiOutlineTrash className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                        <div>
                          <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">Default unit (product)</p>
                          <select
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            className="mt-1 w-full px-3 py-2 bg-white rounded-xl text-xs font-bold outline-none ring-1 ring-amber-100"
                          >
                            {PRODUCT_UNITS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-rose-600 uppercase tracking-widest">Low stock alert</p>
                          <input
                            type="number"
                            min="0"
                            value={formData.lowStockAlert}
                            onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
                            className="mt-1 w-full px-3 py-2 bg-white rounded-xl text-xs font-bold text-rose-600 outline-none ring-1 ring-rose-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {modalTab === "details" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Brand</label>
                          <input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none" placeholder="e.g. India Gate" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Weight / pack info</label>
                          <input value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none" placeholder="e.g. 5kg" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Tags (comma separated)</label>
                        <input value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none" placeholder="organic, basmati" />
                      </div>
                    </div>
                  )}

                  {modalTab === "category" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Parent category</label>
                          <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: "" })} className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold outline-none cursor-pointer">
                            <option value="">Select parent</option>
                            {categories.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Subcategory</label>
                          <select value={formData.subcategory} onChange={e => setFormData({ ...formData, subcategory: e.target.value })} disabled={!formData.category} className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold outline-none cursor-pointer disabled:opacity-50">
                            <option value="">Select subcategory</option>
                            {categories.find(p => (p._id || p.id) === formData.category)?.children?.map(sc => <option key={sc._id || sc.id} value={sc._id || sc.id}>{sc.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {modalTab === "media" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Cover Photo</label>
                        <div className="w-48 aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-primary">
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => handleImageUpload(e, "main")} />
                          {formData.mainImage ? <img src={formData.mainImage} className="w-full h-full object-cover" /> : <HiOutlinePhoto className="h-10 w-10 text-slate-200" />}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-end justify-between gap-3">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                            Gallery Images <span className="text-slate-400 normal-case tracking-normal font-semibold">({(formData.galleryItems || []).length}/5)</span>
                          </label>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select multiple</div>
                        </div>

                        <div className={cn(
                          "rounded-2xl border-2 border-dashed bg-slate-50 p-5 transition-colors relative",
                          (formData.galleryItems || []).length >= 5 ? "border-slate-200 opacity-60 cursor-not-allowed" : "border-slate-200 hover:border-primary"
                        )}>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={(formData.galleryItems || []).length >= 5}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                            onChange={(e) => handleImageUpload(e, "gallery")}
                          />
                          <div className="flex items-center gap-3 text-slate-500">
                            <div className="h-10 w-10 rounded-xl bg-white ring-1 ring-slate-100 flex items-center justify-center">
                              <HiOutlineSquaresPlus className="h-5 w-5" />
                            </div>
                            <div className="text-xs font-semibold">
                              Click to add gallery images (max 5)
                            </div>
                          </div>
                        </div>

                        {(formData.galleryItems || []).length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {(formData.galleryItems || []).map((it) => (
                              <div key={it.id} className="relative rounded-2xl overflow-hidden ring-1 ring-slate-100 bg-white">
                                <img src={it.preview} alt="" className="w-full aspect-square object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeGalleryItem(it.id)}
                                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
                                  title="Remove"
                                >
                                  <HiOutlineXMark className="h-4 w-4 text-slate-700" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 uppercase tracking-widest">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="bg-slate-900 text-white px-10 py-2.5 rounded-xl text-xs font-bold shadow-xl hover:-translate-y-0.5 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion" size="sm" footer={
        <div className="flex gap-4 justify-end w-full">
          <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
          <button onClick={confirmDelete} className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold">Delete Product</button>
        </div>
      }>
        <div className="p-6 text-center space-y-4">
          <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto"><HiOutlineTrash className="h-10 w-10" /></div>
          <p className="text-sm text-slate-600 leading-relaxed">Are you sure you want to delete <span className="font-bold text-slate-900">{itemToDelete?.name}</span>? This action is irreversible.</p>
        </div>
      </Modal>

      {/* Viewing Variants Modal */}
      <Modal isOpen={isVariantsViewModalOpen} onClose={() => setIsVariantsViewModalOpen(false)} title="Variant breakdown" size="lg">
        <div className="py-2 space-y-4">
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-sm font-bold text-slate-900">{viewingVariants?.name}</span>
            <Badge variant="primary" className="text-[9px]">{variantPriceRangeLabel(viewingVariants)}</Badge>
            <span className="text-[10px] font-bold text-slate-400">
              Total stock: {totalVariantStock(viewingVariants?.variants || [])}
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Variant</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Supply price</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stock</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {viewingVariants?.variants?.map((v, idx) => (
                  <tr key={v._id || idx} className="hover:bg-slate-50/30">
                    <td className="px-6 py-3">
                      <span className="text-xs font-black text-slate-800">{v.name}</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="text-xs font-black text-emerald-700">
                        ₹{(Number(v.price) || 0).toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Badge variant={v.stock === 0 ? "rose" : v.stock <= 10 ? "amber" : "emerald"} className="text-[10px] font-black">
                        {v.stock} units
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right text-[10px] font-bold text-slate-600 uppercase">
                      {v.unit || viewingVariants?.unit || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductManagement;
