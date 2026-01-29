
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

export const analyzeMarket = async (headlines: string[], assetType: 'GOLD' | 'STOCK', symbol?: string, currentPriceTHB?: string): Promise<MarketForecast> => {
  const context = assetType === 'GOLD' 
    ? 'ราคาทองคำโลก (XAUUSD) และราคาทองคำแท่งไทย (96.5%)' 
    : `หุ้น ${symbol} (ตลาดสหรัฐฯ)`;

  // Logic to guide AI on Support/Resistance based on Real-time price
  let priceGuidance = "";
  if (assetType === 'GOLD' && currentPriceTHB) {
      priceGuidance = `
      *** ข้อมูลสำคัญมาก (CRITICAL) ***
      ราคาซื้อขายจริงทองคำแท่งไทย (96.5%) ณ ขณะนี้คือ: ${currentPriceTHB} บาท
      
      หน้าที่ของคุณคือคำนวณ "แนวรับ" (Support) และ "แนวต้าน" (Resistance) โดยอ้างอิงจากราคา ${currentPriceTHB} เท่านั้น!
      - แนวรับ (Support): ควรต่ำกว่าราคาปัจจุบันประมาณ 50-300 บาท (เช่น ถ้าปัจจุบัน 42000, แนวรับอาจเป็น 41850)
      - แนวต้าน (Resistance): ควรสูงกว่าราคาปัจจุบันประมาณ 50-300 บาท (เช่น ถ้าปัจจุบัน 42000, แนวต้านอาจเป็น 42200)
      - Target Price THB: ควรเป็นราคาเป้าหมายที่สมเหตุสมผลใกล้เคียงกับ ${currentPriceTHB}
      ห้ามใช้ข้อมูลเก่าในความทรงจำ ให้ใช้ราคา ${currentPriceTHB} เป็นฐานในการคำนวณเดี๋ยวนี้
      `;
  }

  const prompt = `
    คุณคือนักวิเคราะห์การลงทุนระดับโลก "Hi'Mootu" (Senior Market Analyst)
    หน้าที่ของคุณ: วิเคราะห์แนวโน้ม ${context} เพื่อช่วยนักลงทุนตัดสินใจซื้อขายได้ทันที
    
    ${priceGuidance}

    ข้อมูลข่าวล่าสุด: 
    ${headlines.join(" | ").substring(0, 2500)}

    **คำสั่งสำคัญ**: ตอบกลับเป็น JSON เท่านั้น (ห้ามมี Markdown) โดยใช้โครงสร้างนี้:
    {
      "recommendation": "BUY" หรือ "SELL" หรือ "HOLD",
      "confidence": (ตัวเลข 0-100),
      "reason": "สรุปสถานการณ์ภาพรวม 2-3 บรรทัด (ภาษาไทย) เน้นสิ่งที่กำลังเกิดขึ้นเดี๋ยวนี้",
      "factors": ["ปัจจัยบวก/ลบ 1 (สั้นๆ)", "ปัจจัย 2", "ปัจจัย 3"],
      "strategy": "กลยุทธ์การเทรดที่แนะนำ (เช่น 'รอจังหวะย่อซื้อที่แนวรับ' หรือ 'ทยอยขายทำกำไร')",
      "support": "ราคาแนวรับ (ใส่หน่วย บาท ถ้าเป็นทองไทย)",
      "resistance": "ราคาแนวต้าน (ใส่หน่วย บาท ถ้าเป็นทองไทย)",
      "targetPrice": "ราคาเป้าหมาย Spot (เช่น $2,750)",
      "targetPriceTHB": "ราคาเป้าหมายทองคำแท่งไทย (ใส่หน่วย บาท)"
    }

    Tip: ถ้าข่าวมีเรื่องสงคราม/เงินเฟ้อ ให้มองเป็นปัจจัยบวกต่อทอง, ถ้าข่าวเศรษฐกิจสหรัฐฯ ดี/ดอกเบี้ยขึ้น ให้มองเป็นลบ
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
      factors: json.factors || [],
      strategy: json.strategy || "ติดตามสถานการณ์อย่างใกล้ชิด",
      support: json.support || "-",
      resistance: json.resistance || "-",
      targetPrice: json.targetPrice || "N/A",
      targetPriceTHB: json.targetPriceTHB || "-",
      timestamp: Date.now()
    };
  } catch (e) {
    console.error("Mistral Parse Error", e);
    return {
      recommendation: "HOLD",
      confidence: 50,
      reason: "กำลังประมวลผลข้อมูลตลาดเชิงลึก (AI Busy)...",
      targetPrice: "-",
      targetPriceTHB: "-",
      timestamp: Date.now()
    };
  }
};