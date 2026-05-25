import React, { createContext, useContext, useRef, useState } from 'react';
import axiosInstance from '@core/api/axios';
import { normalizeCustomerProduct } from '@shared/utils/productDisplay';

const ProductDetailContext = createContext();

export const useProductDetail = () => {
    const context = useContext(ProductDetailContext);
    if (!context) {
        // console.warn('useProductDetail used outside Provider');
        return {};
    }
    return context;
};

export const ProductDetailProvider = ({ children }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const requestSeq = useRef(0);

    const openProduct = (product) => {
        const seq = ++requestSeq.current;
        setSelectedProduct(normalizeCustomerProduct(product));
        setIsOpen(true);

        // Fetch the freshest details for the sheet (description, variants, etc.).
        const id = product?._id || product?.id;
        if (!id) return;

        axiosInstance
            .get(`/products/${id}`)
            .then((res) => {
                if (requestSeq.current !== seq) return;
                if (res?.data?.success && res.data?.result) {
                    const fresh = normalizeCustomerProduct(res.data.result);
                    setSelectedProduct((prev) => ({
                        ...(prev || normalizeCustomerProduct(product)),
                        ...fresh,
                        id: fresh.id || id,
                    }));
                }
            })
            .catch(() => {
                // ignore: sheet can still render with list payload
            });
    };

    const closeProduct = () => {
        setIsOpen(false);
        // Delay clearing product to allow close animation to finish
        setTimeout(() => setSelectedProduct(null), 300);
    };

    return (
        <ProductDetailContext.Provider value={{ selectedProduct, isOpen, openProduct, closeProduct }}>
            {children}
        </ProductDetailContext.Provider>
    );
};
