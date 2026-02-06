import { NEWSDATA_API_KEY, DEFAULT_LANGUAGE } from "../constants";
import { NewsArticle, Category } from "../types";

const cache: Record<string, { data: NewsArticle[], timestamp: number }> = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

export const fetchNews = async (category: Category): Promise<NewsArticle[]> => {
  const cacheKey = category;
  const now = Date.now();

  // Helper to get IDs from all OTHER cached categories to prevent duplicates
  const getOtherCategoryIds = () => {
    const ids = new Set<string>();
    Object.keys(cache).forEach(key => {
      if (key !== cacheKey) {
        cache[key].data.forEach(article => ids.add(article.article_id));
      }
    });
    return ids;
  };

  if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_DURATION)) {
    return cache[cacheKey].data;
  }

  let apiCategory = '';
  let q = '';

  switch (category) {
    case Category.GOLD:
      q = 'ราคาทอง OR ทองคำ OR Gold Price OR XAUUSD OR เศรษฐกิจโลก OR สงครามการค้า';
      break;
    case Category.STOCKS:
      q = 'หุ้นสหรัฐ OR ตลาดหุ้น OR Nasdaq OR S&P500 OR หุ้นเทคโนโลยี';
      apiCategory = 'business'; 
      break;
    case Category.AI_NEWS:
      // Includes Global Tech keywords + Thai Tech Publishers
      q = 'ปัญญาประดิษฐ์ OR AI Technology OR ChatGPT OR Gemini OR Generative AI OR NVIDIA OR Beartai OR Droidsans OR ExtremeIT OR iMoD OR Blognone OR TechOffside';
      apiCategory = 'technology';
      break;
    case Category.TECH:
      q = 'Technology OR Innovation OR Cyber Security OR Gadget';
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
      const existingIds = getOtherCategoryIds();
      
      // Filter out articles that are already in other categories
      const uniqueResults = data.results.filter((article: NewsArticle) => !existingIds.has(article.article_id));
      
      cache[cacheKey] = {
        data: uniqueResults,
        timestamp: now
      };
      return uniqueResults;
    }
    return [];
  } catch (error) {
    console.error("Fetch News Error:", error);
    return []; // Return empty array to handle UI gracefully
  }
};