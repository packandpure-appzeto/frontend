import React, { createContext, useContext, useState, useEffect } from "react";
import { customerApi } from "../services/customerApi";
import { useAuth } from "../../../core/context/AuthContext";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

function cartKey(productId, variantId) {
  return `${String(productId || "").trim()}::${variantId ? String(variantId).trim() : ""}`;
}

function resolveVariant(product, variantId) {
  if (!variantId) return null;
  const variants = product?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  return variants.find((v) => String(v?._id || v?.id) === String(variantId)) || null;
}

function applyVariantToProduct(product, variantId) {
  if (!product) return product;
  const v = resolveVariant(product, variantId);
  if (!v) return { ...product, selectedVariantId: variantId || null };
  const sale = Number(v.salePrice ?? v.price) || 0;
  const mrp = Number(v.price) || sale;
  const stock = Number(v.stock);
  return {
    ...product,
    selectedVariantId: String(v?._id || v?.id || variantId || ""),
    price: sale || product.price,
    originalPrice: mrp || product.originalPrice,
    weight: v.name || product.weight,
    variantLabel: v.name || product.variantLabel,
    stockQty: Number.isFinite(stock) ? stock : product.stockQty,
  };
}

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Failed to load cart from localStorage", error);
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const pendingRequestsRef = React.useRef(0);

  // Clear cart locally when user logs out is handled by the useEffect dependency on isAuthenticated
  const normalizeBackendCart = (items) => {
    if (!items) return [];
    return items.map((item) => {
      const base = {
        ...item.productId,
        selectedVariantId: item.variantId || null,
      };
      const withVariant = applyVariantToProduct(base, item.variantId);
      const productId = item.productId?._id;
      const variantId = item.variantId || null;
      return {
        ...withVariant,
        id: productId, // product id (kept for backward compat)
        productId, // explicit
        variantId, // explicit
        key: cartKey(productId, variantId),
        quantity: item.quantity,
        image: item.productId.mainImage, // Handle mapping for frontend
      };
    });
  };

  const syncCart = (backendItems) => {
    // Only update state from backend if no more pending optimistic updates
    if (pendingRequestsRef.current === 0) {
      setCart(normalizeBackendCart(backendItems));
    }
  };

  const fetchCart = async () => {
    if (isAuthenticated) {
      setLoading(true);
      try {
        const response = await customerApi.getCart();
        setCart(normalizeBackendCart(response.data.result.items));
      } catch (error) {
        console.error("Failed to fetch cart from backend", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Fetch cart from backend on mount or authentication change
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      // Clear cart state and load from local storage for guests
      try {
        const savedCart = localStorage.getItem("cart");
        setCart(savedCart ? JSON.parse(savedCart) : []);
      } catch (error) {
        setCart([]);
      }
    }
  }, [isAuthenticated]);

  // Save local cart to localStorage (fallback/guest mode)
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  const addToCart = async (product) => {
    const id = product.id || product._id;
    const variantId = product.selectedVariantId || product.variantId || null;
    const key = cartKey(id, variantId);

    // Optimistic UI update for instant feedback
    setCart((prev) => {
      const existingItem = prev.find(
        (item) => cartKey(item.productId || item.id || item._id, item.variantId || item.selectedVariantId) === key,
      );
      if (existingItem) {
        return prev.map((item) =>
          cartKey(item.productId || item.id || item._id, item.variantId || item.selectedVariantId) === key
            ? {
                ...item,
                ...applyVariantToProduct({ ...item, ...product }, variantId),
                quantity: item.quantity + 1,
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          ...applyVariantToProduct(product, variantId),
          id,
          productId: id,
          variantId,
          key,
          quantity: 1,
          image: product.image || product.mainImage,
        },
      ];
    });

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.addToCart({
          productId: id,
          quantity: 1,
          variantId: variantId || undefined,
        });
        pendingRequestsRef.current -= 1;
        await syncCart(response.data.result.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        console.error("Error adding to cart on backend", error);
        // Re-fetch entire cart to ensure consistency on error
        if (pendingRequestsRef.current === 0) {
          await fetchCart();
        }
      }
    }
  };

  const removeFromCart = async (productId, variantId) => {
    const key = cartKey(productId, variantId);
    // Optimistic update
    setCart((prev) => prev.filter((item) => cartKey(item.productId || item.id || item._id, item.variantId || item.selectedVariantId) !== key));

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.removeFromCart(productId, variantId);
        pendingRequestsRef.current -= 1;
        await syncCart(response.data.result.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        console.error("Error removing from cart on backend", error);
        if (pendingRequestsRef.current === 0) {
          await fetchCart();
        }
      }
    }
  };

  const updateQuantity = async (productId, delta, variantId) => {
    const key = cartKey(productId, variantId);
    const currentItem = cart.find((item) => {
      const itemKey = cartKey(
        item.productId || item.id || item._id,
        item.variantId || item.selectedVariantId,
      );
      return itemKey === key;
    });
    if (!currentItem) return;

    const newQty = Math.max(0, currentItem.quantity + delta);

    if (newQty === 0) {
      removeFromCart(
        productId,
        variantId || currentItem.variantId || currentItem.selectedVariantId,
      );
      return;
    }

    // Optimistic update
    setCart((prev) =>
      prev.map((item) => {
        const itemKey = cartKey(
          item.productId || item.id || item._id,
          item.variantId || item.selectedVariantId,
        );
        if (itemKey === key) {
          return { ...item, quantity: newQty };
        }
        return item;
      }),
    );

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.updateCartQuantity({
          productId,
          quantity: newQty,
          variantId:
            variantId ||
            currentItem.variantId ||
            currentItem.selectedVariantId ||
            undefined,
        });
        pendingRequestsRef.current -= 1;
        await syncCart(response.data.result.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        console.error("Error updating quantity on backend", error);
        if (pendingRequestsRef.current === 0) {
          await fetchCart();
        }
      }
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await customerApi.clearCart();
        setCart([]);
      } catch (error) {
        console.error("Error clearing cart on backend", error);
      }
    } else {
      setCart([]);
    }
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        loading,
      }}>
      {children}
    </CartContext.Provider>
  );
};
