import React, { useState } from 'react';
import { useLocation } from '../context/LocationContext';
import { useHomePage } from '../hooks/useHomePage';
import HomeReviewHeader from '../components/home/HomeReviewHeader';
import HomeHeroBanners from '../components/home/HomeHeroBanners';
import HomeCategorySections from '../components/home/HomeCategorySections';
import HomePromoBelowCategories from '../components/home/HomePromoBelowCategories';
import HomeFeaturedSection from '../components/home/HomeFeaturedSection';
import LocationDrawer from '../components/shared/LocationDrawer';

/**
 * Customer landing (/) — category tree + hero load from the API by default; set
 * `VITE_HOME_STATIC_CATALOG=true` for fully static catalog/hero. Products load when map
 * location is set and/or `VITE_ENABLE_HOME_API=true`.
 */
const Home = () => {
    const { currentLocation } = useLocation();
    const [locationOpen, setLocationOpen] = useState(false);

    const {
        deliveryLabel,
        outlet,
        heroSlides,
        promoBelowCategories,
        categorySections,
        products,
        isCatalogLoading,
        isCommerceLoading,
        error,
    } = useHomePage(currentLocation);

    return (
        <div className="min-h-screen bg-brand-50/40 pb-4">
            <HomeReviewHeader
                deliveryLabel={deliveryLabel}
                outlet={outlet}
                onLocationClick={() => setLocationOpen(true)}
            />

            <HomeHeroBanners slides={heroSlides} />

            {error && (
                <p className="mx-4 mt-2 text-center text-sm text-brand-700 font-medium">{error}</p>
            )}

            {isCatalogLoading ? (
                <div className="px-4 py-8 text-center text-slate-400 text-sm font-medium">
                    Loading categories…
                </div>
            ) : (
                <HomeCategorySections sections={categorySections} />
            )}

            <HomePromoBelowCategories promo={promoBelowCategories} />

            {isCommerceLoading ? (
                <div className="px-4 py-12 text-center text-slate-400 text-sm font-medium">
                    Loading products…
                </div>
            ) : (
                <HomeFeaturedSection products={products} />
            )}

            <LocationDrawer isOpen={locationOpen} onClose={() => setLocationOpen(false)} />
        </div>
    );
};

export default Home;
