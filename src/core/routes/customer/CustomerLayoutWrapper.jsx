import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';
import { WishlistProvider } from '@modules/customer/context/WishlistContext';
import { CartProvider } from '@modules/customer/context/CartContext';
import { CartAnimationProvider } from '@modules/customer/context/CartAnimationContext';
import { ProductDetailProvider } from '@modules/customer/context/ProductDetailContext';
import { LocationProvider } from '@modules/customer/context/LocationContext';
import { CustomerLoginProvider } from '@modules/customer/context/CustomerLoginContext';
import {
  applyCustomerThemeVariables,
  restoreThemeFromSettings,
} from '@modules/customer/constants/brandTheme';
import ScrollToTop from '@modules/customer/components/shared/ScrollToTop';
import CustomerLayout from '@modules/customer/components/layout/CustomerLayout';
import Loader from '@shared/components/ui/Loader';

/**
 * Customer storefront shell — forces brand CSS vars; API primaryColor is not used here.
 */
const CustomerLayoutWrapper = () => {
  const { settings } = useSettings();

  useEffect(() => {
    applyCustomerThemeVariables();
    return () => restoreThemeFromSettings(settings);
  }, [settings]);

  return (
    <CustomerLoginProvider>
      <LocationProvider>
        <WishlistProvider>
          <CartProvider>
            <CartAnimationProvider>
              <ProductDetailProvider>
                <ScrollToTop />
                <CustomerLayout>
                  <Suspense fallback={<Loader fullScreen />}>
                    <Outlet />
                  </Suspense>
                </CustomerLayout>
              </ProductDetailProvider>
            </CartAnimationProvider>
          </CartProvider>
        </WishlistProvider>
      </LocationProvider>
    </CustomerLoginProvider>
  );
};

export default CustomerLayoutWrapper;
