import { useEffect, useState } from "react";
import { ExternalLink, Globe2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { readStored, STORAGE_KEYS, type StoredLocationInsights, type VirtualCompetitor, writeStored } from "@/lib/persistence";

const empty: VirtualCompetitor = { name: "", channel: "شبکه اجتماعی", url: "", followers: "", monthlyReach: "", engagementRate: "", leads: "", conversions: "", monthlyAdCost: "" };
const number = (value: string) => Number(value.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9.]/g, "")) || 0;
const fa = (value: number) => value ? new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value) : "—";
const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

function analyze(item: VirtualCompetitor) {
  const followers = number(item.followers);
  const reach = number(item.monthlyReach);
  const reachRate = followers ? reach / followers : 0;
  // When audience size is known, reach quality is more meaningful than a raw count.
  const reachScore = followers ? clamp(reachRate / 2 * 30, 0, 30) : Math.min(reach / 10000 * 30, 30);
  const engagementRate = clamp(number(item.engagementRate));
  const engagementScore = Math.min(engagementRate / 10 * 40, 40);
  const leads = number(item.leads);
  const conversions = number(item.conversions);
  const conversionRate = leads ? clamp(conversions / leads * 100) : 0;
  const conversionScore = Math.min(conversionRate / 10 * 30, 30);
  const adCost = number(item.monthlyAdCost);
  const cac = conversions && adCost ? adCost / conversions : 0;
  return { total: Math.round(reachScore + engagementScore + conversionScore), reachRate, conversionRate, cac, hasReach: reach > 0, hasEngagement: engagementRate > 0, hasConversionData: leads > 0 };
}

function recommendations(item: VirtualCompetitor) {
  const result = analyze(item);
  const suggestions: string[] = [];
  if (!result.hasReach) suggestions.push("دسترسی ماهانه را از Insights یا آمار سایت ثبت کن.");
  if (!result.hasEngagement) suggestions.push("نرخ تعامل ۳۰ محتوای اخیر را اندازه بگیر.");
  else if (number(item.engagementRate) < 2) suggestions.push("تعامل پایین است؛ یک آزمایش محتوای مسئله‌محور اجرا کن.");
  if (!result.hasConversionData) suggestions.push("لینک یا کد اختصاصی بساز تا سرنخ و خرید قابل انتساب باشد.");
  else if (result.conversionRate < 2) suggestions.push("نرخ تبدیل پایین است؛ صفحه فرود و پیشنهاد قیمت را آزمایش کن.");
  if (result.cac) suggestions.push(`هزینه جذب تقریبی هر مشتری: ${fa(result.cac)}؛ با حاشیه سود خودت مقایسه کن.`);
  return suggestions.slice(0, 2);
}

export function VirtualCompetitors() {
  const stored = readStored<StoredLocationInsights | null>(STORAGE_KEYS.location, null);
  const [items, setItems] = useState<VirtualCompetitor[]>(stored?.virtualCompetitors || []);
  const [draft, setDraft] = useState(empty);
  useEffect(() => { const current = readStored<StoredLocationInsights | null>(STORAGE_KEYS.location, null); writeStored(STORAGE_KEYS.location, { center: current?.center || { lat: 35.7575, lng: 51.4105 }, businessPosition: current?.businessPosition, source: current?.source || "", footfall: current?.footfall || { peoplePerDay: "", carsPerDay: "", confidence: "" }, competitors: current?.competitors || [], virtualCompetitors: items }); }, [items]);
  const update = (key: keyof VirtualCompetitor, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const add = () => { if (!draft.name.trim()) return; setItems(current => [...current, draft]); setDraft(empty); };
  const fields: [keyof VirtualCompetitor, string, string][] = [["name", "نام رقیب", "مثال: صفحه اینستاگرام X"], ["channel", "کانال", "اینستاگرام، سایت، مارکت‌پلیس"], ["url", "لینک", "https://..."], ["followers", "دنبال‌کننده", "اختیاری"], ["monthlyReach", "دسترسی ماهانه", "تعداد بازدید/دسترسی"], ["engagementRate", "نرخ تعامل٪", "مثال: ۴.۵"], ["leads", "سرنخ ماهانه", "تعداد درخواست"], ["conversions", "تبدیل به خرید", "تعداد خرید"], ["monthlyAdCost", "هزینه تبلیغ ماهانه", "اختیاری"]];
  return <section className="virtual-competitor-card report-card"><div className="section-heading"><div><div className="card-kicker"><Globe2 size={15} /> رقبای فضای مجازی</div><h2>رقبای آنلاین را با داده قابل اندازه‌گیری مقایسه کن</h2><p>هر رقیب را با داده قابل مشاهده ثبت کن؛ حدس و داده واقعی را از هم جدا نگه دار.</p></div><ShieldCheck size={17} /></div><div className="virtual-method-note"><strong>روش محاسبه امتیاز از ۱۰۰:</strong> دسترسی نسبی به مخاطب ۳۰٪، نرخ تعامل ۴۰٪ و نرخ تبدیل سرنخ به خرید ۳۰٪. اگر تعداد دنبال‌کننده ثبت شود، دسترسی با نسبت «دسترسی ماهانه ÷ دنبال‌کننده» سنجیده می‌شود؛ در غیر این صورت از سقف خام ۱۰هزار دسترسی استفاده می‌شود. این امتیاز برای مقایسه داخلی پروژه است، نه رتبه رسمی پلتفرم.</div><div className="virtual-form-grid">{fields.map(([key, label, placeholder]) => <label key={key}>{label}<input inputMode={key === "name" || key === "channel" || key === "url" ? "text" : "decimal"} value={draft[key]} onChange={event => update(key, event.target.value)} placeholder={placeholder} /></label>)}<button className="primary-button virtual-add-button" onClick={add}><Plus size={16} /> افزودن رقیب مجازی</button></div>{items.length > 0 && <div className="virtual-table">{items.map((item, index) => { const result = analyze(item); const tips = recommendations(item); return <div className="virtual-row" key={`${item.name}-${index}`}><div><strong>{item.name}</strong><span>{item.channel}</span></div><span>دسترسی: {fa(number(item.monthlyReach))}</span><span>تعامل: {item.engagementRate || "—"}٪</span><span>تبدیل: {result.conversionRate ? `${fa(result.conversionRate)}٪` : "—"}</span><strong className="virtual-score">{result.total}/۱۰۰</strong>{item.url && <a href={item.url} target="_blank" rel="noreferrer" aria-label="باز کردن لینک رقیب"><ExternalLink size={15} /></a>}<button className="icon-button" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="حذف رقیب"><Trash2 size={15} /></button>{tips.length > 0 && <div className="virtual-recommendations"><b>پیشنهاد سنجش:</b> {tips.join(" ")}</div>}</div>; })}</div>}</section>;
}
