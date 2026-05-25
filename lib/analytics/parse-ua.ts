/**
 * Parser leve de user-agent (sem libs externas).
 * Detecta apenas o essencial: device_type, browser, os, is_bot.
 */

type DeviceType = "mobile" | "tablet" | "desktop" | "bot" | "unknown";

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /slurp/i,
  /facebookexternalhit/i,
  /whatsapp/i,
  /telegrambot/i,
  /linkedinbot/i,
  /twitterbot/i,
  /discordbot/i,
  /googlebot/i,
  /bingbot/i,
  /duckduckbot/i,
  /yandex/i,
  /baidu/i,
  /applebot/i,
  /headless/i,
  /lighthouse/i,
  /chrome-lighthouse/i,
  /pagespeed/i,
];

const TABLET_PATTERNS = [/ipad/i, /tablet/i, /kindle/i, /silk/i, /playbook/i];

const MOBILE_PATTERNS = [
  /mobile/i,
  /iphone/i,
  /ipod/i,
  /android/i,
  /blackberry/i,
  /webos/i,
  /opera mini/i,
  /iemobile/i,
];

export interface ParsedUserAgent {
  device_type: DeviceType;
  browser: string | null;
  os: string | null;
  is_bot: boolean;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) {
    return { device_type: "unknown", browser: null, os: null, is_bot: false };
  }

  const is_bot = BOT_PATTERNS.some((re) => re.test(ua));
  if (is_bot) {
    return { device_type: "bot", browser: extractBotName(ua), os: null, is_bot: true };
  }

  // Device type
  let device_type: DeviceType;
  if (TABLET_PATTERNS.some((re) => re.test(ua))) device_type = "tablet";
  else if (MOBILE_PATTERNS.some((re) => re.test(ua))) device_type = "mobile";
  else device_type = "desktop";

  return {
    device_type,
    browser: extractBrowser(ua),
    os: extractOs(ua),
    is_bot: false,
  };
}

function extractBrowser(ua: string): string | null {
  // Ordem importa: alguns browsers contem nome de outros
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/msie|trident/i.test(ua)) return "IE";
  return null;
}

function extractOs(ua: string): string | null {
  if (/windows nt 10/i.test(ua)) return "Windows 10/11";
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone os|ios/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  if (/cros/i.test(ua)) return "ChromeOS";
  return null;
}

function extractBotName(ua: string): string | null {
  const m = ua.match(/(\w+bot|googlebot|bingbot|yandex|baiduspider|applebot|facebookexternalhit|whatsapp|telegrambot|linkedinbot|twitterbot|discordbot)/i);
  return m ? m[0].toLowerCase() : "bot";
}
