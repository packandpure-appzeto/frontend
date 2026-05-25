import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@core/context/AuthContext';
import { useSettings } from '@core/context/SettingsContext';
import { customerApi } from '../../services/customerApi';

const OTP_LENGTH = 4;

/**
 * Simple phone + OTP login. Supports suspended-account screen after valid OTP.
 * @param {'page'|'embedded'} variant
 * @param {() => void} [onSuccess]
 * @param {() => void} [onClose] — modal close / back
 */
const CustomerLoginForm = ({ variant = 'page', onSuccess, onClose }) => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';
    const defaultSupportEmail = settings?.supportEmail || 'support@packandpure.com';

    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [timer, setTimer] = useState(0);
    const [suspendedInfo, setSuspendedInfo] = useState({
        supportEmail: defaultSupportEmail,
        supportPhone: settings?.supportPhone || '',
    });

    const otpRefs = useRef([]);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('login_suspended');
            if (!raw) return;
            sessionStorage.removeItem('login_suspended');
            const parsed = JSON.parse(raw);
            setSuspendedInfo({
                supportEmail: parsed.supportEmail || defaultSupportEmail,
                supportPhone: parsed.supportPhone || settings?.supportPhone || '',
            });
            setStep('suspended');
        } catch {
            sessionStorage.removeItem('login_suspended');
        }
    }, [defaultSupportEmail, settings?.supportPhone]);

    useEffect(() => {
        if (timer <= 0) return undefined;
        const id = setInterval(() => setTimer((t) => t - 1), 1000);
        return () => clearInterval(id);
    }, [timer]);

    const isEmbedded = variant === 'embedded';

    const handleSendOtp = async (e) => {
        e?.preventDefault();
        if (phone.length !== 10) {
            toast.error('Enter a valid 10-digit mobile number');
            return;
        }
        setIsLoading(true);
        try {
            await customerApi.sendOtp({ phone });
            setStep('otp');
            setOtp('');
            setTimer(30);
            toast.success('OTP sent to your number');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== OTP_LENGTH) {
            toast.error('Enter the 4-digit OTP');
            return;
        }
        setIsLoading(true);
        try {
            const response = await customerApi.verifyOtp({ phone, otp });
            const { token, customer } = response.data.result;
            login({ ...customer, token, role: 'customer' });
            toast.success('Welcome back!');
            onSuccess?.(customer, token);
            if (!onSuccess) navigate('/');
            else onClose?.();
        } catch (err) {
            const payload = err.response?.data?.result;
            if (payload?.suspended || err.response?.status === 403) {
                setSuspendedInfo({
                    supportEmail: payload?.supportEmail || defaultSupportEmail,
                    supportPhone: payload?.supportPhone || settings?.supportPhone || '',
                });
                setStep('suspended');
                return;
            }
            toast.error(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpDigit = (index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const next = otp.split('');
        next[index] = digit;
        const joined = next.join('').slice(0, OTP_LENGTH);
        setOtp(joined);
        if (digit && index < OTP_LENGTH - 1) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const goBack = () => {
        if (step === 'otp') {
            setStep('phone');
            setOtp('');
            return;
        }
        if (onClose) onClose();
        else navigate(-1);
    };

    return (
        <div className={isEmbedded ? 'w-full' : 'min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-10'}>
            <div
                className={
                    isEmbedded
                        ? 'w-full'
                        : 'w-full max-w-sm mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6'
                }
            >
                {step !== 'suspended' && (
                    <div className="mb-6">
                        {(step === 'otp' || isEmbedded) && (
                            <button
                                type="button"
                                onClick={goBack}
                                className="mb-3 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>
                        )}
                        <h1 className="text-xl font-bold text-slate-900">
                            {step === 'phone' ? `Sign in to ${appName}` : 'Enter OTP'}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {step === 'phone'
                                ? 'We will send a one-time code to your mobile'
                                : `Code sent to +91 ${phone}`}
                        </p>
                    </div>
                )}

                {step === 'phone' && (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                Mobile number
                            </label>
                            <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-[#0c831f]/30 focus-within:border-[#0c831f]">
                                <span className="pl-3 pr-2 text-sm font-semibold text-slate-500 border-r border-slate-200">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) =>
                                        setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                                    }
                                    placeholder="10-digit number"
                                    className="flex-1 py-3 px-3 bg-transparent outline-none text-slate-900 font-medium"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || phone.length !== 10}
                            className="w-full py-3 rounded-xl bg-[#0c831f] text-white font-semibold disabled:opacity-50 hover:bg-[#0a701a] transition-colors"
                        >
                            {isLoading ? 'Sending...' : 'Continue'}
                        </button>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                        <div className="flex justify-center gap-2">
                            {[...Array(OTP_LENGTH)].map((_, i) => (
                                <input
                                    key={i}
                                    ref={(el) => {
                                        otpRefs.current[i] = el;
                                    }}
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={otp[i] || ''}
                                    onChange={(e) => handleOtpDigit(i, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-slate-200 focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 outline-none"
                                />
                            ))}
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || otp.length !== OTP_LENGTH}
                            className="w-full py-3 rounded-xl bg-[#0c831f] text-white font-semibold disabled:opacity-50 hover:bg-[#0a701a] transition-colors"
                        >
                            {isLoading ? 'Verifying...' : 'Verify & continue'}
                        </button>
                        <button
                            type="button"
                            disabled={timer > 0 || isLoading}
                            onClick={handleSendOtp}
                            className="w-full text-sm text-[#0c831f] font-medium disabled:text-slate-400"
                        >
                            {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
                        </button>
                    </form>
                )}

                {step === 'suspended' && (
                    <div className="text-center py-2">
                        <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                            <ShieldAlert className="w-7 h-7 text-rose-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Account suspended</h2>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                            Your account is currently suspended. Please contact the administrator.
                        </p>
                        <a
                            href={`mailto:${suspendedInfo.supportEmail}`}
                            className="mt-5 inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800"
                        >
                            <Mail size={18} />
                            {suspendedInfo.supportEmail}
                        </a>
                        {suspendedInfo.supportPhone ? (
                            <p className="mt-3 text-sm text-slate-500">
                                Or call:{' '}
                                <a
                                    href={`tel:${suspendedInfo.supportPhone}`}
                                    className="font-semibold text-[#0c831f]"
                                >
                                    {suspendedInfo.supportPhone}
                                </a>
                            </p>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => {
                                setStep('phone');
                                setOtp('');
                                setPhone('');
                            }}
                            className="mt-4 text-sm text-slate-500 hover:text-slate-800"
                        >
                            Use a different number
                        </button>
                    </div>
                )}

                {step === 'phone' && (
                    <p className="mt-4 text-[11px] text-center text-slate-400">
                        New users are registered automatically. No password needed.
                    </p>
                )}
            </div>
        </div>
    );
};

export default CustomerLoginForm;
