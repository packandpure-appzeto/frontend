import React, { useState, useEffect, useRef } from 'react';
import { User, Sparkles, ChevronRight, Loader2, Mail, MapPin, Building2, FileText, Shield, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { customerApi } from '../../services/customerApi';
import { BRAND_COLOR, BRAND_COLOR_DARK, BRAND_COLOR_LIGHT } from '../../constants/brandTheme';

/**
 * SetNameModal
 *
 * A slide-up bottom-sheet style modal that prompts the user to complete their profile.
 * Shown when:
 *   1. A new user just verified their OTP (isNewUser === true)
 *   2. An existing user has no name set (user.name is empty/null)
 *
 * Props:
 *   open       — boolean: whether to show the modal
 *   onSuccess  — (name: string) => void: called after profile is saved to DB
 *   onSkip     — () => void: called when user taps "Skip for now" (kept for API compat)
 */
const SetNameModal = ({ open, onSuccess, onSkip }) => {
    const [form, setForm] = useState({
        name: '',
        address: '',
        email: '',
        businessName: '',
        businessAddress: '',
        panNo: '',
        gstNo: '',
        fssaiNumber: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [visible, setVisible] = useState(false);
    const [animIn, setAnimIn] = useState(false);
    const inputRef = useRef(null);

    /* ── Mount / unmount animation ── */
    useEffect(() => {
        if (open) {
            setVisible(true);
            const t = setTimeout(() => {
                setAnimIn(true);
                setTimeout(() => inputRef.current?.focus(), 300);
            }, 30);
            return () => clearTimeout(t);
        } else {
            setAnimIn(false);
            const t = setTimeout(() => {
                setVisible(false);
                setForm({ name: '', address: '', email: '', businessName: '', businessAddress: '', panNo: '', gstNo: '', fssaiNumber: '' });
            }, 350);
            return () => clearTimeout(t);
        }
    }, [open]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isNameValid = (name) => name.trim().length >= 2 && /[a-zA-Z]/.test(name);
    const isAddressValid = (address) => address.trim().length >= 5;
    const isPanValid = (pan) => !pan || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(pan);
    const isGstValid = (gst) => !gst || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[A-Z]{1}[0-9A-Z]{1}$/i.test(gst);
    const isFssaiValid = (fssai) => !fssai || /^[0-9]{14}$/.test(fssai);

    /* ── Save handler ── */
    const handleSave = async (e) => {
        e?.preventDefault();
        const trimmedName = form.name.trim();
        const trimmedAddress = form.address.trim();
        const trimmedEmail = form.email.trim();

        if (!isNameValid(trimmedName)) {
            toast.error('Please enter a valid name with letters (min 2 chars)');
            inputRef.current?.focus();
            return;
        }
        if (!isAddressValid(trimmedAddress)) {
            toast.error('Please enter a complete address (min 5 chars)');
            return;
        }
        if (!isEmailValid(trimmedEmail)) {
            toast.error('Please enter a valid email address');
            return;
        }
        if (!isPanValid(form.panNo.trim())) {
            toast.error('Invalid PAN Number format');
            return;
        }
        if (!isGstValid(form.gstNo.trim())) {
            toast.error('Invalid GST Number format');
            return;
        }
        if (!isFssaiValid(form.fssaiNumber.trim())) {
            toast.error('FSSAI Number must be exactly 14 digits');
            return;
        }

        setIsLoading(true);
        try {
            await customerApi.updateProfile({
                name: trimmedName,
                email: form.email.trim() || undefined,
                businessName: form.businessName.trim() || undefined,
                businessAddress: form.businessAddress.trim() || undefined,
                panNo: form.panNo.trim() || undefined,
                gstNo: form.gstNo.trim() || undefined,
                fssaiNumber: form.fssaiNumber.trim() || undefined,
            });
            toast.success(`Welcome, ${trimmedName}! 🎉`);
            onSuccess?.(trimmedName);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to save profile. Please try again.';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!visible) return null;

    const inputClass = (hasValue) => ({
        borderColor: hasValue ? BRAND_COLOR : '#e2e8f0',
        boxShadow: hasValue ? `0 0 0 3px ${BRAND_COLOR}18` : 'none',
    });

    const fieldClass = 'flex items-center gap-3 rounded-2xl border px-4 py-3 bg-slate-50 transition-all';
    const inputInnerClass = 'flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 disabled:opacity-60';

    const isFormValid = 
        isNameValid(form.name) && 
        isAddressValid(form.address) && 
        isEmailValid(form.email) &&
        isPanValid(form.panNo.trim()) &&
        isGstValid(form.gstNo.trim()) &&
        isFssaiValid(form.fssaiNumber.trim());

    return (
        <>
            {/* ── Backdrop ── */}
            <div
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
                className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col transition-transform duration-350 ease-out md:inset-0 md:items-center md:justify-center md:p-6"
                style={{
                    transform: animIn ? 'translateY(0%)' : 'translateY(105%)',
                    transitionTimingFunction: animIn
                        ? 'cubic-bezier(0.22, 1, 0.36, 1)'
                        : 'cubic-bezier(0.4, 0, 1, 1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mx-auto w-full max-w-lg rounded-t-3xl md:rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[92vh] md:max-h-[90vh] flex flex-col">

                    {/* Drag pill — mobile only */}
                    <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
                        <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                    </div>

                    {/* Fixed Header */}
                    <div className="px-6 pt-5 pb-3 shrink-0">
                        {/* Icon */}
                        <div
                            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: BRAND_COLOR_LIGHT }}
                        >
                            <div className="relative">
                                <User size={26} style={{ color: BRAND_COLOR }} />
                                <Sparkles
                                    size={12}
                                    style={{ color: BRAND_COLOR }}
                                    className="absolute -top-1.5 -right-2"
                                />
                            </div>
                        </div>

                        {/* Heading */}
                        <h2
                            id="set-name-title"
                            className="text-center text-xl font-black tracking-tight text-slate-900"
                        >
                            Complete Your Profile
                        </h2>
                        <p className="mt-1 text-center text-sm text-slate-500 leading-snug">
                            Let us personalise your experience.<br />
                            You can always update this later in your profile.
                        </p>
                    </div>

                    {/* Scrollable Form Content */}
                    <div className="px-6 pb-8 overflow-y-auto flex-1 custom-scrollbar">
                        <form onSubmit={handleSave} className="space-y-4 pt-2" noValidate>

                            {/* ── Personal Info Section ── */}
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Personal Info</p>

                            {/* Name */}
                            <div className={fieldClass} style={inputClass(form.name.length > 0)}>
                                <User size={18} className="shrink-0 text-slate-400" />
                                <input
                                    ref={inputRef}
                                    id="set-name-input"
                                    type="text"
                                    value={form.name}
                                    onChange={handleChange('name')}
                                    placeholder="Full name *"
                                    maxLength={60}
                                    autoComplete="name"
                                    disabled={isLoading}
                                    className={inputInnerClass}
                                />
                                {form.name.trim().length >= 2 && (
                                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: BRAND_COLOR }} />
                                )}
                            </div>

                            {/* Address */}
                            <div className={fieldClass} style={inputClass(form.address.length > 0)}>
                                <MapPin size={18} className="shrink-0 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={handleChange('address')}
                                    placeholder="Your address *"
                                    maxLength={200}
                                    autoComplete="street-address"
                                    disabled={isLoading}
                                    className={inputInnerClass}
                                />
                            </div>

                            {/* Email */}
                            <div className={fieldClass} style={inputClass(form.email.length > 0)}>
                                <Mail size={18} className="shrink-0 text-slate-400" />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange('email')}
                                    placeholder="Email address *"
                                    maxLength={100}
                                    autoComplete="email"
                                    disabled={isLoading}
                                    className={inputInnerClass}
                                />
                            </div>

                            {/* ── Business Info Section ── */}
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1 pt-2">Business Info <span className="normal-case font-medium text-slate-300">(optional)</span></p>

                            {/* Business Name */}
                            <div className={fieldClass} style={inputClass(form.businessName.length > 0)}>
                                <Building2 size={18} className="shrink-0 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.businessName}
                                    onChange={handleChange('businessName')}
                                    placeholder="Business name"
                                    maxLength={100}
                                    disabled={isLoading}
                                    className={inputInnerClass}
                                />
                            </div>

                            {/* Business Address */}
                            <div className={fieldClass} style={inputClass(form.businessAddress.length > 0)}>
                                <MapPin size={18} className="shrink-0 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.businessAddress}
                                    onChange={handleChange('businessAddress')}
                                    placeholder="Business address"
                                    maxLength={200}
                                    disabled={isLoading}
                                    className={inputInnerClass}
                                />
                            </div>

                            {/* PAN No */}
                            <div className={fieldClass} style={inputClass(form.panNo.length > 0)}>
                                <FileText size={18} className="shrink-0 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.panNo}
                                    onChange={handleChange('panNo')}
                                    placeholder="PAN number"
                                    maxLength={10}
                                    disabled={isLoading}
                                    className={`${inputInnerClass} uppercase`}
                                />
                            </div>

                            {/* GST No */}
                            <div className={fieldClass} style={inputClass(form.gstNo.length > 0)}>
                                <Shield size={18} className="shrink-0 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.gstNo}
                                    onChange={handleChange('gstNo')}
                                    placeholder="GST number"
                                    maxLength={15}
                                    disabled={isLoading}
                                    className={`${inputInnerClass} uppercase`}
                                />
                            </div>

                            {/* FSSAI */}
                            <div className={fieldClass} style={inputClass(form.fssaiNumber.length > 0)}>
                                <Leaf size={18} className="shrink-0 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.fssaiNumber}
                                    onChange={handleChange('fssaiNumber')}
                                    placeholder="FSSAI number"
                                    maxLength={14}
                                    disabled={isLoading}
                                    className={inputInnerClass}
                                />
                            </div>

                            {/* Save button */}
                            <button
                                id="set-name-save-btn"
                                type="submit"
                                disabled={isLoading || !isFormValid}
                                className="relative w-full overflow-hidden rounded-2xl py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                                style={{
                                    background: isLoading || !isFormValid
                                        ? '#9ca3af'
                                        : `linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%)`,
                                    boxShadow: isFormValid && !isLoading
                                        ? `0 8px 24px ${BRAND_COLOR}40`
                                        : 'none',
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
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SetNameModal;
