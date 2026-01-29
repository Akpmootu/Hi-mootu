import React, { useState } from 'react';
import { CATEGORIES } from '../constants';
import { Category } from '../types';

interface Props {
  activeCategory: Category;
  onSelectCategory: (c: Category) => void;
  children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ activeCategory, onSelectCategory, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
           
           {/* Logo / Brand */}
           <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectCategory(Category.GOLD)}>
             <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center text-white shadow-lg transform hover:scale-105 transition-transform">
               <i className="fas fa-bolt text-lg"></i>
             </div>
             <div>
               <h1 className="text-xl font-bold text-slate-800 leading-none tracking-tight font-sans">Hi'Mootu</h1>
               <span className="text-[10px] text-slate-500 font-medium tracking-wide">ข่าวทอง & การลงทุนอัจฉริยะ</span>
             </div>
           </div>

           {/* Desktop Nav */}
           <nav className="hidden md:flex items-center gap-2">
             {CATEGORIES.map(cat => (
               <button
                 key={cat.id}
                 onClick={() => onSelectCategory(cat.id)}
                 className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                   activeCategory === cat.id 
                   ? 'bg-slate-800 text-white shadow-md' 
                   : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                 }`}
               >
                 <i className={`fas ${cat.icon} mr-2 opacity-80`}></i>
                 {cat.name}
               </button>
             ))}
           </nav>

           {/* Mobile Menu Toggle */}
           <button 
             className="md:hidden text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors"
             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
           >
             <i className="fas fa-bars text-xl"></i>
           </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-sm md:hidden animate-fade-in flex flex-col pt-24 px-6 space-y-3">
           <div className="absolute top-4 right-4">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400">
                <i className="fas fa-times text-2xl"></i>
              </button>
           </div>
           
           <div className="mb-4 text-center">
              <h2 className="text-2xl font-bold text-slate-800">เมนูหลัก</h2>
           </div>

           {CATEGORIES.map(cat => (
             <button
               key={cat.id}
               onClick={() => {
                 onSelectCategory(cat.id);
                 setIsMobileMenuOpen(false);
               }}
               className={`w-full text-left px-5 py-4 rounded-2xl text-base font-medium border flex items-center shadow-sm ${
                 activeCategory === cat.id 
                 ? 'bg-slate-800 text-white border-slate-800' 
                 : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
               }`}
             >
               <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                  activeCategory === cat.id ? 'bg-white/20' : 'bg-slate-100'
               }`}>
                  <i className={`fas ${cat.icon}`}></i>
               </div>
               {cat.name}
             </button>
           ))}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
         {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <i className="fas fa-code text-slate-300"></i>
            <span className="font-semibold text-slate-700">Hi'Mootu</span>
          </div>
          <p className="text-slate-400 text-sm font-light">
            พัฒนาโดย <span className="font-medium text-slate-600">mootu.akp</span>
          </p>
          <p className="text-[10px] text-slate-300 mt-2">
            ข้อมูลเพื่อการศึกษาเท่านั้น การลงทุนมีความเสี่ยง โปรดใช้วิจารณญาณ
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;