
export interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  keywords?: string[];
  description?: string;
  content?: string;
  pubDate: string;
  image_url?: string;
  source_id?: string;
  aiSummary?: string;
}

export interface MarketForecast {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  targetPrice: string; // Keep for backward compatibility (USD)
  targetPriceTHB?: string; // New: Thai Baht Target
  timestamp: number;
}

export interface AnalysisHistory extends MarketForecast {
  id: string;
  assetSymbol: string;
  priceAtTime: string | number; // Price when analysis was made
}

export interface StockItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  forecast?: MarketForecast;
}

export interface GoldHistoryItem extends MarketForecast {
  id: string;
  actualResult?: 'PROFIT' | 'LOSS' | 'PENDING';
}

export enum Category {
  GOLD = 'gold', // First priority
  STOCKS = 'stocks', // International Stocks (Dime)
  AI_NEWS = 'ai_news', // New AI Category
  TOP = 'top',
  TECH = 'technology',
  BUSINESS = 'business',
}
