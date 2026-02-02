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
    <div className="min-h-screen flex flex-col">
      
      {/* Header with Glassmorphism */}
      <header className="sticky top-0 z-50 transition-all duration-300 backdrop-blur-md bg-white/80 border-b border-white/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
           
           {/* Logo / Brand */}
           <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onSelectCategory(Category.GOLD)}>
             <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center text-white shadow-lg transform group-hover:rotate-12 transition-transform duration-300">
               <i className="fas fa-bolt text-lg"></i>
             </div>
             <div>
               <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 leading-none tracking-tight font-sans">Hi'Mootu</h1>
               <span className="text-[10px] text-slate-500 font-medium tracking-wide">ข่าวทอง & การลงทุนอัจฉริยะ</span>
             </div>
           </div>

           {/* Desktop Nav */}
           <nav className="hidden md:flex items-center gap-2">
             {CATEGORIES.map(cat => (
               <button
                 key={cat.id}
                 onClick={() => onSelectCategory(cat.id)}
                 className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                   activeCategory === cat.id 
                   ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-md transform scale-105' 
                   : 'text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-800'
                 }`}
               >
                 <i className={`fas ${cat.icon} ${
                   activeCategory === cat.id ? 'text-yellow-400' : cat.color || 'text-slate-400'
                 } transition-colors`}></i>
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
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl md:hidden animate-fade-in flex flex-col pt-24 px-6 space-y-3">
           <div className="absolute top-4 right-4">
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                <i className="fas fa-times text-lg"></i>
              </button>
           </div>
           
           <div className="mb-6 text-center">
              <div className="inline-block p-3 bg-slate-50 rounded-full mb-3 shadow-inner">
                <i className="fas fa-compass text-3xl text-slate-300"></i>
              </div>
              <h2 className="text-xl font-bold text-slate-800">เมนูหลัก</h2>
              <p className="text-xs text-slate-400">เลือกหมวดหมู่ที่ต้องการ</p>
           </div>

           {CATEGORIES.map(cat => (
             <button
               key={cat.id}
               onClick={() => {
                 onSelectCategory(cat.id);
                 setIsMobileMenuOpen(false);
               }}
               className={`w-full text-left px-5 py-4 rounded-2xl text-base font-medium border flex items-center shadow-sm transition-all ${
                 activeCategory === cat.id 
                 ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white border-transparent ring-2 ring-slate-200' 
                 : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300 hover:shadow-md'
               }`}
             >
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 shadow-sm ${
                  activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-50 ' + cat.color
               }`}>
                  <i className={`fas ${cat.icon}`}></i>
               </div>
               <span className="flex-1">{cat.name}</span>
               {activeCategory === cat.id && <i className="fas fa-check-circle text-yellow-400"></i>}
             </button>
           ))}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
         {children}
      </main>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-slate-200 py-8 mt-auto relative z-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs shadow-md">
                <i className="fas fa-terminal"></i>
            </span>
            <span className="font-bold text-slate-700 text-lg">Hi'Mootu</span>
          </div>
          <p className="text-slate-500 text-sm font-light mb-4">
            พัฒนาโดย <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">IT SSJ Satun 2569</span> 
            <i className="fas fa-heart text-red-400 ml-1 animate-pulse"></i>
          </p>
          <div className="flex justify-center gap-4 text-slate-400 mb-4">
             <i className="fab fa-github hover:text-slate-800 transition-colors cursor-pointer text-xl"></i>
             <i className="fab fa-facebook hover:text-blue-600 transition-colors cursor-pointer text-xl"></i>
             <i className="fab fa-line hover:text-green-500 transition-colors cursor-pointer text-xl"></i>
          </div>
          <p className="text-[10px] text-slate-400">
            *ข้อมูลเพื่อการศึกษาเท่านั้น การลงทุนมีความเสี่ยง โปรดใช้วิจารณญาณ
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;