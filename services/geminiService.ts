
import { MISTRAL_API_KEY, MISTRAL_API_URL } from "../constants";
import { MarketForecast } from "../types";

// --- Mistral Service (Exclusive) ---
const callMistralAI = async (prompt: string, isJson: boolean = false): Promise<string> => {
  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-tiny",
        messages: [{ role: "user", content: prompt + (isJson ? " Reply strictly in JSON format only. Do not add any explanation or markdown code blocks." : "") }],
        temperature: 0.7,
      })
    });
    
    if (!response.ok) {
       console.error(`Mistral API Error: ${response.status} ${response.statusText}`);
       throw new Error(`Mistral API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Mistral API Execution Failed:", error);
    throw error;
  }
};

export const summarizeNews = async (content: string): Promise<string> => {
  const prompt = `
    สรุปข่าวนี้เป็นภาษาไทย (ความยาว 2-3 ประโยค):
    "${content.substring(0, 1500)}"
    
    โทนการเขียน:
    - กระชับ เข้าใจง่าย (Minimalist)
    - เหมาะสำหรับอ่านยามเช้า
    - ถ้าเป็นข่าวดีให้ใช้น้ำเสียงเชิงบวก
  `;

  try {
    return await callMistralAI(prompt);
  } catch (error) {
    return "ไม่สามารถเชื่อมต่อระบบ AI ได้ในขณะนี้ กรุณาอ่านเนื้อหาเต็มจากแหล่งข่าว";
  }
};

export const analyzeMarket = async (headlines: string[], assetType: 'GOLD' | 'STOCK', symbol?: string): Promise<MarketForecast> => {
  const context = assetType === 'GOLD' 
    ? 'ราคาทองคำ (XAUUSD) และราคาทองคำแท่งไทย' 
    : `หุ้น ${symbol} (ตลาดสหรัฐฯ)`;

  const prompt = `
    คุณคือนักวิเคราะห์การลงทุนอัจฉริยะ "Hi'Mootu"
    วิเคราะห์แนวโน้ม: ${context}
    จากหัวข้อข่าวล่าสุด: ${headlines.join(" | ").substring(0, 2000)}

    **คำสั่งสำคัญ**: ตอบกลับเป็น JSON เท่านั้น โดยใช้โครงสร้างนี้:
    {
      "recommendation": "BUY" หรือ "SELL" หรือ "HOLD",
      "confidence": (ตัวเลข 0-100),
      "reason": "เหตุผลสั้นๆ 1 ประโยค ภาษาไทย (กระชับ ได้ใจความ)",
      "targetPrice": "ราคาเป้าหมาย USD (เช่น $2,750)",
      "targetPriceTHB": "ราคาเป้าหมายทองคำแท่งไทย (เช่น 44,500 บาท) ถ้าเป็นหุ้นให้ใส่ - "
    }
  `;

  try {
    const textResponse = await callMistralAI(prompt, true);
    
    // --- Robust JSON Extraction Logic ---
    let cleanText = textResponse;
    cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    
    const json = JSON.parse(cleanText);
    
    // Normalize Recommendation
    let rec = "HOLD";
    if (json.recommendation?.toUpperCase().includes("BUY")) rec = "BUY";
    else if (json.recommendation?.toUpperCase().includes("SELL")) rec = "SELL";
    else rec = "HOLD";

    return {
      recommendation: rec as any,
      confidence: json.confidence || 50,
      reason: json.reason || "ตลาดมีความผันผวน ควรติดตามข่าวสารอย่างใกล้ชิด",
      targetPrice: json.targetPrice || "N/A",
      targetPriceTHB: json.targetPriceTHB || "-",
      timestamp: Date.now()
    };
  } catch (e) {
    console.error("Mistral Parse Error", e);
    return {
      recommendation: "HOLD",
      confidence: 50,
      reason: "กำลังประมวลผลข้อมูลตลาด (AI Busy)...",
      targetPrice: "-",
      targetPriceTHB: "-",
      timestamp: Date.now()
    };
  }
};
