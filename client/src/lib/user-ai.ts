import type { StoredLocationInsights } from "@/lib/persistence";
import { Clipboard } from "@capacitor/clipboard";

export type UserAIInput = {
  project: Record<string, string>;
  answers: Record<string, string>;
  location?: StoredLocationInsights | null;
};

export type UserAIProvider = "claude" | "chatgpt" | "gemini";

const providerUrls: Record<UserAIProvider, string> = {
  claude: "https://claude.ai/new",
  chatgpt: "https://chatgpt.com/",
  gemini: "https://gemini.google.com/app",
};

const providerLabels: Record<UserAIProvider, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
};

export function buildValidationPrompt({ project, answers, location }: UserAIInput): string {
  const projectLines = Object.entries(project)
    .map(([key, value]) => `- ${key}: ${value || "ثبت نشده"}`)
    .join("\n");
  const answerLines = Object.entries(answers)
    .map(([key, value]) => `- ${key}: ${value || "ثبت نشده"}`)
    .join("\n");
  const locationLines = location
    ? [
        location.businessPosition
          ? `- مرکز موقعیت انتخاب‌شده کسب‌وکار: عرض جغرافیایی ${location.businessPosition.lat}، طول جغرافیایی ${location.businessPosition.lng}`
          : "- محل کسب‌وکار هنوز توسط کاربر انتخاب نشده است",
        `- منبع داده پاخور: ${location.source || "ثبت نشده"}`,
        `- پاخور پیاده روزانه: ${location.footfall.peoplePerDay || "ثبت نشده"}`,
        `- تردد خودرو روزانه: ${location.footfall.carsPerDay || "ثبت نشده"}`,
        `- میزان اطمینان داده پاخور: ${location.footfall.confidence || "ثبت نشده"}`,
        "- رقبا و جایگزین‌های محلی:",
        ...(location.competitors.length
          ? location.competitors.map((competitor, index) => `${index + 1}. ${competitor.name} | نوع: ${competitor.kind} | آدرس/توضیح: ${competitor.address || "ثبت نشده"} | فاصله: ${competitor.distance || "ثبت نشده"}${competitor.position ? ` | مختصات: ${competitor.position.lat}، ${competitor.position.lng}` : ""}`)
          : ["1. رقیبی ثبت نشده"]),
        ...(location.virtualCompetitors?.length
          ? ["- رقبای فضای مجازی:", ...location.virtualCompetitors.map((competitor, index) => `${index + 1}. ${competitor.name} | کانال: ${competitor.channel} | دسترسی ماهانه: ${competitor.monthlyReach || "ثبت نشده"} | نرخ تعامل: ${competitor.engagementRate || "ثبت نشده"}% | سرنخ: ${competitor.leads || "ثبت نشده"} | تبدیل: ${competitor.conversions || "ثبت نشده"} | هزینه تبلیغ: ${competitor.monthlyAdCost || "ثبت نشده"}`)]
          : []),
      ].join("\n")
    : "- اطلاعات موقعیت و رقبا هنوز ثبت نشده است";

  return `تو یک مشاور ارشد اعتبارسنجی ایده‌های کسب‌وکار هستی. اطلاعات زیر را فقط بر اساس شواهد موجود، به زبان فارسی و با نگاه واقع‌گرایانه تحلیل کن. اگر داده‌ای وجود ندارد، آن را حدس نزن و کمبودش را صریح اعلام کن.

اطلاعات پروژه:
${projectLines || "- اطلاعات پروژه ثبت نشده"}

پاسخ‌های پرسشنامه:
${answerLines || "- پاسخی ثبت نشده"}

اطلاعات موقعیت، پاخور و رقبا:
${locationLines}

خروجی را دقیقاً با این ساختار ارائه بده:
۱. خلاصه ایده در دو جمله
۲. مهم‌ترین شواهد مثبت
۳. فرضیات تأییدنشده و ریسک‌های اصلی
۴. تحلیل مشتری و مسئله
۶. تحلیل بازار، موقعیت و رقبا (برای مدل آنلاین، شاخص‌های رقابت مجازی را جداگانه تحلیل کن؛ فقط بر اساس اطلاعات موجود)
۶. سه آزمایش کم‌هزینه با ترتیب اولویت
۷. شاخص قابل‌اندازه‌گیری موفقیت برای هر آزمایش
۸. نتیجه نهایی: ادامه، اصلاح یا توقف؛ همراه با دلیل

پاسخ را خوانا، کاربردی و مناسب صاحب یک کسب‌وکار کوچک بنویس. از کلی‌گویی و پیش‌بینی قطعی موفقیت خودداری کن.`;
}

export async function copyPrompt(prompt: string): Promise<void> {
  try {
    await Clipboard.write({ string: prompt });
    return;
  } catch {
    // Fall back to the browser clipboard below.
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(prompt);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = prompt;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("کپی پرامپت انجام نشد؛ آن را به‌صورت دستی انتخاب و کپی کنید.");
}

export async function readClipboardText(): Promise<string> {
  try {
    const native = await Clipboard.read();
    if (native.value?.trim()) return native.value;
  } catch {
    // Fall back to the browser clipboard below.
  }
  if (!navigator.clipboard?.readText) {
    throw new Error("مرورگر اجازه خواندن خودکار کلیپ‌بورد را نمی‌دهد؛ پاسخ را دستی جای‌گذاری کنید.");
  }
  const text = await navigator.clipboard.readText();
  if (!text.trim()) throw new Error("کلیپ‌بورد خالی است.");
  return text;
}

export function openUserAI(provider: UserAIProvider): Window | null {
  return window.open(providerUrls[provider], "_blank", "noopener,noreferrer");
}

export function getProviderLabel(provider: UserAIProvider): string {
  return providerLabels[provider];
}

export function getProviderUrl(provider: UserAIProvider): string {
  return providerUrls[provider];
}

export function saveUserAIResult(result: string): void {
  try {
    window.localStorage.setItem("kasbokar:demo:user-ai-result", result);
  } catch {
    // The result remains available in the current page even when storage is unavailable.
  }
}

export function readUserAIResult(): string {
  try {
    return window.localStorage.getItem("kasbokar:demo:user-ai-result") || "";
  } catch {
    return "";
  }
}
