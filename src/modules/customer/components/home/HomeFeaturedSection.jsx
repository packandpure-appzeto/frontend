import React from 'react';
import { useNavigate } from 'react-router-dom';
import HomeProductCard from './HomeProductCard';

const HomeFeaturedSection = ({ products, title = 'Popular picks' }) => {
    const navigate = useNavigate();

    return (
        <section className="px-4 py-4 pb-4 max-w-lg mx-auto md:max-w-3xl space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                <button
                    type="button"
                    onClick={() => navigate('/categories')}
                    className="text-sm font-semibold text-[#E23744]"
                >
                    See all
                </button>
            </div>
            <div className="space-y-3">
                {products.map((p) => (
                    <HomeProductCard
                        key={p.id}
                        product={p}
                        onAdd={() => navigate(`/product/${p.id}`)}
                    />
                ))}
            </div>
        </section>
    );
};

export default HomeFeaturedSection;
