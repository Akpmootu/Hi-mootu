
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "../constants";
import { MarketForecast } from "../types";

export const sendTelegramAlert = async (forecast: MarketForecast, currentPrice?: string) => {
  try {
    const dateStr = new Date(forecast.timestamp).toLocaleString('th-TH', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });

    // Formatting Logic
    const recIcon = forecast.recommendation === 'BUY' ? '🟢 <b>BUY (ขาขึ้น)</b> 🚀' : 
                    forecast.recommendation === 'SELL' ? '🔴 <b>SELL (ขาลง)</b> 📉' : 
                    '🟡 <b>HOLD (รอดูท่าที)</b> 👀';
    
    const confidenceIcon = forecast.confidence > 80 ? '🔥🔥🔥' : 
                           forecast.confidence > 50 ? '🔥🔥' : '🔥';

    // Construct Message
    const message = `
🔔 <b>สัญญาณชีพจรทองคำ (Hi'Mootu Gold Pulse)</b> 🔔
📅 ${dateStr}

${recIcon}
${confidenceIcon} <b>ความมั่นใจ:</b> ${forecast.confidence}%

📊 <b>ราคาตลาดปัจจุบัน:</b> ${currentPrice || '-'} บาท

🎯 <b>เป้าหมายราคา (Targets):</b>
🇺🇸 <b>Spot:</b> ${forecast.targetPrice}
🇹🇭 <b>ทองไทย:</b> ${forecast.targetPriceTHB || 'รอประเมิน'}

💡 <b>เหตุผลการวิเคราะห์:</b>
<i>"${forecast.reason}"</i>

--------------------------------
🤖 <i>Analysis by Hi'Mootu Mistral AI</i>
#Gold #Analysis #TradeSignal
    `;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML' // Enable HTML formatting for bold/italic
      })
    });

    if (!response.ok) {
      console.error("Telegram Send Failed:", await response.text());
    } else {
      console.log("Telegram Notification Sent!");
    }

  } catch (error) {
    console.error("Telegram Service Error:", error);
  }
};
