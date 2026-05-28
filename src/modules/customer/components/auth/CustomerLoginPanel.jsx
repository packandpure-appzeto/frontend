import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';
import { brandColor, brandLogo } from '../../constants/brandTheme';
import CustomerLoginForm from './CustomerLoginForm';

/**
 * Shared login UI — used by modal and /login page.
 */
const CustomerLoginPanel = ({
    title,
    subtitle = 'Log in or Sign up',
    onSuccess,
    onClose,
    showClose = true,
    className = '',
}) => {
    const { settings } = useSettings();
    const primary = brandColor(settings);
    const logoUrl = brandLogo(settings);
    const appName = settings?.appName || 'Pack & Pure';

    return (
        <div className={className}>
            <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <img src={logoUrl} alt={appName} className="h-full w-full object-contain p-1.5" />
            </div>

            <h2
                id="customer-login-title"
                className="text-center text-[1.35rem] font-black leading-tight tracking-tight text-slate-900"
            >
                {title || "India's last minute app"}
            </h2>
            {subtitle ? (
                <p className="mt-1 text-center text-base font-semibold text-slate-800">{subtitle}</p>
            ) : null}

            <div className="mt-8 text-left">
                <CustomerLoginForm
                    variant="embedded"
                    onClose={onClose}
                    onSuccess={onSuccess}
                />
            </div>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-500">
                By continuing, you agree to our{' '}
                <Link
                    to="/terms"
                    onClick={onClose}
                    className="font-semibold underline underline-offset-2"
                    style={{ color: primary }}
                >
                    Terms of service
                </Link>{' '}
                &amp;{' '}
                <Link
                    to="/privacy"
                    onClick={onClose}
                    className="font-semibold underline underline-offset-2"
                    style={{ color: primary }}
                >
                    Privacy policy
                </Link>
            </p>
        </div>
    );
};

export default CustomerLoginPanel;
