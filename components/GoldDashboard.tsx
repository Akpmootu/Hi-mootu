import React, { useEffect, useState, useRef } from 'react';
import { MarketForecast, NewsArticle, AnalysisHistory } from '../types';
import { analyzeMarket } from '../services/geminiService';
import { saveHistory, getHistory } from '../services/historyService';
import { sendTelegramAlert } from '../services/telegramService';
import NewsCard from './NewsCard';

interface Props {
  headlines: string[];
  news: NewsArticle[];
}

interface ThaiGoldData {
  date: string;
  update_time: string;
  price?: {
    gold_bar?: {
      buy?: string;
      sell?: string;
    };
    gold_jewelry?: {
      buy?: string;
      sell?: string;
    };
    change?: {
      compare_previous?: string;
    };
  };
}

const GoldDashboard: React.FC<Props> = ({ headlines, news }) => {
  // Real Data State
  const [goldData, setGoldData] = useState<ThaiGoldData | null>(null);
  const [loadingGold, setLoadingGold] = useState(true);
  const [goldError, setGoldError] = useState(false);
  
  // Forecast State
  const [forecast, setForecast] = useState<MarketForecast | null>(null);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  
  // Notification Ref to prevent duplicate sends in same session
  const lastNotifiedForecast = useRef<string | null>(null);

  const containerId = "tradingview_gold_chart"; // Unique ID
  
  // 1. Fetch Real Thai Gold Price (Frequent Polling)
  const fetchThaiGoldPrice = async () => {
    // Silent update if data exists, loading spinner only on first load
    if (!goldData) setLoadingGold(true);
    setGoldError(false);
    try {
      const res = await fetch('https://api.chnwt.dev/thai-gold-api/latest');
      if (!res.ok) throw new Error(`API Connection Failed: ${res.status}`);
      const json = await res.json();
      if (json.status === 'success' && json.response) {
        setGoldData(json.response);
      } else {
        throw new Error('Invalid Data Structure');
      }
    } catch (error) {
      console.warn("Thai Gold API Error", error);
      setGoldError(true);
    } finally {
      setLoadingGold(false);
    }
  };

  useEffect(() => {
    fetchThaiGoldPrice();
    setHistory(getHistory('GOLD'));
    
    // Polling Price Every 30 Seconds for Real-time feel
    const interval = setInterval(fetchThaiGoldPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // 2. AI Analysis & Notification Logic
  useEffect(() => {
    const runAnalysis = async () => {
      if (headlines.length === 0) return;
      
      const cached = localStorage.getItem('gold_forecast_mistral');
      const lastTime = localStorage.getItem('gold_forecast_time_mistral');
      const lastSentTime = localStorage.getItem('gold_telegram_sent_time');

      let currentForecast: MarketForecast | null = null;
      let shouldAnalyze = true;

      // Logic: Analyze if cache expired (> 15 mins) OR if it's forced (e.g. major news detected - future feature)
      // We reduce cache time to 15 mins to be more "Real-time"
      if (cached && lastTime && Date.now() - parseInt(lastTime) < 900000) {
        currentForecast = JSON.parse(cached);
        setForecast(currentForecast);
        shouldAnalyze = false;
      }

      if (shouldAnalyze) {
        console.log("Running New AI Analysis...");
        currentForecast = await analyzeMarket(headlines, 'GOLD');
        setForecast(currentForecast);
        localStorage.setItem('gold_forecast_mistral', JSON.stringify(currentForecast));
        localStorage.setItem('gold_forecast_time_mistral', Date.now().toString());
      }

      // --- History & Telegram Logic ---
      if (currentForecast && goldData?.price?.gold_bar?.sell) {
        const currentPrice = goldData.price.gold_bar.sell;
        
        // 1. Save History
        const updatedHistory = saveHistory('GOLD', currentForecast, currentPrice);
        setHistory(updatedHistory);

        // 2. Check for Telegram Alert
        // We trigger alert if:
        // - No alert sent in last 1 hour OR
        // - Recommendation changed (e.g. HOLD -> BUY)
        const ONE_HOUR = 60 * 60 * 1000;
        const lastSentStr = localStorage.getItem('gold_last_sent_forecast');
        const lastSentObj = lastSentStr ? JSON.parse(lastSentStr) : null;

        const isTimeToSend = !lastSentTime || (Date.now() - parseInt(lastSentTime) > ONE_HOUR);
        const isStateChanged = lastSentObj && lastSentObj.recommendation !== currentForecast.recommendation;

        if (isTimeToSend || isStateChanged) {
             // Use ref to prevent double firing in React StrictMode/Re-renders
             const forecastSignature = `${currentForecast.timestamp}-${currentForecast.recommendation}`;
             if (lastNotifiedForecast.current !== forecastSignature) {
                
                await sendTelegramAlert(currentForecast, formatPrice(currentPrice));
                
                // Update Local Storage
                localStorage.setItem('gold_telegram_sent_time', Date.now().toString());
                localStorage.setItem('gold_last_sent_forecast', JSON.stringify(currentForecast));
                lastNotifiedForecast.current = forecastSignature;
             }
        }
      }
    };

    if (goldData) {
      runAnalysis();
    }
  }, [headlines, goldData]); // Re-run when headlines change or gold data updates

  // 3. TradingView Injection
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": "OANDA:XAUUSD",
        "interval": "30", // More granular for real-time
        "timezone": "Asia/Bangkok",
        "theme": "light",
        "style": "1",
        "locale": "th_TH",
        "enable_publishing": false,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "withdateranges": true,
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "save_image": false,
        "calendar": false,
        "support_host": "https://www.tradingview.com",
        "container_id": containerId
      });
      container.appendChild(script);
    }
  }, []);

  // Formatters
  const formatPrice = (price: string | number | undefined) => {
    if (!price) return "-";
    const clean = price.toString().replace(/,/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? price.toString() : val.toLocaleString('th-TH');
  };
  
  const getChangeColor = (change: string) => {
    if (!change) return 'bg-slate-200 text-slate-500';
    if (change.includes('-')) return 'bg-red-500 text-white';
    if (change === '0') return 'bg-slate-200 text-slate-500';
    return 'bg-green-500 text-white';
  };

  const changeValue = goldData?.price?.change?.compare_previous || "";

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. AI Recommendation Card */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group hover:shadow-lg transition-shadow">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-bl-full opacity-50 -z-0"></div>

        <div className="flex-1 z-10">
          <h2 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span className="bg-yellow-100 text-yellow-700 w-8 h-8 rounded-lg flex items-center justify-center">
              <i className="fas fa-brain text-sm"></i>
            </span>
            Hi'Mootu Real-time Analysis
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          </h2>
          {forecast ? (
             <div>
                <div className="text-slate-600 mb-4 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <i className="fas fa-quote-left text-slate-300 mr-2"></i>
                  {forecast.reason}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                   <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 font-medium">
                     <i className="fas fa-fire mr-1 text-orange-500"></i> ความมั่นใจ {forecast.confidence}%
                   </span>
                   {forecast.targetPrice && (
                     <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-100 font-medium">
                       <i className="fas fa-crosshairs mr-1"></i> Spot: {forecast.targetPrice}
                     </span>
                   )}
                   {forecast.targetPriceTHB && forecast.targetPriceTHB !== '-' && (
                     <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full border border-yellow-100 font-medium">
                       <i className="fas fa-coins mr-1"></i> ไทย: {forecast.targetPriceTHB}
                     </span>
                   )}
                </div>
             </div>
          ) : (
            <div className="space-y-3 animate-pulse">
               <div className="h-4 bg-slate-100 rounded w-full"></div>
               <div className="h-4 bg-slate-100 rounded w-2/3"></div>
            </div>
          )}
        </div>
        
        <div className={`z-10 px-8 py-6 rounded-2xl flex flex-col items-center min-w-[160px] shadow-sm border-2 ${
           forecast?.recommendation === 'BUY' ? 'bg-green-50 border-green-200 text-green-700' :
           forecast?.recommendation === 'SELL' ? 'bg-red-50 border-red-200 text-red-700' :
           'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
           <span className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">คำแนะนำ</span>
           <span className="text-4xl font-black tracking-tight">
             {forecast ? (forecast.recommendation === 'BUY' ? 'ซื้อ' : forecast.recommendation === 'SELL' ? 'ขาย' : 'ถือ') : '...'}
           </span>
           <div className="mt-2 text-[10px] bg-white/50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <i className="fab fa-telegram text-blue-500"></i> แจ้งเตือนแล้ว
           </div>
        </div>
      </div>

      {/* 2. Thai Gold Association Table (Real-time Data) */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden border border-slate-100 relative min-h-[200px]">
         {loadingGold && !goldData && (
            <div className="absolute inset-0 bg-white/90 z-20 flex items-center justify-center backdrop-blur-sm">
               <div className="flex flex-col items-center">
                  <i className="fas fa-sync fa-spin text-2xl text-yellow-600 mb-2"></i>
                  <span className="text-sm text-slate-500">เชื่อมต่อตลาด...</span>
               </div>
            </div>
         )}
         
         {goldError && !goldData && (
            <div className="absolute inset-0 bg-white z-20 flex items-center justify-center">
               <div className="flex flex-col items-center text-center p-6">
                  <i className="fas fa-wifi text-2xl text-red-400 mb-2"></i>
                  <span className="text-sm text-slate-600 mb-2">ระบบ Real-time ขัดข้องชั่วคราว</span>
                  <button onClick={fetchThaiGoldPrice} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition-colors">
                     <i className="fas fa-redo mr-1"></i> เชื่อมต่อใหม่
                  </button>
               </div>
            </div>
         )}

         <div className="bg-gradient-to-r from-[#8B0000] to-[#A00000] text-[#FFD700] px-6 py-5 flex justify-between items-center relative">
            <div className="relative z-10">
              <h3 className="text-xl font-bold tracking-wide font-sans flex items-center gap-2">
                 <i className="fas fa-building-columns"></i> ราคาทองคำไทย 96.5%
              </h3>
              <p className="text-[11px] text-white/80 mt-1 font-light flex items-center gap-1">
                 <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Live Update
              </p>
            </div>
            <div className="text-right relative z-10">
              <div className="text-2xl font-bold leading-none">{goldData?.date || "-"}</div>
              <div className="text-xs opacity-80 mt-1 bg-black/20 px-2 py-0.5 rounded inline-block">
                 ประกาศ: {goldData?.update_time || "-"} น.
              </div>
            </div>
         </div>
         
         <div className="p-4 md:p-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Gold Bar */}
               <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
                    <span className="font-bold text-slate-800 text-lg">ทองคำแท่ง</span>
                    <span className={`text-xs px-2 py-1 rounded font-bold shadow-sm ${getChangeColor(changeValue)}`}>
                      {changeValue && !changeValue.includes('-') && changeValue !== '0' ? '+' : ''}{changeValue || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-slate-500 text-sm font-medium">รับซื้อ (บาท)</span>
                     <span className="text-2xl font-bold text-[#8B0000] tracking-tight">{formatPrice(goldData?.price?.gold_bar?.buy)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                     <span className="text-slate-500 text-sm font-medium">ขายออก (บาท)</span>
                     <span className="text-3xl font-bold text-[#8B0000] tracking-tight">{formatPrice(goldData?.price?.gold_bar?.sell)}</span>
                  </div>
               </div>

               {/* Ornament */}
               <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
                    <span className="font-bold text-slate-800 text-lg">ทองรูปพรรณ</span>
                    <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">รวมกำเหน็จ (โดยประมาณ)</span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-slate-500 text-sm font-medium">รับซื้อ (บาท)</span>
                     <span className="text-2xl font-bold text-[#8B0000] tracking-tight">{formatPrice(goldData?.price?.gold_jewelry?.buy)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                     <span className="text-slate-500 text-sm font-medium">ขายออก (บาท)</span>
                     <span className="text-3xl font-bold text-[#8B0000] tracking-tight">{formatPrice(goldData?.price?.gold_jewelry?.sell)}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* 3. History & Backtesting (New Feature) */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
         <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
           <h3 className="font-bold text-slate-800 flex items-center gap-2">
             <i className="fas fa-history text-slate-400"></i> ประวัติคำแนะนำ (Backtesting)
           </h3>
           <span className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded text-slate-500">
             ล่าสุด 50 รายการ
           </span>
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-500 font-medium">
               <tr>
                 <th className="px-6 py-3">เวลา</th>
                 <th className="px-6 py-3">ราคาตลาด</th>
                 <th className="px-6 py-3">คำแนะนำ</th>
                 <th className="px-6 py-3">เป้าหมาย (THB)</th>
                 <th className="px-6 py-3 w-1/3">เหตุผล</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {history.length > 0 ? (
                 history.map((item) => (
                   <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                       {new Date(item.timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                     </td>
                     <td className="px-6 py-4 font-medium text-slate-800">
                       {formatPrice(item.priceAtTime)}
                     </td>
                     <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                         item.recommendation === 'BUY' ? 'bg-green-100 text-green-700' :
                         item.recommendation === 'SELL' ? 'bg-red-100 text-red-700' :
                         'bg-slate-100 text-slate-600'
                       }`}>
                         {item.recommendation}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-slate-500">
                       {item.targetPriceTHB || '-'}
                     </td>
                     <td className="px-6 py-4 text-slate-500 truncate max-w-xs" title={item.reason}>
                       {item.reason}
                     </td>
                   </tr>
                 ))
               ) : (
                 <tr>
                   <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                     ยังไม่มีประวัติการวิเคราะห์
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* 4. TradingView Chart */}
      <div className="h-[500px] w-full bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden relative">
          <div id={containerId} className="h-full w-full"></div>
      </div>

      {/* 5. Gold News Section */}
      <div className="pt-8 border-t border-slate-200">
         <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-8 bg-yellow-500 rounded-full"></div>
            <h3 className="text-xl font-bold text-slate-800">
              ทันข่าวทองคำ & เศรษฐกิจโลก
            </h3>
         </div>
         
         <div className="grid grid-cols-1 gap-4">
            {news.length > 0 ? (
              news.map(article => <NewsCard key={article.article_id} article={article} />)
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <i className="fas fa-circle-notch fa-spin text-slate-300 text-3xl mb-3"></i>
                <p className="text-slate-400">Hi'Mootu กำลังรวบรวมข่าวสาร...</p>
              </div>
            )}
         </div>
      </div>

    </div>
  );
};

export default GoldDashboard;