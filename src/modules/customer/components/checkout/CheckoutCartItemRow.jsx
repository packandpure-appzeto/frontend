import React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { BRAND_COLOR } from "../../constants/brandTheme";
import { cartKey } from "@/shared/utils/variantHelpers";
import { resolveOrderItemVariantLabel } from "@/shared/utils/orderItemDisplay";
import { resolveProductImageUrl } from "@/shared/utils/productDisplay";

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getVariantLabel(item) {
  const variantId = item.variantId || item.selectedVariantId || null;
  return (
    item.variantLabel ||
    item.weight ||
    resolveOrderItemVariantLabel({
      variantSlot: item.variantSlot || null,
      variantId,
      product: { variants: item.variants, unit: item.unit },
    }) ||
    null
  );
}

/**
 * Cart / checkout line item — variant label + visible +/- quantity controls.
 */
export default function CheckoutCartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  className = "",
}) {
  const productId = item.productId || item.id || item._id;
  const variantId = item.variantId || item.selectedVariantId || null;
  const lineKey = cartKey(productId, variantId);
  const variantLabel = getVariantLabel(item);
  const qty = Number(item.quantity) || 1;
  const unitPrice = Number(item.price) || 0;
  const lineTotal = unitPrice * qty;
  const imageSrc = resolveProductImageUrl(item);

  const handleMinus = () => {
    if (qty > 1) {
      onUpdateQuantity(productId, -1, variantId || undefined);
    } else {
      onRemove(productId, variantId || undefined);
    }
  };

  return (
    <article
      className={`border-b border-slate-100 pb-4 last:border-0 last:pb-0 ${className}`}
    >
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
          <img
            src={imageSrc}
            alt={item.name}
            className="h-full w-full object-contain p-1"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-sm font-bold text-slate-900">{item.name}</h4>

          {variantLabel ? (
            <div className="mt-1.5 inline-flex items-center rounded-lg border border-[#E23744]/25 bg-[#E23744]/8 px-2.5 py-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#E23744]/70">
                Variant
              </span>
              <span className="ml-1.5 text-xs font-bold text-[#E23744]">{variantLabel}</span>
            </div>
          ) : null}

          <p className="mt-1 text-xs font-medium text-slate-500">
            {formatInr(unitPrice)} each
          </p>

          <button
            type="button"
            onClick={() => onRemove(productId, variantId || undefined)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#E23744]"
          >
            <Trash2 size={12} />
            Remove
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-50 pt-3">
        <div
          className="flex min-w-[104px] items-center justify-between rounded-xl border-2 px-1 py-0.5"
          style={{ borderColor: BRAND_COLOR, backgroundColor: "#fff" }}
          role="group"
          aria-label={`Quantity for ${item.name}`}
        >
          <button
            type="button"
            onClick={handleMinus}
            className="flex h-9 w-9 items-center justify-center rounded-lg active:scale-95"
            style={{ color: BRAND_COLOR }}
            aria-label="Decrease quantity"
          >
            <Minus size={18} strokeWidth={3} />
          </button>
          <input
            type="number"
            min="0"
            value={qty}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
              if (val === '') {
                onUpdateQuantity(productId, 0 - qty, variantId || undefined);
              } else if (!isNaN(val)) {
                onUpdateQuantity(productId, val - qty, variantId || undefined);
              }
            }}
            className="w-12 bg-transparent text-center text-base font-black border-none outline-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
            style={{ color: BRAND_COLOR }}
          />
          <button
            type="button"
            onClick={() => onUpdateQuantity(productId, 1, variantId || undefined)}
            className="flex h-9 w-9 items-center justify-center rounded-lg active:scale-95"
            style={{ color: BRAND_COLOR }}
            aria-label="Increase quantity"
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        </div>

        <p className="text-lg font-black text-slate-900">{formatInr(lineTotal)}</p>
      </div>
    </article>
  );
}
