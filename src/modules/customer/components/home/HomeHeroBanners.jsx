import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SLIDE_MS = 4500;
const SLIDE_H = 'min-h-[168px] sm:min-h-[188px]';

function goToHeroLink(navigate, linkType, linkValue) {
  const v = linkValue != null ? String(linkValue).trim() : '';
  switch (linkType) {
    case 'category':
    case 'subcategory':
      if (v) navigate(`/category/${v}`);
      else navigate('/categories');
      break;
    case 'product':
      if (v) navigate(`/product/${v}`);
      else navigate('/search');
      break;
    case 'header':
      if (v) navigate(`/category/${v}`);
      else navigate('/categories');
      break;
    case 'url':
      if (v && /^https?:\/\//i.test(v)) window.open(v, '_blank', 'noopener,noreferrer');
      break;
    default:
      navigate('/offers');
  }
}

/**
 * Full-width hero carousel — Pack & Pure style (split promo + full-bleed slides).
 */
const HomeHeroBanners = ({ slides = [] }) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback(
    (dir) => {
      if (!count) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1) return undefined;
    const t = setInterval(() => go(1), SLIDE_MS);
    return () => clearInterval(t);
  }, [count, go]);

  if (!count) return null;

  return (
    <section className="w-full -mt-px">
      <div className="relative overflow-hidden bg-slate-100">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="w-full shrink-0">
              {slide.layout === 'fullBleed' ? (
                <button
                  type="button"
                  onClick={() =>
                    goToHeroLink(navigate, slide.linkType || 'none', slide.linkValue)
                  }
                  className={cn('relative block w-full', SLIDE_H)}
                >
                  <img
                    src={slide.image}
                    alt={slide.alt || ''}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                </button>
              ) : (
                <div
                  className={cn(
                    'flex items-center border-y border-black/[0.04] px-5 py-5 sm:px-8',
                    SLIDE_H,
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${slide.bgFrom} 0%, ${slide.bgTo} 100%)`,
                  }}
                >
                  <div className="relative z-10 flex max-w-[58%] flex-col items-start gap-1.5 text-left">
                    <h3 className="text-2xl font-black leading-none tracking-tight text-[#1A1A1A] sm:text-[1.65rem]">
                      {slide.headline}{' '}
                      <span style={{ color: slide.accent }}>{slide.headlineAccent}</span>
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600">at</span>
                      <span
                        className="rounded-lg px-2 py-0.5 text-lg font-black text-white shadow-sm"
                        style={{ backgroundColor: slide.accent }}
                      >
                        {slide.badge}
                      </span>
                      <span className="text-xs font-black text-slate-700">{slide.badgeSuffix}</span>
                    </div>
                    <p className="max-w-[200px] text-[11px] font-semibold leading-snug text-slate-500">
                      {slide.sub}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/categories')}
                      className="mt-2 flex items-center gap-1 rounded-2xl px-5 py-2.5 text-xs font-black tracking-wide text-white shadow-lg shadow-rose-200/60"
                      style={{ backgroundColor: slide.ctaBg || '#E23744' }}
                    >
                      {slide.cta}
                      <ChevronRight className="h-4 w-4" strokeWidth={3} />
                    </button>
                  </div>
                  <div className="pointer-events-none absolute bottom-0 right-0 top-0 flex w-[45%] items-end justify-center sm:w-[42%]">
                    <img
                      src={slide.image}
                      alt=""
                      className="max-h-[140px] w-auto object-contain object-bottom drop-shadow-md sm:max-h-[160px]"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {count > 1 && (
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-6 bg-[#E23744]' : 'w-1.5 bg-white/80 ring-1 ring-slate-300/80',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeHeroBanners;
