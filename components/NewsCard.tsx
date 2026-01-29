import React, { useState } from 'react';
import { NewsArticle } from '../types';
import { summarizeNews } from '../services/geminiService';

interface Props {
  article: NewsArticle;
}

const NewsCard: React.FC<Props> = ({ article }) => {
  const [summary, setSummary] = useState<string | null>(article.aiSummary || null);
  const [loading, setLoading] = useState(false);

  const handleSummary = async () => {
    if (summary) return;
    setLoading(true);
    const res = await summarizeNews(article.content || article.description || article.title);
    setSummary(res);
    setLoading(false);
  };

  // Helper function to determine source branding
  const getSourceConfig = (sourceId: string | undefined) => {
    const id = (sourceId || '').toLowerCase();
    
    if (id.includes('thairath')) return { 
      color: 'bg-green-100 text-green-700 border-green-200', 
      icon: 'fa-leaf',
      label: 'ไทยรัฐ'
    };
    if (id.includes('khaosod')) return { 
      color: 'bg-rose-100 text-rose-700 border-rose-200', 
      icon: 'fa-fire',
      label: 'ข่าวสด'
    };
    if (id.includes('matichon')) return { 
      color: 'bg-slate-100 text-slate-700 border-slate-300', 
      icon: 'fa-book-open',
      label: 'มติชน'
    };
    if (id.includes('prachachat')) return { 
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
      icon: 'fa-briefcase',
      label: 'ประชาชาติ'
    };
    if (id.includes('bangkok') || id.includes('post')) return { 
      color: 'bg-blue-100 text-blue-700 border-blue-200', 
      icon: 'fa-newspaper',
      label: 'Bangkok Post'
    };
    if (id.includes('manager') || id.includes('mgr')) return { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      icon: 'fa-bullhorn',
      label: 'ผู้จัดการ'
    };
    if (id.includes('sanook')) return { 
      color: 'bg-red-100 text-red-700 border-red-200', 
      icon: 'fa-s',
      label: 'Sanook'
    };
    if (id.includes('standard')) return { 
      color: 'bg-slate-800 text-white border-slate-900', 
      icon: 'fa-microphone-lines',
      label: 'The Standard'
    };
    if (id.includes('pptv')) return { 
      color: 'bg-cyan-100 text-cyan-700 border-cyan-200', 
      icon: 'fa-tv',
      label: 'PPTV'
    };

    // Default
    return { 
      color: 'bg-slate-100 text-slate-500 border-slate-200', 
      icon: 'fa-rss',
      label: sourceId || 'News'
    };
  };

  const branding = getSourceConfig(article.source_id);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row h-full">
        {/* Image (Mobile: Top, Desktop: Left) */}
        <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden bg-slate-100 group">
           <img 
             src={article.image_url || `https://picsum.photos/seed/${article.article_id}/400/300`} 
             alt="News"
             className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
             onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/400/300?grayscale' }}
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
           <div className="flex items-center justify-between mb-3">
             {/* Styled Source Badge */}
             <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-semibold shadow-sm ${branding.color}`}>
               <i className={`fas ${branding.icon}`}></i>
               <span>{branding.label}</span>
             </div>
             
             <span className="text-[10px] text-slate-400 font-medium">
               <i className="far fa-clock mr-1"></i>
               {new Date(article.pubDate).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.
             </span>
           </div>

           <h3 className="text-lg font-semibold text-slate-800 leading-snug mb-3 hover:text-blue-600 transition-colors cursor-pointer" onClick={() => window.open(article.link, '_blank')}>
             {article.title}
           </h3>

           <div className="flex-1">
             {loading ? (
               <div className="text-sm text-slate-400 flex items-center gap-2 animate-pulse p-3 bg-slate-50 rounded-lg">
                 <i className="fas fa-circle-notch fa-spin text-accent-gold"></i> Hi'Mootu AI กำลังอ่านข่าว...
               </div>
             ) : summary ? (
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 leading-relaxed animate-fade-in">
                 <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-purple-600">
                    <i className="fas fa-magic"></i> สรุปโดย AI
                 </div>
                 {summary}
               </div>
             ) : (
               <p className="text-sm text-slate-500 line-clamp-2 font-light">
                 {article.description || "คลิกเพื่ออ่านรายละเอียดข่าวเพิ่มเติม..."}
               </p>
             )}
           </div>

           <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
             {!summary && (
               <button 
                 onClick={handleSummary}
                 className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full"
               >
                 <i className="fas fa-wand-magic-sparkles text-accent-gold"></i> ให้ AI สรุป
               </button>
             )}
             <a 
               href={article.link} 
               target="_blank" 
               rel="noopener noreferrer"
               className="ml-auto text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
             >
               อ่านฉบับเต็ม <i className="fas fa-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
             </a>
           </div>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;