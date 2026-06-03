import React, { useState, useEffect, useRef } from 'react';
import { User, Sparkles, X, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { customerApi } from '../../services/customerApi';
import { BRAND_COLOR, BRAND_COLOR_DARK, BRAND_COLOR_LIGHT } from '../../constants/brandTheme';

/**
 * SetNameModal
 *
 * A slide-up bottom-sheet style modal that prompts the user to enter their name.
 * Shown when:
 *   1. A new user just verified their OTP (isNewUser === true)
 *   2. An existing user has no name set (user.name is empty/null)
 *
 * Props:
 *   open       — boolean: whether to show the modal
 *   onSuccess  — (name: string) => void: called after name is saved to DB
 *   onSkip     — () => void: called when user taps "Skip for now"
 */
const SetNameModal = ({ open, onSuccess, onSkip }) => {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [visible, setVisible] = useState(false);
    const [animIn, setAnimIn] = useState(false);
    const inputRef = useRef(null);

    /* ── Mount / unmount animation ── */
    useEffect(() => {
        if (open) {
            setVisible(true);
            // Slight delay so the DOM paints before animating
            const t = setTimeout(() => {
                setAnimIn(true);
                setTimeout(() => inputRef.current?.focus(), 300);
            }, 30);
            return () => clearTimeout(t);
        } else {
            setAnimIn(false);
            const t = setTimeout(() => {
                setVisible(false);
                setName('');
            }, 350);
            return () => clearTimeout(t);
        }
    }, [open]);

    /* ── Save handler ── */
    const handleSave = async (e) => {
        e?.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error('Please enter your name');
            inputRef.current?.focus();
            return;
        }
        if (trimmed.length < 2) {
            toast.error('Name must be at least 2 characters');
            return;
        }

        setIsLoading(true);
        try {
            await customerApi.updateProfile({ name: trimmed });
            toast.success(`Welcome, ${trimmed}! 🎉`);
            onSuccess?.(trimmed);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to save name. Please try again.';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    /* ── Keyboard: Enter to submit ── */
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
    };

    if (!visible) return null;

    return (
        <>
            {/* ── Backdrop ── */}
            <div
                onClick={!isLoading ? onSkip : undefined}
                className="fixed inset-0 z-[9998] transition-all duration-300"
                style={{
                    backgroundColor: animIn ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
                    backdropFilter: animIn ? 'blur(3px)' : 'none',
                    WebkitBackdropFilter: animIn ? 'blur(3px)' : 'none',
                }}
                aria-hidden="true"
            />

            {/* ── Sheet ── */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="set-name-title"
                className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col transition-transform duration-350 ease-out"
                style={{
                    transform: animIn ? 'translateY(0%)' : 'translateY(105%)',
                    transitionTimingFunction: animIn
                        ? 'cubic-bezier(0.22, 1, 0.36, 1)'
                        : 'cubic-bezier(0.4, 0, 1, 1)',
                }}
            >
                <div className="mx-auto w-full max-w-lg rounded-t-3xl bg-white shadow-2xl overflow-hidden">

                    {/* Drag pill */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                    </div>

                    {/* Skip button (top-right) */}
                    {!isLoading && (
                        <button
                            type="button"
                            id="set-name-skip-top"
                            onClick={onSkip}
                            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            aria-label="Skip for now"
                        >
                            <X size={18} />
                        </button>
                    )}

                    <div className="px-6 pb-8 pt-4 relative">
                        {/* Icon */}
                        <div
                            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: BRAND_COLOR_LIGHT }}
                        >
                            {/* Layered icons for a premium look */}
                            <div className="relative">
                                <User size={30} style={{ color: BRAND_COLOR }} />
                                <Sparkles
                                    size={13}
                                    style={{ color: BRAND_COLOR }}
                                    className="absolute -top-1.5 -right-2.5"
                                />
                            </div>
                        </div>

                        {/* Heading */}
                        <h2
                            id="set-name-title"
                            className="text-center text-2xl font-black tracking-tight text-slate-900"
                        >
                            What&apos;s your name?
                        </h2>
                        <p className="mt-1.5 text-center text-sm text-slate-500 leading-snug">
                            Let us personalise your experience.<br />
                            You can always change this later in your profile.
                        </p>

                        {/* Form */}
                        <form onSubmit={handleSave} className="mt-7 space-y-4" noValidate>
                            <div
                                className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 bg-slate-50 transition-all"
                                style={{
                                    borderColor: name.length > 0 ? BRAND_COLOR : '#e2e8f0',
                                    boxShadow: name.length > 0
                                        ? `0 0 0 3px ${BRAND_COLOR}18`
                                        : 'none',
                                }}
                            >
                                <User size={20} className="shrink-0 text-slate-400" />
                                <input
                                    ref={inputRef}
                                    id="set-name-input"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter your full name"
                                    maxLength={60}
                                    autoComplete="name"
                                    disabled={isLoading}
                                    className="flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 disabled:opacity-60"
                                />
                                {name.trim().length >= 2 && (
                                    <div
                                        className="h-2 w-2 rounded-full shrink-0"
                                        style={{ backgroundColor: BRAND_COLOR }}
                                    />
                                )}
                            </div>

                            {/* Save button */}
                            <button
                                id="set-name-save-btn"
                                type="submit"
                                disabled={isLoading || name.trim().length < 2}
                                className="relative w-full overflow-hidden rounded-2xl py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{
                                    background: isLoading || name.trim().length < 2
                                        ? '#9ca3af'
                                        : `linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%)`,
                                    boxShadow: name.trim().length >= 2 && !isLoading
                                        ? `0 8px 24px ${BRAND_COLOR}40`
                                        : 'none',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading && name.trim().length >= 2)
                                        e.currentTarget.style.opacity = '0.92';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        Save &amp; Continue
                                        <ChevronRight size={20} />
                                    </>
                                )}
                            </button>

                            {/* Skip link */}
                            {!isLoading && (
                                <button
                                    id="set-name-skip-btn"
                                    type="button"
                                    onClick={onSkip}
                                    className="w-full py-2 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Skip for now
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SetNameModal;
