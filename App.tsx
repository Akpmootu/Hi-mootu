import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import NewsCard from './components/NewsCard';
import GoldDashboard from './components/GoldDashboard';
import StockDashboard from './components/StockDashboard';
import { fetchNews } from './services/newsService';
import { Category, NewsArticle } from './types';
import { CATEGORIES } from './constants';

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>(Category.GOLD);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNews = async (cat: Category) => {
    setLoading(true);
    // Determine news fetching strategy
    // For Stock tab, we might still want general business news to feed the AI context
    const catToFetch = cat === Category.STOCKS ? Category.BUSINESS : cat;
    
    try {
      const articles = await fetchNews(catToFetch);
      setNews(articles);
    } catch (err) {
      console.error("Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews(activeCategory);
  }, [activeCategory]);

  const renderContent = () => {
    // 1. Gold Dashboard
    if (activeCategory === Category.GOLD) {
      return <GoldDashboard headlines={news.map(n => n.title)} news={news} />;
    }
    
    // 2. Stocks Dashboard
    if (activeCategory === Category.STOCKS) {
       return <StockDashboard headlines={news.map(n => n.title)} />;
    }

    // 3. News Feed (AI News, Top, Tech, Business, etc.)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
           <h2 className="text-2xl font-bold text-slate-800">
             {CATEGORIES.find(c => c.id === activeCategory)?.name}
           </h2>
           <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
             {new Date().toLocaleDateString('th-TH')}
           </span>
        </div>

        {loading ? (
           <div className="space-y-4">
             {[1, 2, 3].map(i => (
               <div key={i} className="bg-white h-32 rounded-xl animate-pulse"></div>
             ))}
           </div>
        ) : news.length > 0 ? (
           <div className="grid grid-cols-1 gap-4">
             {news.map(article => (
               <NewsCard key={article.article_id} article={article} />
             ))}
           </div>
        ) : (
           <div className="text-center py-20 text-slate-400">
             <i className="fas fa-newspaper text-3xl mb-3 opacity-50"></i>
             <p>ยังไม่มีข่าวล่าสุดในหมวดนี้</p>
           </div>
        )}
      </div>
    );
  };

  return (
    <Layout activeCategory={activeCategory} onSelectCategory={setActiveCategory}>
      {renderContent()}
    </Layout>
  );
};

export default App;