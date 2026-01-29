
import { Category } from "./types";

// API Keys
export const NEWSDATA_API_KEY = "pub_4c7940224f6d483eac773713191e4f23";
export const MISTRAL_API_KEY = "YfGQPOx6YGxHpXgNJsuxcxFMZtPZ2xWY";
export const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

// Telegram Configuration
export const TELEGRAM_BOT_TOKEN = "8187829508:AAH-LWxx8rsMhYK_njIiqHQYEzhEIZBJUEI";
export const TELEGRAM_CHAT_ID = "-5066728848";

export const DEFAULT_LANGUAGE = "th";

export const CATEGORIES = [
  { id: Category.GOLD, name: 'ทองคำ & ลงทุน', icon: 'fa-coins', color: 'text-yellow-600' },
  { id: Category.STOCKS, name: 'หุ้นต่างประเทศ (Dime)', icon: 'fa-chart-line', color: 'text-green-600' },
  { id: Category.AI_NEWS, name: 'ข่าว AI & นวัตกรรม', icon: 'fa-robot', color: 'text-purple-600' },
  { id: Category.TOP, name: 'สรุปข่าวเช้านี้', icon: 'fa-sun', color: 'text-orange-500' },
  { id: Category.TECH, name: 'เทคโนโลยี', icon: 'fa-microchip', color: 'text-blue-500' },
  { id: Category.BUSINESS, name: 'ธุรกิจ & เศรษฐกิจ', icon: 'fa-briefcase', color: 'text-slate-600' },
];

export const TARGET_STOCKS = [
  { symbol: 'NVDA', name: 'NVIDIA Corp' },
  { symbol: 'TSLA', name: 'Tesla Inc' },
  { symbol: 'AAPL', name: 'Apple Inc' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet Inc' },
  { symbol: 'AMZN', name: 'Amazon.com' },
];
