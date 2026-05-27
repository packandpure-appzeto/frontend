import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/assets/packnpure.png';
import { useSettings } from '@core/context/SettingsContext';

const Footer = () => {
    const { settings } = useSettings();
    const logoUrl = settings?.logoUrl || Logo;
    const primaryColor = settings?.primaryColor || '#E23744';

    return (
        <footer className="relative max-w-lg mx-auto md:max-w-3xl bg-[#110505] pt-16 pb-24 mt-8 text-slate-300 md:bg-gradient-to-br md:from-rose-700 md:via-rose-800 md:to-rose-900 md:pt-20 md:pb-16 md:mt-12 overflow-hidden md:rounded-t-3xl shadow-2xl">
            {/* Subtle Texture/Glow Overlay */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 blur-[150px]" style={{ backgroundColor: primaryColor }} />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-20 blur-[150px]" style={{ backgroundColor: primaryColor }} />
            </div>

            {/* Top Curved Divider */}
            <div className="absolute top-[-1px] left-0 w-full overflow-hidden leading-[0]">
                <svg className="relative block w-[calc(100%+1.3px)] h-[25px] md:h-[60px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M0,0 Q600,120 1200,0 V0 H0 Z" className="fill-white"></path>
                </svg>
            </div>

            <div className="container mx-auto px-6 md:px-10 z-10 relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">

                    {/* Brand Info */}
                    <div className="space-y-4 md:space-y-6">
                        <div className="flex items-center">
                            <img src={logoUrl} alt={`${settings?.appName || 'App'} Logo`} className="h-12 md:h-14 w-auto object-contain" />
                        </div>
                        <p className="text-sm leading-relaxed md:text-base md:leading-loose text-white/90 md:max-w-xs transition-opacity hover:opacity-100 font-medium">
                            Your daily dose of fresh, organic, and healthy products delivered straight to your door. Freshness guaranteed.
                        </p>
                        <div className="flex gap-4">
                            {settings?.facebook && <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 text-white rounded-full transition-all group active:scale-95 hover:opacity-90"><Facebook size={18} /></a>}
                            {settings?.twitter && <a href={settings.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 text-white rounded-full transition-all group active:scale-95 hover:opacity-90"><Twitter size={18} /></a>}
                            {settings?.instagram && <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 text-white rounded-full transition-all group active:scale-95 hover:opacity-90"><Instagram size={18} /></a>}
                            {settings?.youtube && <a href={settings.youtube} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 text-white rounded-full transition-all group active:scale-95 hover:opacity-90"><Youtube size={18} /></a>}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="sm:pt-4">
                        <h3 className="text-white font-bold text-base mb-3 md:text-lg md:font-black md:uppercase md:tracking-widest md:mb-6 flex items-center gap-2">
                            <span className="h-1 w-4 hidden md:block" style={{ backgroundColor: primaryColor }}></span> Quick Links
                        </h3>
                        <ul className="space-y-2 md:space-y-3">
                            <li><Link to="/" className="hover:text-rose- transition-colors text-sm md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Home</Link></li>
                            <li><Link to="/about" className="hover:text-rose- transition-colors text-sm md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>About Us</Link></li>
                            <li><Link to="/categories" className="hover:text-rose- transition-colors text-sm md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Shop</Link></li>
                            <li><Link to="/blogs" className="hover:text-rose- transition-colors text-sm md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Blogs</Link></li>
                            <li><Link to="/support" className="hover:text-rose- transition-colors text-sm md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Contact</Link></li>
                        </ul>
                    </div>

                    {/* Categories */}
                    <div className="sm:pt-4">
                        <h3 className="text-white font-bold text-base mb-3 md:text-lg md:font-black md:uppercase md:tracking-widest md:mb-6 flex items-center gap-2">
                            <span className="h-1 w-4 hidden md:block" style={{ backgroundColor: primaryColor }}></span> Categories
                        </h3>
                        <ul className="space-y-2 md:space-y-3">
                            <li><Link to="/category/fruits-vegetables" className="hover:text-rose- transition-colors text-sm md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Fruits & Vegetables</Link></li>
                            <li><Link to="/category/dairy-products" className="hover:text-rose- transition-colors text-sm md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Dairy Products</Link></li>
                            <li><Link to="/category/meat-fish" className="hover:text-rose- transition-colors text-sm md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Meat & Fish</Link></li>
                            <li><Link to="/category/bakery-snacks" className="hover:text-rose- transition-colors text-sm md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Bakery & Snacks</Link></li>
                            <li><Link to="/category/beverages" className="hover:text-rose- transition-colors text-sm md:text-base md:font-semibold flex items-center group text-white"><span className="hidden md:block w-0 h-px bg-white group-hover:w-4 group-hover:mr-2 transition-all"></span>Beverages</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="sm:pt-4">
                        <h3 className="text-white font-bold text-base mb-3 md:text-lg md:font-black md:uppercase md:tracking-widest md:mb-6 flex items-center gap-2">
                            <span className="h-1 w-4 hidden md:block" style={{ backgroundColor: primaryColor }}></span> Contact Us
                        </h3>
                        <ul className="space-y-3 md:space-y-5">
                            <li className="flex items-start gap-3 md:gap-4 group">
                                <div className="hidden md:flex h-10 w-10 rounded-xl bg-white/10 items-center justify-center text-white transition-all shrink-0 group-hover:opacity-90"><MapPin size={20} /></div>
                                <MapPin className="mt-0.5 shrink-0 md:hidden" size={16} style={{ color: primaryColor }} />
                                <span className="text-sm md:text-base text-white md:pt-1 font-medium">{settings?.address || '—'}</span>
                            </li>
                            <li className="flex items-center gap-3 md:gap-4 group">
                                <div className="hidden md:flex h-10 w-10 rounded-xl bg-white/10 items-center justify-center text-white transition-all shrink-0 group-hover:opacity-90"><Phone size={20} /></div>
                                <Phone className="shrink-0 md:hidden" size={16} style={{ color: primaryColor }} />
                                <span className="text-sm md:text-base text-white font-medium">{settings?.supportPhone || '—'}</span>
                            </li>
                            <li className="flex items-center gap-3 md:gap-4 group">
                                <div className="hidden md:flex h-10 w-10 rounded-xl bg-white/10 items-center justify-center text-white transition-all shrink-0 group-hover:opacity-90"><Mail size={20} /></div>
                                <Mail className="shrink-0 md:hidden" size={16} style={{ color: primaryColor }} />
                                <span className="text-sm md:text-base text-white font-medium">{settings?.supportEmail || '—'}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs md:flex md:justify-between md:text-left md:mt-16 md:pt-8">
                    <p className="text-xs md:text-sm text-white/60">&copy; {new Date().getFullYear()} {settings?.appName || 'App'}. All rights reserved.</p>
                    <div className="flex gap-4 justify-center md:justify-end mt-4 md:mt-0 md:gap-8">
                        <Link to="/privacy" className="hover:text-rose- text-xs md:text-sm text-white/60 transition-all">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-rose- text-xs md:text-sm text-white/60 transition-all">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
