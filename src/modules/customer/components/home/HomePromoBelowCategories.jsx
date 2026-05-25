import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';

/**
 * Promotion strip / card directly under the category grid (reference: Hyperpure CTA row).
 */
const HomePromoBelowCategories = ({ promo }) => {
  const navigate = useNavigate();
  if (!promo) return null;

  return (
    <section className="px-4 pb-2 pt-1 max-w-lg mx-auto md:max-w-3xl">
      <button
        type="button"
        onClick={() => navigate('/offers')}
        className="group flex w-full overflow-hidden rounded-2xl border border-rose-100/80 bg-white text-left shadow-[0_8px_28px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_12px_32px_rgba(226,55,68,0.12)]"
        style={{
          background: `linear-gradient(105deg, ${promo.gradientFrom || '#fef2f2'} 0%, ${promo.gradientTo || '#fff7ed'} 55%, #ffffff 100%)`,
        }}
      >
        <div className="flex min-h-[100px] flex-1 flex-col justify-center gap-1 px-4 py-3.5 sm:px-5">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E23744] ring-1 ring-rose-100">
            <Sparkles className="h-3 w-3" />
            {promo.eyebrow}
          </span>
          <h3 className="text-base font-black leading-tight text-slate-900 sm:text-lg">{promo.title}</h3>
          <p className="text-xs font-medium leading-snug text-slate-600 sm:text-sm">{promo.subtitle}</p>
          <span className="mt-1 inline-flex items-center gap-0.5 text-sm font-bold text-[#E23744]">
            {promo.cta}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
        <div className="relative hidden w-[34%] shrink-0 sm:block">
          <img
            src={promo.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-linear-to-r from-white via-white/20 to-transparent" />
        </div>
      </button>
    </section>
  );
};

export default HomePromoBelowCategories;
