
import { AnalysisHistory, MarketForecast } from "../types";

const HISTORY_KEY_PREFIX = "himootu_analysis_history_";

export const getHistory = (symbol: string): AnalysisHistory[] => {
  try {
    const key = `${HISTORY_KEY_PREFIX}${symbol}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error loading history", e);
    return [];
  }
};

export const saveHistory = (symbol: string, forecast: MarketForecast, currentPrice: string | number) => {
  try {
    const key = `${HISTORY_KEY_PREFIX}${symbol}`;
    const history = getHistory(symbol);
    
    // Logic to prevent duplicate saves (e.g., only one per hour unless recommendation changes)
    const lastItem = history[0];
    const ONE_HOUR = 60 * 60 * 1000;
    
    const isNew = !lastItem || 
                  (Date.now() - lastItem.timestamp > ONE_HOUR) || 
                  (lastItem.recommendation !== forecast.recommendation);

    if (isNew) {
      const newItem: AnalysisHistory = {
        ...forecast,
        id: Date.now().toString(),
        assetSymbol: symbol,
        priceAtTime: currentPrice
      };
      
      // Keep only last 50 records
      const updatedList = [newItem, ...history].slice(0, 50);
      localStorage.setItem(key, JSON.stringify(updatedList));
      return updatedList;
    }
    return history;
  } catch (e) {
    console.error("Error saving history", e);
    return [];
  }
};

export const clearHistory = (symbol: string) => {
  const key = `${HISTORY_KEY_PREFIX}${symbol}`;
  localStorage.removeItem(key);
};
