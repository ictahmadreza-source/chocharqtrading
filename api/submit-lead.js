export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { source, timestamp, userAgent } = req.body;

    // Validate input
    if (!source) {
      return res.status(400).json({ error: 'Source is required' });
    }

    // Get Telegram credentials from environment variables
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Telegram credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Format the message for Telegram
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString('fa-IR', { 
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const sourceEmoji = {
      'instagram': '📸',
      'telegram': '✈️',
      'youtube': '▶️',
      'friend': '👥',
      'google': '🔍'
    };

    const message = `
🎯 *لید جدید - ARQ Coaching*

${sourceEmoji[source] || '📌'} *نحوه آشنایی:* ${getSourceLabel(source)}
⏰ *زمان:* ${formattedDate}
📱 *دستگاه:* ${getUserDeviceInfo(userAgent)}

---
✅ کاربر در قرعه‌کشی ثبت شد
    `.trim();

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      console.error('Telegram API error:', errorData);
      throw new Error('Failed to send to Telegram');
    }

    // Return success
    return res.status(200).json({ 
      success: true, 
      message: 'Lead submitted successfully' 
    });

  } catch (error) {
    console.error('Error processing lead:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

function getSourceLabel(source) {
  const labels = {
    'instagram': 'اینستاگرام',
    'telegram': 'تلگرام',
    'youtube': 'یوتیوب',
    'friend': 'معرفی دوستان',
    'google': 'جستجوی گوگل'
  };
  return labels[source] || source;
}

function getUserDeviceInfo(userAgent) {
  if (!userAgent) return 'نامشخص';
  
  if (/mobile/i.test(userAgent)) {
    if (/android/i.test(userAgent)) return 'موبایل اندروید';
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'موبایل iOS';
    return 'موبایل';
  }
  
  if (/tablet|ipad/i.test(userAgent)) return 'تبلت';
  
  if (/windows/i.test(userAgent)) return 'دسکتاپ ویندوز';
  if (/mac/i.test(userAgent)) return 'دسکتاپ Mac';
  if (/linux/i.test(userAgent)) return 'دسکتاپ لینوکس';
  
  return 'دسکتاپ';
}
