import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomeCategoryGrid = ({ categories, title = 'Shop by category' }) => {
    const navigate = useNavigate();

    return (
        <section className="px-4 py-4 max-w-lg mx-auto md:max-w-3xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{title}</h2>
            <div className="grid grid-cols-4 gap-3 md:gap-4">
                {categories.map((cat) => (
                    <button
                        key={String(cat.id)}
                        type="button"
                        onClick={() => navigate(`/category/${cat.id}`)}
                        className="flex flex-col items-center gap-2 text-center group"
                    >
                        <div className="w-full aspect-square rounded-2xl bg-[#E8F4FC] flex items-center justify-center p-2 overflow-hidden border border-[#d4e8f5] group-active:scale-95 transition-transform">
                            <img
                                src={cat.image}
                                alt={cat.name || 'Category'}
                                className="w-full h-full object-contain mix-blend-multiply"
                                loading="lazy"
                            />
                        </div>
                        <span className="text-[10px] md:text-xs font-semibold text-slate-800 leading-tight line-clamp-2 px-0.5">
                            {cat.name}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
};

export default HomeCategoryGrid;
