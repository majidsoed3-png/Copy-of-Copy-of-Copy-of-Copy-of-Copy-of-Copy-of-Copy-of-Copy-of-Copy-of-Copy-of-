import React, { useState } from 'react';

interface HeaderProps {
  onReviewerLoginClick: () => void;
  onManagerLoginClick: () => void;
  onServiceProviderLoginClick: () => void;
  user: { type: 'reviewer' | 'manager' | 'serviceProvider'; name: string } | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReviewerLoginClick, onManagerLoginClick, onServiceProviderLoginClick, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-emerald-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          <button 
            className="md:hidden text-emerald-900 p-2 hover:bg-emerald-50 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="text-left md:text-right cursor-pointer" onClick={() => window.location.href = '/'}>
              <h1 className="text-lg md:text-xl font-black text-emerald-900 leading-none">منصة الوطن</h1>
              <p className="text-[9px] md:text-[10px] text-emerald-600 font-bold mt-1 tracking-tight">الرقمية للخدمات المساندة</p>
            </div>
            <div 
              className="w-10 h-10 md:w-12 md:h-12 bg-[#059669] rounded-xl flex items-center justify-center text-white shadow-lg cursor-pointer hover:rotate-3 transition-transform overflow-hidden" 
              onClick={() => window.location.href = '/'}
            >
              <span className="text-xl md:text-2xl font-black">و</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {!user && (
              <>
                <a href="#about" className="text-gray-600 hover:text-emerald-600 font-semibold transition-colors">عن المنصة</a>
                <a href="#departments" className="text-gray-600 hover:text-emerald-600 font-semibold transition-colors">الأقسام</a>
                <a href="#services" className="text-gray-600 hover:text-emerald-600 font-semibold transition-colors">الخدمات</a>
              </>
            )}
            
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                  <div className="w-8 h-8 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-500 text-[10px] font-bold">يا هلا،</p>
                    <p className="text-emerald-900 font-black text-xs">{user.name}</p>
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors"
                >
                  خروج
                </button>
              </div>
            ) : (
              <div className="relative group">
                <button className="text-gray-600 hover:text-emerald-600 font-semibold transition-colors flex items-center gap-1">
                  دخول النظام
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                  <button onClick={onReviewerLoginClick} className="block w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold transition-colors">بوابة المراجعين</button>
                  <button onClick={onServiceProviderLoginClick} className="block w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold transition-colors">بوابة مزودي الخدمات</button>
                  <button onClick={onManagerLoginClick} className="block w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold transition-colors">بوابة المدير</button>
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-emerald-50 animate-fade-in-up">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {!user ? (
              <>
                <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-600 font-bold hover:bg-emerald-50 rounded-xl transition-colors">عن المنصة</a>
                <a href="#departments" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-600 font-bold hover:bg-emerald-50 rounded-xl transition-colors">الأقسام</a>
                <a href="#services" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-600 font-bold hover:bg-emerald-50 rounded-xl transition-colors">الخدمات</a>
                <div className="pt-2 border-t border-gray-100">
                  <button onClick={() => { onReviewerLoginClick(); setIsMobileMenuOpen(false); }} className="block w-full text-right px-4 py-3 text-emerald-700 font-black">بوابة المراجعين</button>
                  <button onClick={() => { onServiceProviderLoginClick(); setIsMobileMenuOpen(false); }} className="block w-full text-right px-4 py-3 text-emerald-700 font-black">بوابة مزودي الخدمات</button>
                  <button onClick={() => { onManagerLoginClick(); setIsMobileMenuOpen(false); }} className="block w-full text-right px-4 py-3 text-emerald-700 font-black">بوابة المدير</button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="px-4 py-3 bg-emerald-50 rounded-xl">
                  <p className="text-gray-500 text-xs font-bold">مرحباً بك،</p>
                  <p className="text-emerald-900 font-black">{user.name}</p>
                </div>
                <button 
                  onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                  className="w-full text-center text-red-600 font-bold py-3 bg-red-50 rounded-xl"
                >
                  تسجيل خروج
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;