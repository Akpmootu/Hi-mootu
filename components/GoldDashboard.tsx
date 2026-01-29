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

// New Interface based on api.chnwt.dev/thai-gold-api structure
interface GoldPriceDetail {
  buy: string;
  sell: string;
}

interface GoldApiResponse {
  status: string;
  response: {
    date: string;
    update_time: string;
    price: {
      gold: GoldPriceDetail;      // ทองรูปพรรณ
      gold_bar: GoldPriceDetail;  // ทองคำแท่ง
      change: {
        compare_previous: string;
        compare_yesterday: string;
      };
    };
  };
}

const GoldDashboard: React.FC<Props> = ({ headlines, news }) => {
  // Real Data State
  const [goldData, setGoldData] = useState<GoldApiResponse | null>(null);
  const [loadingGold, setLoadingGold] = useState(true);
  const [goldError, setGoldError] = useState(false);
  
  // Real-time Clock State
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Forecast State
  const [forecast, setForecast] = useState<MarketForecast | null>(null);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  
  // Notification Ref
  const lastNotifiedForecast = useRef<string | null>(null);

  const containerId = "tradingview_gold_chart"; // Unique ID
  
  // 1. Real-time Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Real Thai Gold Price (Source: api.chnwt.dev)
  const fetchThaiGoldPrice = async () => {
    // Silent update if data exists, loading spinner only on first load
    if (!goldData) setLoadingGold(true);
    setGoldError(false);
    try {
      // Add timestamp to force no-cache
      const res = await fetch(`https://api.chnwt.dev/thai-gold-api/latest?t=${Date.now()}`);
      
      if (!res.ok) throw new Error(`API Connection Failed: ${res.status}`);
      
      const json: GoldApiResponse = await res.json();
      
      if (json.status === 'success' && json.response) {
        setGoldData(json);
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
    
    // Polling Price Every 30 Seconds (Faster Update)
    const interval = setInterval(fetchThaiGoldPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // 3. AI Analysis & Notification Logic
  useEffect(() => {
    const runAnalysis = async () => {
      // Need both headlines and goldData (price) to run accurate analysis
      if (headlines.length === 0 || !goldData) return;
      
      const currentPriceStr = goldData.response.price.gold_bar.sell;

      const cached = localStorage.getItem('gold_forecast_mistral');
      const lastTime = localStorage.getItem('gold_forecast_time_mistral');
      const lastSentTime = localStorage.getItem('gold_telegram_sent_time');

      let currentForecast: MarketForecast | null = null;
      let shouldAnalyze = true;

      // Logic: Analyze if cache expired (> 15 mins) OR if Price has changed significantly (optional logic, keeping time based for now)
      if (cached && lastTime && Date.now() - parseInt(lastTime) < 900000) {
        currentForecast = JSON.parse(cached);
        setForecast(currentForecast);
        shouldAnalyze = false;
      }

      if (shouldAnalyze) {
        console.log(`Running New AI Analysis with Price: ${currentPriceStr}...`);
        // Pass currentPriceStr to the AI service
        currentForecast = await analyzeMarket(headlines, 'GOLD', undefined, currentPriceStr);
        setForecast(currentForecast);
        localStorage.setItem('gold_forecast_mistral', JSON.stringify(currentForecast));
        localStorage.setItem('gold_forecast_time_mistral', Date.now().toString());
      }

      // --- History & Telegram Logic ---
      const currentPrice = currentPriceStr; // Use Sell Price of Gold Bar as reference

      if (currentForecast && currentPrice) {
        
        // 1. Save History
        const updatedHistory = saveHistory('GOLD', currentForecast, currentPrice);
        setHistory(updatedHistory);

        // 2. Check for Telegram Alert
        const ONE_HOUR = 60 * 60 * 1000;
        const lastSentStr = localStorage.getItem('gold_last_sent_forecast');
        const lastSentObj = lastSentStr ? JSON.parse(lastSentStr) : null;

        const isTimeToSend = !lastSentTime || (Date.now() - parseInt(lastSentTime) > ONE_HOUR);
        const isStateChanged = lastSentObj && lastSentObj.recommendation !== currentForecast.recommendation;

        if (isTimeToSend || isStateChanged) {
             const forecastSignature = `${currentForecast.timestamp}-${currentForecast.recommendation}`;
             if (lastNotifiedForecast.current !== forecastSignature) {
                
                await sendTelegramAlert(currentForecast, formatPrice(currentPrice));
                
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
  }, [headlines, goldData]); // Runs when headlines OR goldData updates

  // 4. TradingView Injection
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
        "interval": "30",
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
  const formatPrice = (price: string | undefined) => {
    if (!price) return "-";
    // API might return string with comma, we just ensure it looks good
    return price;
  };
  
  const getChangeColor = (change: string | undefined) => {
    if (!change) return 'bg-slate-200 text-slate-500';
    if (change.includes('-')) return 'bg-red-500 text-white';
    if (change === '0' || change === '0.00') return 'bg-slate-200 text-slate-500';
    return 'bg-green-500 text-white';
  };

  const priceData = goldData?.response.price;
  const goldBar = priceData?.gold_bar;
  const goldJewelry = priceData?.gold;
  const changeValue = priceData?.change.compare_previous || "0";

  // Date Formatters for Header
  const formattedDate = currentTime.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const formattedTime = currentTime.toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. AI Recommendation Card (Enhanced Details) */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 relative overflow-hidden group hover:shadow-lg transition-shadow">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-50 to-transparent rounded-bl-[100px] opacity-60 pointer-events-none"></div>

        {/* Header Section */}
        <div className="flex items-center justify-between mb-6 relative z-10 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <span className="bg-slate-800 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
              <i className="fas fa-robot text-lg"></i>
            </span>
            <div>
              <div className="leading-none">Hi'Mootu AI Analysis</div>
              <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                วิเคราะห์เจาะลึกอ้างอิงราคา Real-time (96.5%)
              </span>
            </div>
          </h2>
          {forecast && (
            <div className={`px-4 py-2 rounded-xl border flex flex-col items-center min-w-[100px] ${
              forecast.recommendation === 'BUY' ? 'bg-green-50 border-green-200 text-green-700' :
              forecast.recommendation === 'SELL' ? 'bg-red-50 border-red-200 text-red-700' :
              'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
               <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">คำแนะนำ</span>
               <span className="text-2xl font-black">{forecast.recommendation}</span>
               <div className="text-[10px] mt-1">
                 มั่นใจ {forecast.confidence}%
               </div>
            </div>
          )}
        </div>

        {forecast ? (
           <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Analysis & Strategy (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <i className="fas fa-align-left text-accent-gold"></i> บทวิเคราะห์ล่าสุด
                    </h3>
                    <div className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                      {forecast.reason}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <i className="fas fa-chess-knight text-blue-500"></i> กลยุทธ์การเทรด (Strategy)
                    </h3>
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 font-medium flex items-start gap-2">
                       <i className="fas fa-info-circle mt-0.5"></i>
                       {forecast.strategy || "รอสัญญาณที่ชัดเจนกว่านี้"}
                    </div>
                  </div>
              </div>

              {/* Right Column: Factors & Levels (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                  {/* Key Factors */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">ปัจจัยขับเคลื่อนตลาด</h3>
                     <ul className="space-y-2">
                        {forecast.factors && forecast.factors.length > 0 ? (
                          forecast.factors.map((factor, index) => (
                            <li key={index} className="text-sm text-slate-700 flex items-start gap-2">
                               <i className="fas fa-caret-right text-accent-gold mt-1"></i>
                               <span>{factor}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-slate-400 italic">กำลังรวบรวมข้อมูล...</li>
                        )}
                     </ul>
                  </div>

                  {/* Support / Resistance Levels */}
                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                        <div className="text-[10px] text-red-500 font-bold uppercase mb-1">แนวต้าน (Res)</div>
                        <div className="font-mono font-bold text-slate-800 text-sm">{forecast.resistance || "-"}</div>
                     </div>
                     <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                        <div className="text-[10px] text-green-500 font-bold uppercase mb-1">แนวรับ (Sup)</div>
                        <div className="font-mono font-bold text-slate-800 text-sm">{forecast.support || "-"}</div>
                     </div>
                  </div>

                  {/* Targets */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                     <span>🎯 เป้า Spot: <b>{forecast.targetPrice}</b></span>
                     <span>🇹🇭 เป้าไทย: <b>{forecast.targetPriceTHB}</b></span>
                  </div>
              </div>
           </div>
        ) : (
          <div className="space-y-4 animate-pulse">
             <div className="h-20 bg-slate-100 rounded-xl w-full"></div>
             <div className="grid grid-cols-2 gap-4">
               <div className="h-32 bg-slate-100 rounded-xl"></div>
               <div className="h-32 bg-slate-100 rounded-xl"></div>
             </div>
          </div>
        )}
      </div>

      {/* 2. Thai Gold Association Table (Source: chnwt.dev) */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden border border-slate-100 relative min-h-[200px]">
         {loadingGold && !goldData && (
            <div className="absolute inset-0 bg-white/90 z-20 flex items-center justify-center backdrop-blur-sm">
               <div className="flex flex-col items-center">
                  <i className="fas fa-sync fa-spin text-2xl text-yellow-600 mb-2"></i>
                  <span className="text-sm text-slate-500">เชื่อมต่อสมาคมค้าทองคำ...</span>
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

         {/* Red Header Section */}
         <div className="bg-gradient-to-r from-[#8B0000] to-[#A00000] text-[#FFD700] px-6 py-5 flex justify-between items-center relative">
            <div className="relative z-10">
              <h3 className="text-xl font-bold tracking-wide font-sans flex items-center gap-2">
                 <i className="fas fa-building-columns"></i> สมาคมค้าทองคำ (96.5%)
              </h3>
              <p className="text-[11px] text-white/80 mt-1 font-light flex items-center gap-1">
                 <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Live Update
              </p>
            </div>
            
            {/* Real-time Clock Section */}
            <div className="text-right relative z-10">
              <div className="text-2xl font-bold leading-none tracking-tight">
                 {formattedDate}
              </div>
              <div className="text-xs font-medium text-white/90 mt-1 bg-black/20 px-2 py-0.5 rounded inline-block">
                 อัปเดต: เวลา {formattedTime} น.
              </div>
            </div>
         </div>
         
         <div className="p-4 md:p-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Gold Bar */}
               <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-bl-full"></div>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
                    <span className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <i className="fas fa-bars text-yellow-600"></i> ทองคำแท่ง
                    </span>
                    <span className={`text-xs px-2 py-1 rounded font-bold shadow-sm ${getChangeColor(changeValue)}`}>
                      {changeValue && !changeValue.includes('-') && changeValue !== '0' ? '+' : ''}{changeValue}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-slate-500 text-sm font-medium">รับซื้อ (บาท)</span>
                     <span className="text-2xl font-bold text-[#8B0000] tracking-tight">{formatPrice(goldBar?.buy)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                     <span className="text-slate-500 text-sm font-medium">ขายออก (บาท)</span>
                     <span className="text-3xl font-bold text-[#8B0000] tracking-tight">{formatPrice(goldBar?.sell)}</span>
                  </div>
               </div>

               {/* Ornament */}
               <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-red-500/5 to-transparent rounded-bl-full"></div>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
                    <span className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <i className="fas fa-ring text-yellow-600"></i> ทองรูปพรรณ
                    </span>
                    <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">ฐานภาษี/ขายออก</span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                     <span className="text-slate-500 text-sm font-medium">รับซื้อ (บาท)</span>
                     <span className="text-2xl font-bold text-[#8B0000] tracking-tight">{formatPrice(goldJewelry?.buy)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                     <span className="text-slate-500 text-sm font-medium">ขายออก (บาท)</span>
                     <span className="text-3xl font-bold text-[#8B0000] tracking-tight">{formatPrice(goldJewelry?.sell)}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* 3. History & Backtesting */}
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
                       {formatPrice(item.priceAtTime?.toString())}
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