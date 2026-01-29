import { NEWSDATA_API_KEY, DEFAULT_LANGUAGE } from "../constants";
import { NewsArticle, Category } from "../types";

const cache: Record<string, { data: NewsArticle[], timestamp: number }> = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

export const fetchNews = async (category: Category): Promise<NewsArticle[]> => {
  const cacheKey = category;
  const now = Date.now();

  if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_DURATION)) {
    return cache[cacheKey].data;
  }

  let apiCategory = '';
  let q = '';

  switch (category) {
    case Category.GOLD:
      q = 'ราคาทอง OR ทองคำ OR Gold Price OR XAUUSD OR เศรษฐกิจโลก';
      break;
    case Category.STOCKS:
      q = 'หุ้นสหรัฐ OR ตลาดหุ้น OR Nasdaq OR S&P500 OR หุ้นเทคโนโลยี';
      apiCategory = 'business'; 
      break;
    case Category.AI_NEWS:
      q = 'ปัญญาประดิษฐ์ OR AI Technology OR ChatGPT OR Gemini AI OR Generative AI';
      apiCategory = 'technology';
      break;
    case Category.TECH:
      apiCategory = 'technology';
      break;
    case Category.BUSINESS:
      apiCategory = 'business';
      break;
    case Category.TOP:
    default:
      apiCategory = 'top';
      break;
  }

  // Fallback to minimal query if params are too specific for free tier
  let url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&language=${DEFAULT_LANGUAGE}`;
  
  if (apiCategory) url += `&category=${apiCategory}`;
  if (q) url += `&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
       if (res.status === 429) throw new Error("API Limit Reached");
       throw new Error(`API Error: ${res.statusText}`);
    }
    
    const data = await res.json();
    
    if (data.results) {
      cache[cacheKey] = {
        data: data.results,
        timestamp: now
      };
      return data.results;
    }
    return [];
  } catch (error) {
    console.error("Fetch News Error:", error);
    return []; // Return empty array to handle UI gracefully
  }
};