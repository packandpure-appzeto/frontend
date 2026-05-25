import React from 'react';
import { Heart } from 'lucide-react';

/**
 * B2B-style product row card (reference: Hyperpure listing).
 */
const HomeProductCard = ({ product, onAdd }) => {
    const { name, weight, price, originalPrice, image, bulkLabel, unitPrice, inStock = true } =
        product;

    return (
        <article className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {!inStock && (
                <div className="px-3 py-2 bg-rose-50 text-rose-600 text-xs font-semibold">
                    Out of stock.{' '}
                    <button type="button" className="underline font-bold">
                        Notify me
                    </button>
                </div>
            )}
            <div className="p-3 flex gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                        {name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{weight}</p>
                    <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                        <span
                            className={`text-lg font-bold ${inStock ? 'text-slate-900' : 'text-slate-400'}`}
                        >
                            ₹{price}
                        </span>
                        {unitPrice && (
                            <span className="text-xs text-slate-400">{unitPrice}</span>
                        )}
                        {originalPrice > price && (
                            <span className="text-xs text-slate-400 line-through">
                                ₹{originalPrice}
                            </span>
                        )}
                    </div>
                    {bulkLabel && inStock && (
                        <div className="mt-2 flex items-center justify-between rounded-lg bg-sky-50 px-2 py-1.5 text-xs">
                            <span className="font-semibold text-sky-800">{bulkLabel}</span>
                            <button type="button" className="font-bold text-[#E23744]">
                                Add 3
                            </button>
                        </div>
                    )}
                </div>
                <div className="relative shrink-0 w-[88px] flex flex-col items-center">
                    <button
                        type="button"
                        className="absolute top-0 right-0 p-1 text-slate-300"
                        aria-label="Wishlist"
                    >
                        <Heart size={18} />
                    </button>
                    <img
                        src={image}
                        alt=""
                        className="w-[72px] h-[72px] object-contain mt-4"
                        loading="lazy"
                    />
                    <button
                        type="button"
                        disabled={!inStock}
                        onClick={() => onAdd?.(product)}
                        className={`mt-2 w-full py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                            inStock
                                ? 'border-[#E23744] text-[#E23744] bg-white hover:bg-rose-50'
                                : 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                        }`}
                    >
                        ADD +
                    </button>
                </div>
            </div>
        </article>
    );
};

export default HomeProductCard;
