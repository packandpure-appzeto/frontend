import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { WishlistProvider } from '@modules/customer/context/WishlistContext';
import { CartProvider } from '@modules/customer/context/CartContext';
import { CartAnimationProvider } from '@modules/customer/context/CartAnimationContext';
import { ProductDetailProvider } from '@modules/customer/context/ProductDetailContext';
import { LocationProvider } from '@modules/customer/context/LocationContext';
import { CustomerLoginProvider } from '@modules/customer/context/CustomerLoginContext';
import ScrollToTop from '@modules/customer/components/shared/ScrollToTop';
import CustomerLayout from '@modules/customer/components/layout/CustomerLayout';
import Loader from '@shared/components/ui/Loader';

const CustomerLayoutWrapper = () => (
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

export default CustomerLayoutWrapper;
