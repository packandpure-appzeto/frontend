import React, { useState, useEffect } from 'react';
import { useLocation } from '../context/LocationContext';
import { useHomePage } from '../hooks/useHomePage';
import HomeReviewHeader from '../components/home/HomeReviewHeader';
import HomeDesktopNavbar from '../components/home/HomeDesktopNavbar';
import HomeHeroBanners from '../components/home/HomeHeroBanners';
import HomeCategorySections from '../components/home/HomeCategorySections';
import HomePromoBelowCategories from '../components/home/HomePromoBelowCategories';
import HomeFeaturedSection from '../components/home/HomeFeaturedSection';
import HomePlatformSections from '../components/home/HomePlatformSections';
import LocationDrawer from '../components/shared/LocationDrawer';
import { HOME_SECTION } from '../components/home/homeLayout';

/**
 * Customer landing (/) — mobile-first Blinkit-style home; desktop adds full-width
 * navbar, wider catalog grid, platform story sections, and product grid.
 */
const Home = () => {
    const { currentLocation } = useLocation();
    const [locationOpen, setLocationOpen] = useState(false);

    useEffect(() => {
        const hasPrompted = localStorage.getItem('hasPromptedLocation');
        if (!hasPrompted && currentLocation?.name === 'Please select your location') {
            setLocationOpen(true);
            localStorage.setItem('hasPromptedLocation', 'true');
        }
    }, [currentLocation]);

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

    const openLocation = () => setLocationOpen(true);

    return (
        <div className="min-h-full bg-gradient-to-b from-brand-50 via-white to-white pb-4 md:pb-0">
            <HomeReviewHeader
                deliveryLabel={deliveryLabel}
                outlet={outlet}
                onLocationClick={openLocation}
            />

            <HomeDesktopNavbar
                deliveryLabel={deliveryLabel}
                outlet={outlet}
                onLocationClick={openLocation}
            />

            <HomeHeroBanners slides={heroSlides} />

            {error && (
                <p className={`${HOME_SECTION} mt-2 text-center text-sm font-medium text-brand-700`}>
                    {error}
                </p>
            )}

            {isCatalogLoading ? (
                <div className={`${HOME_SECTION} py-8 text-center text-sm font-medium text-slate-400`}>
                    Loading categories…
                </div>
            ) : (
                <HomeCategorySections sections={categorySections} />
            )}

            <HomePromoBelowCategories promo={promoBelowCategories} />

            {isCommerceLoading ? (
                <div className={`${HOME_SECTION} py-12 text-center text-sm font-medium text-slate-400`}>
                    Loading products…
                </div>
            ) : (
                <HomeFeaturedSection products={products} />
            )}

            <HomePlatformSections onLocationClick={openLocation} />

            <LocationDrawer isOpen={locationOpen} onClose={() => setLocationOpen(false)} />
        </div>
    );
};

export default Home;
