import React from 'react';
import { X } from 'lucide-react';
import CustomerLoginForm from './CustomerLoginForm';

/**
 * Modal wrapper for customer login.
 * Controlled by CustomerLoginProvider or local `open` prop.
 */
const CustomerLoginModal = ({ open, onClose, onSuccess, title }) => {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-login-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                onClick={onClose}
                aria-label="Close login"
            />
            <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
                    <p id="customer-login-title" className="text-sm font-bold text-slate-800">
                        {title || 'Sign in to continue'}
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5 pb-8">
                    <CustomerLoginForm
                        variant="embedded"
                        onClose={onClose}
                        onSuccess={(customer, token) => {
                            onSuccess?.(customer, token);
                            onClose?.();
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default CustomerLoginModal;
