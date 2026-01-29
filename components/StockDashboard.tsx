import React, { useEffect, useState } from 'react';
import { TARGET_STOCKS } from '../constants';
import { StockItem, AnalysisHistory } from '../types';
import { analyzeMarket } from '../services/geminiService';
import { saveHistory, getHistory } from '../services/historyService';

interface Props {
  headlines: string[];
}

const StockDashboard: React.FC<Props> = ({ headlines }) => {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State to track selected stock for history view
  const [selectedStockHistory, setSelectedStockHistory] = useState<{symbol: string, history: AnalysisHistory[]} | null>(null);

  useEffect(() => {
    const initStocks = async () => {
      // 1. Mock Data
      const baseStocks = TARGET_STOCKS.map(s => ({
        ...s,
        price: Math.random() * 500 + 100,
        change: (Math.random() - 0.5) * 5,
      }));
      setStocks(baseStocks);

      // 2. AI Analysis Loop
      const updatedStocks = await Promise.all(baseStocks.map(async (stock) => {
        const cacheKey = `stock_forecast_mistral_${stock.symbol}`;
        const cached = localStorage.getItem(cacheKey);
        
        let forecast = null;

        if (cached) {
          forecast = JSON.parse(cached);
        } else {
           // Delay to avoid rate limit
           await new Promise(r => setTimeout(r, Math.random() * 1500));
           forecast = await analyzeMarket(headlines, 'STOCK', stock.symbol);
           localStorage.setItem(cacheKey, JSON.stringify(forecast));
        }

        // Auto-save history
        if (forecast) {
          saveHistory(stock.symbol, forecast, stock.price.toFixed(2));
        }

        return { ...stock, forecast };
      }));

      setStocks(updatedStocks);
      setLoading(false);
    };

    if (headlines.length > 0) initStocks();
    else if (stocks.length === 0) initStocks(); // Load even if no news (AI will use generic context)
  }, [headlines]);

  const viewHistory = (symbol: string) => {
    const hist = getHistory(symbol);
    setSelectedStockHistory({ symbol, history: hist });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <i className="fas fa-globe-americas"></i> หุ้นต่างประเทศ (Dime)
          </h2>
          <p className="opacity-90 text-sm font-light">วิเคราะห์เชิงลึกด้วย Mistral AI จาก Hi'Mootu</p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
           <i className="fas fa-chart-line text-9xl"></i>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-100">
           <i className="fas fa-spinner fa-spin text-3xl mb-3 text-emerald-500"></i>
           <p className="text-slate-500">AI กำลังวิเคราะห์งบการเงินและข่าว...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stocks.map((stock) => (
            <div key={stock.symbol} className="bg-white p-5 rounded-xl shadow-soft border border-slate-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
               
               {/* Stock Header */}
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-xl text-slate-800">{stock.symbol}</span>
                     <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{stock.name}</span>
                   </div>
                   <div className={`text-sm font-bold mt-1 ${stock.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                     ${stock.price.toFixed(2)} ({stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%)
                   </div>
                 </div>
                 
                 {/* Recommendation Badge */}
                 <div className={`px-4 py-2 rounded-lg text-center min-w-[80px] ${
                    stock.forecast?.recommendation === 'BUY' ? 'bg-emerald-100 text-emerald-800' :
                    stock.forecast?.recommendation === 'SELL' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                 }`}>
                   <div className="text-[10px] uppercase opacity-70 font-bold">แนะนำ</div>
                   <div className="text-sm font-black">
                     {stock.forecast?.recommendation === 'BUY' ? 'ซื้อ' :
                      stock.forecast?.recommendation === 'SELL' ? 'ขาย' : 'ถือ'}
                   </div>
                 </div>
               </div>

               {/* AI Reason */}
               {stock.forecast && (
                 <div className="mt-auto">
                   <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                     <i className="fas fa-robot text-emerald-500 mr-1.5"></i>
                     {stock.forecast.reason}
                   </p>
                   
                   <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                     {stock.forecast.targetPrice && (
                       <p className="text-[10px] text-slate-400">
                         <i className="fas fa-crosshairs mr-1"></i> เป้าหมาย: {stock.forecast.targetPrice}
                       </p>
                     )}
                     <button 
                       onClick={() => viewHistory(stock.symbol)}
                       className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors"
                     >
                       <i className="fas fa-history mr-1"></i> ประวัติ
                     </button>
                   </div>
                 </div>
               )}
            </div>
          ))}
        </div>
      )}
      
      {/* History Modal / Section */}
      {selectedStockHistory && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedStockHistory(null)}>
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">
                     <i className="fas fa-history text-slate-400 mr-2"></i>
                     ประวัติคำแนะนำ: {selectedStockHistory.symbol}
                  </h3>
                  <button onClick={() => setSelectedStockHistory(null)} className="text-slate-400 hover:text-slate-600">
                     <i className="fas fa-times"></i>
                  </button>
               </div>
               <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                        <tr>
                           <th className="px-4 py-2">วันที่</th>
                           <th className="px-4 py-2">ราคา</th>
                           <th className="px-4 py-2">แนะนำ</th>
                           <th className="px-4 py-2">มั่นใจ</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {selectedStockHistory.history.length > 0 ? (
                           selectedStockHistory.history.map(item => (
                              <tr key={item.id}>
                                 <td className="px-4 py-3 text-slate-500 text-xs">
                                    {new Date(item.timestamp).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit'})}
                                 </td>
                                 <td className="px-4 py-3 font-medium">${item.priceAtTime}</td>
                                 <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                       item.recommendation === 'BUY' ? 'bg-green-100 text-green-700' :
                                       item.recommendation === 'SELL' ? 'bg-red-100 text-red-700' :
                                       'bg-slate-100 text-slate-600'
                                    }`}>
                                       {item.recommendation}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-slate-500">{item.confidence}%</td>
                              </tr>
                           ))
                        ) : (
                           <tr><td colSpan={4} className="p-4 text-center text-slate-400">ไม่มีข้อมูล</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}

      <div className="bg-slate-50 p-4 rounded-xl text-center text-xs text-slate-400 border border-slate-100">
        *ข้อมูลราคาเป็นการจำลอง (Simulation) เพื่อทดสอบระบบ AI เท่านั้น
      </div>
    </div>
  );
};

export default StockDashboard;