import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '@shared/components/ui/Button';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import { adminApi } from '../services/adminApi';
import { toast } from 'sonner';
import {
    HiOutlinePlus,
    HiOutlineCube,
    HiOutlineMagnifyingGlass,
    HiOutlineFunnel,
    HiOutlineTrash,
    HiOutlinePencilSquare,
    HiOutlinePhoto,
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
    HiOutlineArrowTopRightOnSquare,
} from 'react-icons/hi2';
import Modal from '@shared/components/ui/Modal';
import Pagination from '@shared/components/ui/Pagination';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineLink } from 'react-icons/hi2';
import SearchableCategorySelect from '../components/SearchableCategorySelect';
import { PRODUCT_UNITS, DEFAULT_PRODUCT_UNIT } from '@shared/constants/productUnits';
import { useDebouncedValue, useDebouncedCallback, DEBOUNCE_MS } from '@shared/hooks/useDebounce';
import {
    parseAdminProductListResponse,
    validateAdminProductForm,
    buildAdminProductFormData,
    isSubcategoryId,
    hubAndSellerStockFromItem,
    primaryStockFromItem,
    variantsForEditForm,
    variantPriceDisplay,
    variantPricesList,
    variantPriceRangeLabel,
    EMPTY_PRODUCT_FORM,
} from '../utils/adminProductForm';

const ProductManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [isSearchingMaster, setIsSearchingMaster] = useState(false);
    const [categories, setCategories] = useState([]); // All categories for dropdowns
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, DEBOUNCE_MS.search);
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeTab, setActiveTab] = useState('master'); // Default to Master Catalog
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestData, setRequestData] = useState({ productId: '', vendorId: '', productName: '', quantity: 1, notes: '' });
    const [itemToDelete, setItemToDelete] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [modalTab, setModalTab] = useState('general');

    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [approveRow, setApproveRow] = useState(null);
    const [approvePrice, setApprovePrice] = useState("");

    const [formData, setFormData] = useState({ ...EMPTY_PRODUCT_FORM, variants: [{ ...EMPTY_PRODUCT_FORM.variants[0], id: Date.now() }] });
    const [listStats, setListStats] = useState(null);

    const [viewingVariants, setViewingVariants] = useState(null);
    const [isVariantsViewModalOpen, setIsVariantsViewModalOpen] = useState(false);

    const [imageFiles, setImageFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    const buildProductReturnState = useCallback(
        () => ({
            returnTo: '/admin/products',
            productDraft: {
                formData,
                editingItem,
                modalTab,
                reopenProductModal: isProductModalOpen,
            },
        }),
        [formData, editingItem, modalTab, isProductModalOpen],
    );

    const goToAdminCategorySection = (target) => {
        if (target === 'subcategory' && !formData.categoryId) {
            toast.error('Select a parent category first, then create a subcategory');
            return;
        }
        const base =
            target === 'subcategory' ? '/admin/categories/sub' : '/admin/categories/level2';
        const params = new URLSearchParams({ create: '1' });
        if (target === 'subcategory' && formData.categoryId) {
            params.set('parentId', formData.categoryId);
        }
        navigate(`${base}?${params.toString()}`, { state: buildProductReturnState() });
    };

    const [masterSuggestions, setMasterSuggestions] = useState([]);
    const [showMasterSuggestions, setShowMasterSuggestions] = useState(false);

    const searchMasterCatalog = useDebouncedCallback(async (val) => {
        if (val.trim().length < 2) {
            setMasterSuggestions([]);
            setShowMasterSuggestions(false);
            return;
        }
        setIsSearchingMaster(true);
        try {
            const res = await adminApi.getProducts({
                search: val,
                ownerType: 'admin',
                limit: 10,
                page: 1,
            });
            const { items } = parseAdminProductListResponse(res);
            setMasterSuggestions(items);
            setShowMasterSuggestions(true);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearchingMaster(false);
        }
    }, DEBOUNCE_MS.search);

    const handleMasterLink = (master) => {
        setFormData(prev => ({
            ...prev,
            masterProductId: master._id,
            categoryId: master.categoryId?._id || master.categoryId,
            subcategoryId: master.subcategoryId?._id || master.subcategoryId,
        }));
        setShowMasterSuggestions(false);
        toast.success(`Linked to Master: ${master.name}`);
    };

    const fetchCategories = async () => {
        try {
            const response = await adminApi.getCategoryTree();
            if (response.data.success) {
                setCategories(response.data.results || response.data.result || []);
            }
        } catch (error) {
            console.error('Failed to fetch categories');
        }
    };

    const fetchProducts = async (requestedPage = 1) => {
        setIsLoading(true);
        try {
            const params = { page: requestedPage, limit: pageSize };
            if (debouncedSearchTerm) params.search = debouncedSearchTerm;
            if (filterCategory !== 'all') {
                if (isSubcategoryId(categories, filterCategory)) {
                    params.subcategory = filterCategory;
                } else {
                    params.category = filterCategory;
                }
            }
            if (filterStatus !== 'all') params.status = filterStatus;
            params.ownerType = activeTab === 'master' ? 'admin' : 'seller';

            const response = await adminApi.getProducts(params);
            const { items, total: apiTotal, page: apiPage, stats } = parseAdminProductListResponse(response);
            setProducts(items);
            setTotal(apiTotal);
            setPage(apiPage);
            setListStats(stats);
        } catch (error) {
            console.error('[ProductManagement] fetchProducts', error);
            toast.error(error.response?.data?.message || 'Failed to fetch products');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (!isProductModalOpen) return undefined;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isProductModalOpen]);

    useEffect(() => {
        const st = location.state;
        if (!st?.productDraft && !st?.selectCategoryId && !st?.selectSubcategoryId) return;

        const applyReturn = async () => {
            if (st.selectCategoryId || st.selectSubcategoryId) {
                await fetchCategories();
            }
            if (st.productDraft) {
                const { formData: draft, editingItem: draftItem, modalTab: tab, reopenProductModal } =
                    st.productDraft;
                if (draft) setFormData(draft);
                if (draftItem !== undefined) setEditingItem(draftItem);
                if (tab) setModalTab(tab);
                if (reopenProductModal) setIsProductModalOpen(true);
            }
            if (st.selectCategoryId || st.selectSubcategoryId) {
                setFormData((prev) => ({
                    ...prev,
                    ...(st.selectCategoryId ? { categoryId: st.selectCategoryId } : {}),
                    ...(st.selectSubcategoryId ? { subcategoryId: st.selectSubcategoryId } : {}),
                }));
                setModalTab('category');
                toast.success('Category saved — selection updated in product form');
            }
            navigate(location.pathname, { replace: true, state: {} });
        };

        applyReturn();
    }, [location.state]);

    useEffect(() => {
        fetchProducts(1);
    }, [debouncedSearchTerm, filterCategory, filterStatus, pageSize, activeTab]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const missing = validateAdminProductForm(formData);
            if (missing.length > 0) {
                setIsSaving(false);
                if (missing.some((m) => m.includes('category') || m.includes('Subcategory'))) {
                    setModalTab('category');
                } else if (missing.some((m) => m.includes('Variant'))) {
                    setModalTab('variants');
                }
                return toast.error(`Required: ${missing.join(', ')}`);
            }

            const { data } = buildAdminProductFormData(formData, { editingItem, activeTab });

            if (formData.mainImageFile) data.append('mainImage', formData.mainImageFile);

            const galleryFiles = (formData.galleryItems || []).filter(it => !!it?.file).map(it => it.file);
            galleryFiles.forEach((file) => data.append('galleryImages', file));

            if (editingItem?._id) {
                const keepGalleryImages = (formData.galleryItems || [])
                    .filter((it) => !it?.file && typeof it?.preview === "string" && it.preview)
                    .map((it) => it.preview);
                data.append("keepGalleryImages", JSON.stringify(keepGalleryImages));
            }

            if (editingItem?._id) {
                await adminApi.updateProduct(editingItem._id, data);
                toast.success('Product updated successfully');
            } else {
                await adminApi.createProduct(data);
                toast.success('Product created successfully');
            }
            setIsProductModalOpen(false);
            fetchProducts(editingItem?._id ? page : 1);
        } catch (error) {
            console.error("Save Error:", error);
            toast.error(error.response?.data?.message || 'Failed to save product');
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        try {
            await adminApi.deleteProduct(itemToDelete._id);
            toast.success('Product deleted');
            setIsDeleteModalOpen(false);
            fetchProducts(page);
        } catch (error) {
            toast.error('Failed to delete product');
        }
    };

    const handleImageUpload = (e, type) => {
        const selected = Array.from(e?.target?.files || []);
        if (selected.length === 0) return;

        if (type === 'main') {
            const file = selected[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData((prev) => ({ ...prev, mainImage: reader.result, mainImageFile: file }));
            };
            reader.readAsDataURL(file);
            return;
        }

        const currentCount = formData.galleryItems?.length || 0;
        const remainingSlots = Math.max(0, 5 - currentCount);
        const filesToAdd = selected.slice(0, remainingSlots);
        if (filesToAdd.length < selected.length) toast.message("Max 5 gallery images allowed");

        filesToAdd.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData((prev) => ({
                    ...prev,
                    galleryItems: [
                        ...(prev.galleryItems || []),
                        { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, preview: reader.result, file }
                    ]
                }));
            };
            reader.readAsDataURL(file);
        });

        e.target.value = "";
    };

    const removeGalleryItem = (id) => {
        setFormData((prev) => ({
            ...prev,
            galleryItems: (prev.galleryItems || []).filter((it) => it.id !== id),
        }));
    };

    const handleRequestStock = async () => {
        if (!requestData.quantity || requestData.quantity < 1) {
            toast.error("Please enter a valid quantity");
            return;
        }
        try {
            await adminApi.createManualPurchaseRequest({
                vendorId: requestData.vendorId,
                productId: requestData.productId,
                quantity: requestData.quantity,
                notes: requestData.notes
            });
            toast.success(`Purchase request sent to seller for ${requestData.productName}`);
            setIsRequestModalOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create purchase request");
        }
    };

    const openModal = (item = null) => {
        if (item) {
            const editVariants = variantsForEditForm(item, activeTab);
            setFormData({
                name: item.name || '',
                description: item.description || '',
                price: item.price ?? '',
                salePrice: item.salePrice ?? item.price ?? '',
                purchasePrice: item.purchasePrice || (item.ownerType === 'seller' ? item.salePrice : item.price) || 0,
                stock: primaryStockFromItem(item, activeTab),
                lowStockAlert: item.lowStockAlert || 5,
                unit: item.unit || DEFAULT_PRODUCT_UNIT,
                categoryId: item.categoryId?._id || item.categoryId || '',
                subcategoryId: item.subcategoryId?._id || item.subcategoryId || '',
                status: item.status || 'active',
                isFeatured: item.isFeatured || false,
                tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
                weight: item.weight || '',
                brand: item.brand || '',
                masterProductId: item.masterProductId || '',
                mainImage: item.mainImage || null,
                mainImageFile: null,
                galleryItems: (Array.isArray(item.galleryImages) ? item.galleryImages : (Array.isArray(item.images) ? item.images : [])).map((url) => ({
                    id: `existing-${url}`,
                    preview: url,
                    file: null,
                })),
                customerPrice: item.masterProductId?.price || item.masterProductId?.salePrice || '',
                variants: editVariants,
            });
            setPreviews(item.galleryImages || []);
            setEditingItem(item);
        } else {
            setFormData({
                ...EMPTY_PRODUCT_FORM,
                variants: [{ ...EMPTY_PRODUCT_FORM.variants[0], id: Date.now() }],
                status: activeTab === 'master' ? 'active' : 'pending_approval',
            });
            setPreviews([]);
            setEditingItem(null);
        }
        setImageFiles([]);
        setModalTab('general');
        setIsProductModalOpen(true);
    };

    const openApproveModal = (row) => {
        setApproveRow(row);
        setApprovePrice(String(row.salePrice || row.price || ""));
        setIsApproveModalOpen(true);
    };

    const handleQuickApprove = async () => {
        if (!approveRow) return;
        try {
            const data = new FormData();
            data.append('status', 'active');
            data.append('customerPrice', Number(approvePrice));
            data.append('salePrice', Number(approvePrice));
            data.append('price', Number(approvePrice)); 
            
            await adminApi.updateProduct(approveRow._id, data);
            toast.success(`${approveRow.name} approved and live at ₹${approvePrice}`);
            setIsApproveModalOpen(false);
            fetchProducts(page);
        } catch (error) {
            toast.error("Approval failed");
        }
    };

    const editFormSummary = useMemo(() => {
        const variants = formData.variants || [];
        const totalStock = variants.reduce((s, v) => s + (Number(v?.stock) || 0), 0);
        return {
            variantCount: variants.length,
            priceLabel: variantPriceRangeLabel({ variants }),
            totalStock,
        };
    }, [formData.variants]);

    const productsList = Array.isArray(products) ? products : [];
    const stats = useMemo(() => {
        if (listStats) {
            return {
                total: listStats.total ?? total,
                lowStock: listStats.lowStock ?? 0,
                outOfStock: listStats.outOfStock ?? 0,
                active: listStats.active ?? 0,
            };
        }
        return {
            total,
            lowStock: productsList.filter((p) => {
                const s = primaryStockFromItem(p, activeTab);
                return s > 0 && s <= 10;
            }).length,
            outOfStock: productsList.filter((p) => primaryStockFromItem(p, activeTab) === 0).length,
            active: productsList.filter((p) => p.status === 'active').length,
        };
    }, [productsList, total, listStats, activeTab]);

    const StatusBadge = ({ item }) => {
        const { status, ownerType } = item;
        const stock = primaryStockFromItem(item, activeTab);
        if (ownerType === 'admin') {
            if (status === 'active') return <Badge variant="success" className="text-[10px] px-1.5 py-0">Active</Badge>;
            return <Badge variant="gray" className="text-[10px] px-1.5 py-0">Inactive</Badge>;
        }

        if (stock === 0) return <Badge variant="error" className="text-[10px] px-1.5 py-0">Out of Stock</Badge>;
        if (stock <= 10) return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Low Stock</Badge>;
        if (status === 'active') return <Badge variant="success" className="text-[10px] px-1.5 py-0">Active</Badge>;
        if (status === 'pending_approval') return <Badge variant="warning" className="text-[10px] px-1.5 py-0">Pending Approval</Badge>;
        if (status === 'rejected') return <Badge variant="error" className="text-[10px] px-1.5 py-0">Rejected</Badge>;
        return <Badge variant="gray" className="text-[10px] px-1.5 py-0">Inactive</Badge>;
    };

    return (
        <div className="ds-section-spacing animate-in fade-in slide-in-from-bottom-2 duration-700 pb-16">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="ds-h1 flex items-center gap-2">
                        Product List
                        <Badge variant="primary" className="text-[9px] px-1.5 py-0 font-bold tracking-wider uppercase">Live</Badge>
                    </h1>
                    <p className="ds-description mt-0.5">Track your items, prices, and how many are left in stock.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setPage(1);
                            fetchProducts(1);
                            toast.success("Product list synchronized");
                        }}
                        className="p-2.5 bg-white ring-1 ring-slate-200 text-slate-400 hover:text-primary hover:ring-primary/30 rounded-xl transition-all shadow-sm active:scale-95"
                        title="Refresh Data"
                    >
                        <HiOutlineArrowPath className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </button>
                    <button
                        type="button"
                        onClick={() => openModal()}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-xl hover:bg-black hover:-translate-y-0.5 transition-all"
                    >
                        <HiOutlinePlus className="h-4 w-4" />
                        {activeTab === 'master' ? 'Add Master Product' : 'Add Seller Product'}
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/80 backdrop-blur rounded-2xl w-full lg:w-fit mt-2">
                <button
                    onClick={() => setActiveTab('master')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                        activeTab === 'master' 
                            ? "bg-white text-primary shadow-sm" 
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    )}
                >
                    <HiOutlineCheckCircle className={cn("h-4 w-4", activeTab === 'master' ? "text-primary" : "text-slate-400")} />
                    Master Catalog
                    {activeTab === 'master' && <Badge variant="primary" className="ml-1 text-[8px] px-1 animate-pulse">Live App</Badge>}
                </button>
                <button
                    onClick={() => setActiveTab('seller')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                        activeTab === 'seller' 
                            ? "bg-white text-primary shadow-sm" 
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    )}
                >
                    <HiOutlineSquaresPlus className={cn("h-4 w-4", activeTab === 'seller' ? "text-primary" : "text-slate-400")} />
                    Seller Inventory
                    {activeTab === 'seller' && <Badge variant="warning" className="ml-1 text-[8px] px-1">Supply</Badge>}
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'All Items', val: stats.total, icon: HiOutlineCube, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Active Items', val: stats.active, icon: HiOutlineCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Low Stock', val: stats.lowStock, icon: HiOutlineExclamationCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Out of Stock', val: stats.outOfStock, icon: HiOutlineArchiveBox, color: 'text-rose-600', bg: 'bg-rose-50' }
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm ring-1 ring-slate-100 p-4 relative overflow-hidden group">
                        <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300", stat.bg, stat.color)}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="ds-label">{stat.label}</p>
                                <h4 className="ds-stat-medium">{stat.val}</h4>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Toolbox */}
            <Card className="border-none shadow-sm ring-1 ring-slate-100 p-3 bg-white/60 backdrop-blur-xl">
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                    <div className="relative flex-1 group w-full">
                        <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-all" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or brand..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 border-none rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/5 transition-all outline-none"
                        />
                    </div>
                    <div className="flex gap-2 shrink-0 w-full lg:w-auto">
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="flex-1 lg:flex-none px-4 py-2.5 bg-white ring-1 ring-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-primary/5 outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(h => (
                                <optgroup key={h._id} label={h.name}>
                                    <option value={h._id}>All {h.name}</option>
                                    {(h.children || []).map(sc => (
                                        <option key={sc._id} value={sc._id}>{sc.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <button
                            onClick={() => {
                                const statusCycle = ['all', 'pending_approval', 'active', 'inactive', 'rejected'];
                                const idx = statusCycle.indexOf(filterStatus);
                                const nextStatus = statusCycle[(idx + 1) % statusCycle.length];
                                setFilterStatus(nextStatus);
                            }}
                            className={cn(
                                "flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                                filterStatus === 'pending_approval' ? "bg-orange-500 text-white shadow-md shadow-orange-100" :
                                filterStatus === 'active' ? "bg-emerald-500 text-white shadow-md shadow-emerald-100" :
                                    filterStatus === 'inactive' ? "bg-amber-500 text-white shadow-md shadow-amber-100" :
                                        filterStatus === 'rejected' ? "bg-rose-500 text-white shadow-md shadow-rose-100" :
                                        "bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <HiOutlineFunnel className="h-4 w-4" />
                            <span>
                                {filterStatus === 'pending_approval' ? 'PENDING APPROVAL' :
                                    filterStatus === 'active' ? 'ONLY LIVE' :
                                    filterStatus === 'inactive' ? 'ONLY DRAFT' :
                                        filterStatus === 'rejected' ? 'ONLY REJECTED' :
                                        'SHOW ALL'}
                            </span>
                        </button>
                    </div>
                </div>
            </Card>

            {/* Product Table */}
            <Card className="border-none shadow-xl ring-1 ring-slate-100 overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Seller</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Variant</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Subcategory</th>
                                <th className="px-6 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-center text-[10px] font-black text-emerald-500 uppercase tracking-widest">Profit</th>
                                <th className="px-6 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                                <th className="px-6 py-3 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <HiOutlineArrowPath className="h-8 w-8 text-primary animate-spin" />
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Products...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : productsList.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No products found</td>
                                </tr>
                            ) : productsList.map((p) => (
                                <tr key={p._id} className="hover:bg-slate-50/30 transition-colors group">
                                    {/* Product Column */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                                                <img src={p.mainImage || p.galleryImages?.[0]} alt={p.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">{p.name}</p>
                                                <p className="text-[9px] font-semibold text-slate-400">{p.unit}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Seller Column */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                            <span className="text-xs font-bold text-slate-700">{p.sellerId?.shopName || 'Admin'}</span>
                                        </div>
                                    </td>

                                    {/* Variant Column */}
                                    <td
                                        className="px-6 py-4 cursor-pointer hover:bg-purple-50/50 transition-colors group/variant"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingVariants(p);
                                            setIsVariantsViewModalOpen(true);
                                        }}
                                    >
                                        {p.variants && p.variants.length > 0 ? (
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <HiOutlineSwatch className="h-3.5 w-3.5 text-purple-500 group-hover/variant:scale-110 transition-transform shrink-0" />
                                                    <span className="text-xs font-bold text-purple-700 underline underline-offset-4 decoration-purple-200 group-hover/variant:decoration-purple-500">
                                                        {p.variants.length} Variant{p.variants.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                {activeTab === 'master' && (
                                                    <span className="text-[9px] font-bold text-slate-500 pl-5">
                                                        {variantPriceRangeLabel(p)}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs font-semibold text-slate-400">No variants</span>
                                        )}
                                    </td>

                                    {/* Category Column */}
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">{p.categoryId?.name || 'N/A'}</span>
                                    </td>

                                    {/* Subcategory Column */}
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-slate-600">{p.subcategoryId?.name || 'N/A'}</span>
                                    </td>

                                    {/* Price Column */}
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            {activeTab === 'seller' ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-black text-slate-900">₹{p.purchasePrice || p.price}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Vendor Cost</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1 max-w-[140px]">
                                                    {variantPricesList(p).map((row, i) => (
                                                        <div
                                                            key={`${p._id}-price-${i}`}
                                                            className="flex flex-col items-center w-full"
                                                            title={row.name}
                                                        >
                                                            {(p.variants?.length || 0) > 1 && (
                                                                <span className="text-[8px] font-bold text-slate-400 truncate max-w-full px-1">
                                                                    {row.name}
                                                                </span>
                                                            )}
                                                            {row.hasDiscount ? (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[9px] font-bold text-slate-400 line-through">
                                                                        ₹{row.mrp.toLocaleString('en-IN')}
                                                                    </span>
                                                                    <span className="text-[10px] font-black text-emerald-600">
                                                                        ₹{row.sell.toLocaleString('en-IN')}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs font-black text-slate-900">
                                                                    ₹{row.display.toLocaleString('en-IN')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Profit Column */}
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex flex-col items-center px-2 py-0.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                            {(() => {
                                                const sellPrice = Number(p.price || p.salePrice || 0);
                                                const costPrice = Number(p.purchasePrice || (p.ownerType === 'seller' ? (p.salePrice || p.price) : 0) || 0);
                                                const profit = sellPrice - costPrice;
                                                const profitPercentage = costPrice > 0 ? ((profit / costPrice) * 100).toFixed(0) : 0;
                                                
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className={cn("text-[11px] font-black", profit > 0 ? "text-emerald-600" : profit === 0 ? "text-slate-400" : "text-rose-600")}>
                                                            ₹{profit.toLocaleString()}
                                                        </span>
                                                        <span className={cn("text-[8px] font-bold opacity-60", profit > 0 ? "text-emerald-500" : profit === 0 ? "text-slate-300" : "text-rose-500")}>
                                                            {profitPercentage}% {profit >= 0 ? 'Margin' : 'Loss'}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>

                                    {/* Stock — H = hub warehouse, S = seller supply */}
                                    <td className="px-6 py-4 text-center">
                                        {(() => {
                                            const { hub, seller } = hubAndSellerStockFromItem(p, activeTab);
                                            return (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span
                                                        className="inline-flex items-center gap-1 text-sm font-black px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 min-w-[52px] justify-center"
                                                        title={
                                                            activeTab === 'master'
                                                                ? 'Hub warehouse stock'
                                                                : 'Hub stock (from linked master, if any)'
                                                        }
                                                    >
                                                        <span className="text-[10px] font-bold text-sky-600">H</span>
                                                        {hub}
                                                    </span>
                                                    <span
                                                        className="inline-flex items-center gap-1 text-sm font-black px-2.5 py-1 rounded-lg bg-violet-50 text-violet-800 border border-violet-200 min-w-[52px] justify-center"
                                                        title={
                                                            activeTab === 'master'
                                                                ? 'Total stock from all sellers'
                                                                : 'This seller listing stock'
                                                        }
                                                    >
                                                        <span className="text-[10px] font-bold text-violet-600">S</span>
                                                        {seller}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </td>

                                    {/* Status Column */}
                                    <td className="px-6 py-4 text-center">
                                        <StatusBadge item={p} />
                                    </td>

                                    {/* Actions Column */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-1.5">
                                            {activeTab === 'seller' && (
                                                <button
                                                    onClick={() => {
                                                        setRequestData({
                                                            productId: p._id,
                                                            vendorId: p.sellerId?._id || p.sellerId,
                                                            productName: p.name,
                                                            quantity: 10,
                                                            notes: ''
                                                        });
                                                        setIsRequestModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Request Stock"
                                                >
                                                    <HiOutlinePlus className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openModal(p)}
                                                className="p-1.5 hover:bg-white hover:text-primary rounded-lg transition-all text-gray-400 shadow-sm ring-1 ring-gray-100"
                                                title="Full Edit"
                                            >
                                                <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                                            </button>
                                            {p.status === 'pending_approval' && (
                                                <button
                                                    onClick={() => openApproveModal(p)}
                                                    className="px-2 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
                                                    title="Quick Approve"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                            <button
                                                onClick={() => (setItemToDelete(p), setIsDeleteModalOpen(true))}
                                                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all text-gray-400 shadow-sm ring-1 ring-gray-100"
                                                title="Delete"
                                            >
                                                <HiOutlineTrash className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 border-t border-slate-100">
                    <Pagination
                        page={page}
                        totalPages={Math.ceil(total / pageSize) || 1}
                        total={total}
                        pageSize={pageSize}
                        onPageChange={(p) => fetchProducts(p)}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPage(1);
                        }}
                        loading={isLoading}
                    />
                </div>
            </Card>

            {/* Request Stock Modal */}
            <Modal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                title="Request Stock from Vendor"
                size="sm"
                footer={
                    <>
                        <button onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Cancel</button>
                        <button onClick={handleRequestStock} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700">Submit Request</button>
                    </>
                }
            >
                <div className="space-y-4 py-2">
                    <p className="text-xs text-slate-500">Requesting replenishment for <span className="font-bold">{requestData.productName}</span></p>
                    <input type="number" value={requestData.quantity} onChange={(e) => setRequestData({...requestData, quantity: e.target.value})} className="w-full p-3 bg-slate-100 rounded-xl text-sm" placeholder="Quantity" />
                    <textarea value={requestData.notes} onChange={(e) => setRequestData({...requestData, notes: e.target.value})} className="w-full p-3 bg-slate-100 rounded-xl text-sm h-24" placeholder="Add notes for the vendor..." />
                </div>
            </Modal>

            {/* Super Detailed Modal */}
            <AnimatePresence>
                {isProductModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
                            onClick={() => setIsProductModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-5xl relative z-10 bg-white rounded-xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] min-h-0 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex shrink-0 items-center justify-between p-6 border-b border-slate-100">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                                        <HiOutlineCube className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="admin-h3">
                                            {editingItem ? 'Edit Product' : 'Create Product'}
                                        </h3>
                                        <div className="flex items-center space-x-2 mt-0.5">
                                            <Badge variant="primary" className="text-[7px] font-bold uppercase tracking-widest px-1">SYSTEM</Badge>
                                            <HiOutlineChevronRight className="h-2.5 w-2.5 text-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {activeTab === 'master' ? 'MASTER CATALOG' : 'SELLER LISTING'}
                                                {editingItem?._id ? ` · ${String(editingItem._id).slice(-6)}` : ' · NEW'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                    <HiOutlineXMark className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="shrink-0 px-6 py-3 bg-gradient-to-r from-slate-50 to-primary/5 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Variants</p>
                                    <p className="text-sm font-black text-slate-900">{editFormSummary.variantCount}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {activeTab === 'master' ? 'Sell prices' : 'Supply prices'}
                                    </p>
                                    <p className="text-sm font-black text-emerald-700">{editFormSummary.priceLabel}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {activeTab === 'master' ? 'Hub stock (H)' : 'Your stock (S)'}
                                    </p>
                                    <p className="text-sm font-black text-sky-700">{editFormSummary.totalStock}</p>
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tip</p>
                                    <p className="text-[10px] font-semibold text-slate-600 leading-tight">
                                        Set price & stock on each variant row below.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
                                {/* Modal Sidebar Tabs */}
                                <div className="shrink-0 flex flex-col lg:w-1/4 lg:min-h-0 max-h-[min(40vh,220px)] lg:max-h-none bg-slate-50/50 border-b lg:border-b-0 lg:border-r border-slate-100 overflow-y-auto overscroll-contain custom-scrollbar">
                                    <div className="p-4 space-y-1">
                                    {[
                                        { id: 'general', label: 'General Info', icon: HiOutlineTag },
                                        { id: 'category', label: 'Categories', icon: HiOutlineFolderOpen },
                                        { id: 'variants', label: 'Variants & pricing', icon: HiOutlineSwatch },
                                        { id: 'media', label: 'Photos', icon: HiOutlinePhoto },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setModalTab(tab.id)}
                                            className={cn(
                                                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all",
                                                modalTab === tab.id
                                                    ? "bg-white text-primary shadow-sm ring-1 ring-slate-100"
                                                    : "text-slate-500 hover:bg-slate-100"
                                            )}
                                        >
                                            <tab.icon className="h-4 w-4" />
                                            <span>{tab.label}</span>
                                        </button>
                                    ))}

                                    <div className="pt-8 px-4">
                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Status</p>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full bg-transparent border-none text-xs font-bold text-emerald-700 outline-none p-0 cursor-pointer"
                                            >
                                                <option value="pending_approval">PENDING APPROVAL</option>
                                                <option value="active">PUBLISHED</option>
                                                <option value="inactive">INACTIVE</option>
                                                <option value="rejected">REJECTED</option>
                                            </select>
                                        </div>
                                        <div className="mt-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                                            <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Featured</p>
                                            <input
                                                type="checkbox"
                                                checked={formData.isFeatured}
                                                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                                className="h-4 w-4 rounded border-indigo-300 text-primary focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                    </div>
                                </div>

                                {/* Modal Content Area — sole main scroll region */}
                                <div className="flex-1 min-h-0 min-w-0 p-4 sm:p-6 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar">
                                    {modalTab === 'general' && (
                                        <div className="ds-section-spacing animate-in fade-in slide-in-from-right-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-1.5 flex flex-col">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Product Title</label>
                                                        <input
                                                            value={formData.name}
                                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                            className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none ring-primary/5 focus:ring-2"
                                                            placeholder="e.g. Premium Basmati Rice"
                                                        />
                                                    </div>

                                                    {/* MASTER CATALOG MAPPING - Only for Seller Products */}
                                                    {(editingItem?.ownerType === 'seller' || (!editingItem && activeTab === 'seller')) && (
                                                        <div className="col-span-full p-4 bg-slate-900 rounded-3xl border border-slate-700/50 shadow-2xl relative overflow-visible group pb-2">
                                                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                <HiOutlineLink className="h-20 w-20 text-white rotate-12" />
                                                            </div>

                                                            <div className="relative z-10 flex flex-col gap-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <h4 className="text-sm font-black text-white italic tracking-tight">Hub-First Mapping</h4>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Link this item to a Master Catalog Product</p>
                                                                    </div>
                                                                    {formData.masterProductId ? (
                                                                        <Badge variant="success" className="px-3 py-1 text-[8px] font-black uppercase italic bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Currently Linked</Badge>
                                                                    ) : (
                                                                        <Badge variant="warning" className="px-3 py-1 text-[8px] font-black uppercase italic animate-pulse">Unlinked Item</Badge>
                                                                    )}
                                                                </div>

                                                                <div className="relative">
                                                                    <div className="relative group">
                                                                        <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-all" />
                                                                        <input
                                                                            type="text"
                                                                            autoComplete="off"
                                                                            name="master-search-admin"
                                                                            placeholder="Search Master Product by name..."
                                                                            onChange={(e) => searchMasterCatalog(e.target.value)}
                                                                            className="w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-2xl text-[13px] font-bold text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                                                        />
                                                                        {isSearchingMaster && <HiOutlineArrowPath className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />}
                                                                    </div>

                                                                    {showMasterSuggestions && masterSuggestions.length > 0 && (
                                                                        <div className="absolute top-full left-0 right-0 z-[9999] mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden max-h-[350px] overflow-y-auto backdrop-blur-2xl ring-2 ring-primary/20">
                                                                            <div className="p-2 border-b border-slate-800 bg-slate-800/50">
                                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Matching Master Products</span>
                                                                            </div>
                                                                            {masterSuggestions.map(m => (
                                                                                <button
                                                                                    key={m._id}
                                                                                    type="button"
                                                                                    onClick={() => handleMasterLink(m)}
                                                                                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/10 transition-all text-left border-b border-slate-800/50 last:border-0 group/sm"
                                                                                >
                                                                                    <div className="h-12 w-12 min-w-[48px] rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shadow-inner transform group-hover/sm:scale-105 transition-transform">
                                                                                        <img src={m.mainImage} alt="" className="h-full w-full object-cover opacity-90 group-hover/sm:opacity-100 transition-opacity" />
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <p className="text-[13px] font-black text-white group-hover/sm:text-primary transition-colors tracking-tight italic">{m.name}</p>
                                                                                        <div className="flex items-center gap-2 mt-1">
                                                                                            <span className="text-[9px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md uppercase tracking-widest">{m.categoryId?.name || 'Master Catalog'}</span>
                                                                                            <span className="text-[9px] font-bold text-slate-500">·</span>
                                                                                            <span className="text-[10px] font-black text-emerald-500 italic">Live Admin Item</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="opacity-0 group-hover/sm:opacity-100 transition-opacity">
                                                                                        <HiOutlinePlus className="h-5 w-5 text-primary" />
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {formData.masterProductId && (
                                                                    <div className="mt-2 flex items-center justify-between p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                                        <div className="flex items-center gap-2">
                                                                            <HiOutlineLink className="h-4 w-4 text-emerald-400" />
                                                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Success: Mapping confirmed</span>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => setFormData({ ...formData, masterProductId: null })}
                                                                            className="text-[9px] font-black text-slate-500 hover:text-rose-500 uppercase tracking-widest underline decoration-dotted transition-colors"
                                                                        >
                                                                            Clear Link
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-1.5 flex flex-col md:col-span-2">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Default unit <span className="text-rose-500">*</span></label>
                                                    <select
                                                        value={formData.unit}
                                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold outline-none cursor-pointer"
                                                    >
                                                        {PRODUCT_UNITS.map((u) => (
                                                            <option key={u.value} value={u.value}>{u.label}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-slate-400 ml-1">Slug is auto-generated from the product name on save.</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 font-medium">
                                                Complete <strong>Categories</strong>, then add <strong>Variants & pricing</strong> (sell price + hub stock per size/unit on master catalog).
                                            </p>
                                            <div className="space-y-1.5 flex flex-col">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">About this item</label>
                                                <textarea
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-semibold min-h-[160px] max-h-[260px] outline-none resize-y overflow-y-auto custom-scrollbar"
                                                    placeholder="Describe the item here..."
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1.5 flex flex-col">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Brand Name</label>
                                                    <input
                                                        value={formData.brand}
                                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none ring-primary/5 focus:ring-2"
                                                        placeholder="e.g. Amul"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {modalTab === 'category' && (
                                        <div className="ds-section-spacing animate-in fade-in slide-in-from-right-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1.5 flex flex-col">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Parent category <span className="text-rose-500">*</span></label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => goToAdminCategorySection('category')}
                                                                className="inline-flex items-center gap-1 text-[9px] font-black text-primary uppercase tracking-tight hover:underline"
                                                            >
                                                                <HiOutlineArrowTopRightOnSquare className="w-3 h-3" />
                                                                Create category
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <SearchableCategorySelect
                                                        value={formData.categoryId}
                                                        onChange={(id) =>
                                                            setFormData({
                                                                ...formData,
                                                                categoryId: id,
                                                                subcategoryId: '',
                                                            })
                                                        }
                                                        options={categories}
                                                        placeholder="Select parent category"
                                                        searchPlaceholder="Search parent categories…"
                                                        emptyLabel="No parent category matches"
                                                        helperText={
                                                            categories.length
                                                                ? `${categories.length} parent categories — type to search`
                                                                : 'Loading categories…'
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1.5 flex flex-col">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Subcategory <span className="text-rose-500">*</span></label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={!formData.categoryId}
                                                                onClick={() => goToAdminCategorySection('subcategory')}
                                                                className="inline-flex items-center gap-1 text-[9px] font-black text-primary uppercase tracking-tight hover:underline disabled:opacity-30 disabled:no-underline"
                                                            >
                                                                <HiOutlineArrowTopRightOnSquare className="w-3 h-3" />
                                                                Create subcategory
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <SearchableCategorySelect
                                                        value={formData.subcategoryId}
                                                        onChange={(id) =>
                                                            setFormData({ ...formData, subcategoryId: id })
                                                        }
                                                        options={
                                                            categories.find((p) => p._id === formData.categoryId)
                                                                ?.children || []
                                                        }
                                                        placeholder={
                                                            formData.categoryId
                                                                ? 'Select subcategory'
                                                                : 'Choose a parent category first'
                                                        }
                                                        searchPlaceholder="Search subcategories…"
                                                        emptyLabel={
                                                            formData.categoryId
                                                                ? 'No subcategory matches — create one in Categories'
                                                                : 'Select a parent category first'
                                                        }
                                                        disabled={!formData.categoryId}
                                                        helperText={
                                                            formData.categoryId
                                                                ? (() => {
                                                                      const parent = categories.find(
                                                                          (p) => p._id === formData.categoryId,
                                                                      );
                                                                      const count = parent?.children?.length || 0;
                                                                      return count
                                                                          ? `${count} subcategories under “${parent?.name}”`
                                                                          : 'No subcategories yet — use Create subcategory';
                                                                  })()
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            {editingItem?.ownerType === 'seller' && (
                                                <div className="space-y-1.5 flex flex-col pt-4 border-t border-slate-100">
                                                    <label className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest ml-1">Connect to Master Catalog (Product Normalization)</label>
                                                    <select
                                                        value={formData.masterProductId}
                                                        onChange={(e) => setFormData({ ...formData, masterProductId: e.target.value })}
                                                        className="w-full px-4 py-3 bg-indigo-50 border-none rounded-xl text-sm font-bold text-indigo-900 outline-none ring-indigo-200 focus:ring-2 cursor-pointer"
                                                    >
                                                        <option value="">No Mapping (Standalone)</option>
                                                        {products.filter(p => p.ownerType === 'admin').map(master => (
                                                            <option key={master._id} value={master._id}>
                                                                {master.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-slate-400 font-medium italic mt-1">If mapped, this seller's stock will contribute to this master product's total count on the app.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {modalTab === 'media' && (
                                        <div className="ds-section-spacing animate-in fade-in slide-in-from-right-2 duration-300">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Main Cover Photo</label>
                                                <div className="flex flex-col md:flex-row items-start gap-6">
                                                    <div className="w-48 aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center group hover:border-primary hover:bg-primary/5 transition-all cursor-pointer overflow-hidden relative">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                            onChange={(e) => handleImageUpload(e, 'main')}
                                                        />
                                                        {formData.mainImage ? (
                                                            <img src={formData.mainImage} alt="Main Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                <HiOutlinePhoto className="h-10 w-10 text-slate-200" />
                                                                <p className="text-[10px] text-slate-400 font-bold mt-2">UPLOAD</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-6 border-t border-slate-50">
                                                <div className="flex items-end justify-between gap-3">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                                        Gallery Images <span className="text-slate-300 normal-case tracking-normal font-semibold">({(formData.galleryItems || []).length}/5)</span>
                                                    </label>
                                                    <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Select multiple</div>
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

                                            <p className="text-[10px] text-slate-400 font-medium italic text-center pt-4 border-t border-slate-50 outline-none">
                                                Quick Tip: Multiple photos help users trust your products more!
                                            </p>
                                        </div>
                                    )}

                                    {modalTab === 'variants' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-bold">Variants & pricing</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        {activeTab === 'master'
                                                            ? 'Each row = one sellable option. Stock you enter is saved to the hub (shown as H in the list).'
                                                            : 'Each row = one sellable option. Stock you enter is this seller’s inventory (shown as S in the list).'}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, variants: [...formData.variants, { id: Date.now(), name: '', unit: formData.unit || DEFAULT_PRODUCT_UNIT, price: '', salePrice: '', purchasePrice: '', stock: '' }] })}
                                                    className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                                                >
                                                    + Add New Variant
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-amber-800 uppercase tracking-widest ml-1">
                                                        Low stock alert (product)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={formData.lowStockAlert}
                                                        onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
                                                        className="w-full px-3 py-2 bg-white ring-1 ring-amber-200 rounded-xl text-sm font-bold text-amber-900 outline-none"
                                                    />
                                                    <p className="text-[10px] text-amber-700/80 font-medium ml-1">
                                                        Notify when total hub/seller stock falls to this level or below.
                                                    </p>
                                                </div>
                                                
                                            </div>

                                            {formData.variants?.length > 0 ? (
                                                <div className="space-y-3">
                                                    {formData.variants.map((variant, idx) => (
                                                        <div key={variant.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-12 gap-3 items-end group relative transition-all hover:bg-slate-100/50">
                                                            <div className="col-span-full lg:col-span-3 space-y-1">
                                                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Variant Name</label>
                                                                <input
                                                                    value={variant.name}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants];
                                                                        newVariants[idx].name = e.target.value;
                                                                        setFormData({ ...formData, variants: newVariants });
                                                                    }}
                                                                    placeholder="e.g. 1kg Packet"
                                                                    className="w-full px-3 py-2.5 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/10"
                                                                />
                                                            </div>
                                                            <div className="col-span-3 lg:col-span-2 space-y-1">
                                                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vendor cost (₹)</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={variant.purchasePrice ?? ''}
                                                                    readOnly={editingItem?.ownerType === 'seller' || !!editingItem?.sellerId}
                                                                    onChange={(e) => {
                                                                        if (editingItem?.ownerType === 'seller' || !!editingItem?.sellerId) return;
                                                                        const val = e.target.value;
                                                                        const newVariants = [...formData.variants];
                                                                        newVariants[idx].purchasePrice = val;
                                                                        setFormData({ ...formData, variants: newVariants });
                                                                    }}
                                                                    placeholder="0.00"
                                                                    className={cn(
                                                                        "w-full px-3 py-2.5 ring-1 ring-slate-200 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10",
                                                                        (editingItem?.ownerType === 'seller' || !!editingItem?.sellerId) ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="col-span-3 lg:col-span-2 space-y-1">
                                                                <label className="text-[8px] font-bold text-primary uppercase tracking-widest ml-1">Sell price (₹) <span className="text-rose-500">*</span></label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={variant.salePrice ?? ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        const newVariants = [...formData.variants];
                                                                        newVariants[idx].salePrice = val;
                                                                        setFormData({
                                                                            ...formData,
                                                                            variants: newVariants,
                                                                            ...(idx === 0 ? { salePrice: val } : {}),
                                                                        });
                                                                    }}
                                                                    placeholder="0.00"
                                                                    className="w-full px-3 py-2.5 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10"
                                                                />
                                                            </div>
                                                            <div className="col-span-3 lg:col-span-2 space-y-1">
                                                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">MRP (₹)</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={variant.price ?? ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        const newVariants = [...formData.variants];
                                                                        newVariants[idx].price = val;
                                                                        setFormData({
                                                                            ...formData,
                                                                            variants: newVariants,
                                                                            ...(idx === 0 ? { price: val } : {}),
                                                                        });
                                                                    }}
                                                                    placeholder="Optional"
                                                                    className="w-full px-3 py-2.5 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/10"
                                                                />
                                                            </div>
                                                            <div className="col-span-3 lg:col-span-2 space-y-1">
                                                                <label className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest ml-1">Profit</label>
                                                                <div className="w-full px-3 py-2.5 bg-emerald-50 ring-1 ring-emerald-100 rounded-xl text-xs font-black text-emerald-700 flex items-center justify-between">
                                                                    <span>₹{(Number(variant.salePrice ?? variant.price ?? 0) - Number(variant.purchasePrice || 0)).toLocaleString()}</span>
                                                                    {Number(variant.purchasePrice) > 0 && (
                                                                        <span className="text-[8px] bg-emerald-200/50 px-1 rounded">
                                                                            {(((Number(variant.salePrice ?? variant.price ?? 0) - Number(variant.purchasePrice || 0)) / Number(variant.purchasePrice || 1)) * 100).toFixed(0)}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="col-span-2 lg:col-span-2 space-y-1">
                                                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Stock</label>
                                                                <input
                                                                    type="number"
                                                                    value={variant.stock}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        const newVariants = [...formData.variants];
                                                                        newVariants[idx].stock = val;
                                                                        const total = newVariants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
                                                                        setFormData({ ...formData, variants: newVariants, stock: total });
                                                                    }}
                                                                    placeholder="0"
                                                                    className="w-full px-3 py-2.5 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10"
                                                                />
                                                            </div>
                                                            <div className="col-span-3 lg:col-span-2 space-y-1">
                                                                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                                                                <select
                                                                    value={variant.unit || formData.unit || DEFAULT_PRODUCT_UNIT}
                                                                    onChange={(e) => {
                                                                        const newVariants = [...formData.variants];
                                                                        newVariants[idx].unit = e.target.value;
                                                                        setFormData({ ...formData, variants: newVariants });
                                                                    }}
                                                                    className="w-full px-3 py-2.5 bg-white ring-1 ring-slate-200 border-none rounded-xl text-[10px] font-semibold outline-none focus:ring-2 focus:ring-primary/10"
                                                                >
                                                                    {PRODUCT_UNITS.map((u) => (
                                                                        <option key={u.value} value={u.value}>{u.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="col-span-1 py-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newVariants = formData.variants.filter((_, i) => i !== idx);
                                                                        setFormData({ ...formData, variants: newVariants });
                                                                    }}
                                                                    className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                                >
                                                                    <HiOutlineTrash className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center">
                                                    <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
                                                        <HiOutlineSwatch className="h-6 w-6" />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Variants Added</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">Variants allow you to offer the same product in different sizes or quantities.</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            variants: [{ id: Date.now(), name: 'Default', unit: formData.unit || DEFAULT_PRODUCT_UNIT, price: '', salePrice: '', stock: '' }]
                                                        })}
                                                        className="mt-6 px-6 py-2.5 bg-white ring-1 ring-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                                                    >
                                                        Create First Variant
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="shrink-0 p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100"
                                >
                                    CLOSE
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-slate-900 text-white px-10 py-2.5 rounded-xl text-xs font-bold shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'SAVING...' : (editingItem ? 'SAVE CHANGES' : 'CREATE PRODUCT')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
                size="sm"
                footer={
                    <>
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            CANCEL
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
                        >
                            DELETE PRODUCT
                        </button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                        <HiOutlineExclamationCircle className="h-10 w-10 text-rose-500" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight">Delete Product?</h3>
                    <p className="text-sm text-slate-500 font-medium">
                        Are you sure you want to delete <span className="font-bold text-slate-900">"{itemToDelete?.name}"</span>?
                        This action cannot be undone.
                    </p>
                </div>
            </Modal>

            {/* Viewing Variants Modal */}
            <Modal
                isOpen={isVariantsViewModalOpen}
                onClose={() => setIsVariantsViewModalOpen(false)}
                title="Product Variants Details"
                size="lg"
            >
                <div className="py-2">
                    <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="h-16 w-16 bg-white rounded-xl shadow-sm overflow-hidden flex items-center justify-center border border-slate-100">
                            {viewingVariants?.mainImage || viewingVariants?.images?.[0] || viewingVariants?.galleryImages?.[0] ? (
                                <img src={viewingVariants.mainImage || viewingVariants.images?.[0] || viewingVariants.galleryImages?.[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <HiOutlineCube className="h-8 w-8 text-slate-200" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 leading-tight">{viewingVariants?.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="primary" className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5">{viewingVariants?.categoryId?.name || 'Category'}</Badge>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {viewingVariants?.unit || '—'} · {viewingVariants?.variants?.length || 0} variant(s)
                                </span>
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                    {variantPriceRangeLabel(viewingVariants)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm bg-white">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Variant Specification</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Unit Price</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Available Stock</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {viewingVariants?.variants?.map((v, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/30 transition-all cursor-default">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-700 group-hover:text-primary transition-colors">{v.name}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Variation {idx + 1}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {(() => {
                                                const { mrp, sell, hasDiscount, display } = variantPriceDisplay(v);
                                                return (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        {hasDiscount ? (
                                                            <>
                                                                <span className="text-[10px] font-bold text-slate-400 line-through">₹{mrp}</span>
                                                                <span className="text-xs font-black text-emerald-600">₹{sell}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs font-black text-slate-900">
                                                                ₹{display.toLocaleString('en-IN')}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={v.stock === 0 ? "rose" : v.stock <= 10 ? "amber" : "emerald"} className="text-[10px] font-black uppercase tracking-widest px-2 shadow-sm">
                                                {v.stock === 0 ? 'OUT OF STOCK' : `${v.stock} UNITS`}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[10px] font-bold text-slate-600 uppercase bg-slate-100 px-2 py-1 rounded-lg">
                                                {v.unit || viewingVariants?.unit || '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={() => setIsVariantsViewModalOpen(false)}
                            className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                        >
                            CLOSE VIEWER
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Quick Approval Modal */}
            <Modal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                title="Approve & Set Selling Price"
                size="sm"
                footer={
                    <>
                        <button onClick={() => setIsApproveModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Cancel</button>
                        <button 
                            onClick={handleQuickApprove}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-emerald-700 transition-all"
                        >
                            Confirm & Go Live
                        </button>
                    </>
                }
            >
                <div className="space-y-4 py-2">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Product</p>
                        <p className="text-sm font-black text-slate-900">{approveRow?.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Vendor Cost</p>
                            <p className="text-lg font-black text-blue-700">₹{approveRow?.purchasePrice || approveRow?.price}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Est. Profit</p>
                            <p className="text-lg font-black text-emerald-700">
                                ₹{(Number(approvePrice || 0) - Number(approveRow?.purchasePrice || approveRow?.price || 0)).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Final Selling Price (MRP)</label>
                        <input
                            type="number"
                            autoFocus
                            value={approvePrice}
                            onChange={(e) => setApprovePrice(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl text-xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="Set Price for Customers"
                        />
                        <p className="text-[10px] text-slate-400 italic px-1 font-medium">This is the price customers will see on the app.</p>
                    </div>
                </div>
            </Modal>
            {/* Manual Request Stock Modal */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight italic">Manual Stock Request</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{requestData.productName}</p>
                            </div>
                            <button onClick={() => setIsRequestModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all">
                                <HiOutlinePlus className="h-6 w-6 text-slate-400 rotate-45" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity to Request</label>
                                <input
                                    type="number"
                                    value={requestData.quantity}
                                    onChange={(e) => setRequestData({ ...requestData, quantity: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="e.g. 50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Special Notes for Seller</label>
                                <textarea
                                    value={requestData.notes}
                                    onChange={(e) => setRequestData({ ...requestData, notes: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none"
                                    placeholder="Optional instructions..."
                                />
                            </div>
                            <Button onClick={handleRequestStock} className="w-full h-12 rounded-2xl font-black italic text-sm tracking-tight shadow-xl shadow-primary/20">
                                Send Procurement Request
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagement;
