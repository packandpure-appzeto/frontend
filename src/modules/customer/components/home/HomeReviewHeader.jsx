import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, Search, ShoppingCart, ScanLine } from 'lucide-react';
const HomeReviewHeader = ({ deliveryLabel, outlet, onLocationClick }) => {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100">
            <div className="px-4 pt-3 pb-3 max-w-lg mx-auto md:max-w-3xl">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <span aria-hidden>📅</span>
                    {deliveryLabel}
                </p>
                <button
                    type="button"
                    onClick={onLocationClick}
                    className="mt-1 flex items-center gap-1 text-left w-full group"
                >
                    <MapPin size={16} className="text-[#E23744] shrink-0" />
                    <span className="text-sm font-bold text-slate-900 truncate">
                        {outlet.name}: <span className="font-extrabold">{outlet.city}</span>
                    </span>
                    <ChevronDown size={16} className="text-slate-500 shrink-0 group-hover:text-slate-800" />
                </button>

                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/search')}
                        className="flex-1 flex items-center gap-2 h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400"
                    >
                        <Search size={18} className="shrink-0" />
                        <span className="text-sm font-medium truncate">
                            Search &apos;Paneer Patty&apos;
                        </span>
                    </button>
                    <button
                        type="button"
                        className="h-11 w-11 flex items-center justify-center rounded-xl border border-slate-200 text-[#E23744]"
                        aria-label="Scan"
                    >
                        <ScanLine size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/cart')}
                        className="h-11 w-11 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-700"
                        aria-label="Cart"
                    >
                        <ShoppingCart size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default HomeReviewHeader;
