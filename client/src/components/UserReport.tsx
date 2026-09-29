import { useEffect, useRef, useState } from "react";
import { BarChart3, Check, CircleHelp, ExternalLink, FileDown, Globe2, MapPin, Sparkles } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { readStored, STORAGE_KEYS, writeStored, type FinanceInputs, type StoredLocationInsights } from "@/lib/persistence";
import { readUserAIResult } from "@/lib/user-ai";

type ProjectDraft = { name: string; description: string; stage: string; businessType: string; market: string; customerType: string; presenceType?: string; goal: string };
type ReportQuestion = { id: string; title: string; options: string[] };
const emptyFinance: FinanceInputs = { monthlyUnits: "", pricePerUnit: "", variableCostPerUnit: "", monthlyFixedCosts: "", initialInvestment: "" };
const toNumber = (value: string) => Number(value.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[^0-9.]/g, "")) || 0;
const formatNumber = (value: number) => value ? new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value) : "—";
const virtualScore = (item: { followers: string; monthlyReach: string; engagementRate: string; leads: string; conversions: string }) => { const followers = toNumber(item.followers); const reach = toNumber(item.monthlyReach); const reachRate = followers ? reach / followers : 0; const reachScore = followers ? Math.min(reachRate / 2 * 30, 30) : Math.min(reach / 10000 * 30, 30); const engagement = Math.min(toNumber(item.engagementRate) / 10 * 40, 40); const leads = toNumber(item.leads); const conversionRate = leads ? toNumber(item.conversions) / leads * 100 : 0; return Math.round(reachScore + engagement + Math.min(conversionRate / 10 * 30, 30)); };

function mapLinks(position?: { lat: number; lng: number }, address = "") {
  const query = position ? `${position.lat},${position.lng}` : encodeURIComponent(address);
  return { osm: position ? `https://www.openstreetmap.org/?mlat=${position.lat}&mlon=${position.lng}#map=18/${position.lat}/${position.lng}` : `https://www.openstreetmap.org/search?query=${query}`, google: `https://www.google.com/maps/search/?api=1&query=${query}` };
}

export function UserReport({ draft, answers, questions, onBack, onAIReview }: { draft: ProjectDraft; answers: Record<string, string>; questions: ReportQuestion[]; onBack: () => void; onAIReview: () => void }) {
  const location = readStored<StoredLocationInsights | null>(STORAGE_KEYS.location, null);
  const analysis = readUserAIResult();
  const answered = Object.values(answers).filter(Boolean).length;
  const competitorCount = location?.competitors.length || 0;
  const isOnline = draft.presenceType === "آنلاین";
  const virtualCompetitors = location?.virtualCompetitors || [];
  const hasLocation = !isOnline && Boolean(location?.businessPosition);
  const dimensions = [["مسئله و نیاز", answers.problem], ["مشتری هدف", answers.customer], ["بازار و رقبا", location?.competitors.length ? `${competitorCount} رقیب` : "ثبت نشده"], ["ارزش پیشنهادی", answers.value], ["مدل درآمد", answers.revenue]];
  const answerText = (value: string) => value.split("||").filter(Boolean).join("، ");
  const [finance, setFinance] = useState<FinanceInputs>(() => readStored(STORAGE_KEYS.finance, emptyFinance));
  const reportRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);
  useEffect(() => { writeStored(STORAGE_KEYS.finance, finance); }, [finance]);
  const exportPdf = async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 1.35, useCORS: true, backgroundColor: "#f8f9fb", windowWidth: reportRef.current.scrollWidth });
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = 210;
      const pageHeight = 297;
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      let offset = 0;
      while (offset < imageHeight) {
        if (offset > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.88), "JPEG", 0, -offset, pageWidth, imageHeight);
        offset += pageHeight;
      }
      pdf.save(`${draft.name || "bizsanj-report"}.pdf`);
    } finally {
      setExporting(false);
    }
  };
  const updateFinance = (key: keyof FinanceInputs, value: string) => setFinance(current => ({ ...current, [key]: value }));
  const units = toNumber(finance.monthlyUnits); const price = toNumber(finance.pricePerUnit); const variable = toNumber(finance.variableCostPerUnit); const fixed = toNumber(finance.monthlyFixedCosts); const investment = toNumber(finance.initialInvestment);
  const revenue = units * price; const variableTotal = units * variable; const grossProfit = revenue - variableTotal; const netProfit = grossProfit - fixed; const margin = revenue ? (netProfit / revenue) * 100 : 0; const breakEven = price > variable ? Math.ceil(fixed / (price - variable)) : 0; const payback = netProfit > 0 && investment ? Math.ceil(investment / netProfit) : 0;
  return <section className="report-page" ref={reportRef}>
    <div className="report-top no-print"><button className="back-link" onClick={onBack}>بازگشت به فرضیات</button><div className="report-actions"><button className="secondary-button" onClick={onAIReview}><Sparkles size={16} /> ارسال به Claude / ChatGPT / Gemini</button><button className="primary-button" onClick={() => void exportPdf()} disabled={exporting}><FileDown size={16} /> {exporting ? "در حال ساخت PDF..." : "خروجی PDF / چاپ"}</button></div></div>
    <div className="report-heading"><div><div className="eyebrow">گزارش کامل اعتبارسنجی</div><h1>{draft.name || "گزارش بدون نام پروژه"}</h1><p>این گزارش شامل اطلاعات پروژه، تمام پاسخ‌های پرسشنامه، موقعیت، رقبا و نتیجه مشاوره هوش مصنوعی است.</p></div><span className="report-version"><Check size={14} /> داده واقعی پروژه</span></div>
    <div className="report-card project-facts-card"><div className="section-heading"><div><h2>مشخصات پروژه</h2><p>اطلاعاتی که در شروع پروژه ثبت شده است.</p></div><BarChart3 size={17} /></div><div className="report-facts-grid"><div><strong>نام ایده</strong><span>{draft.name || "ثبت نشده"}</span></div><div><strong>شیوه ارائه</strong><span>{draft.presenceType || "ثبت نشده"}</span></div><div><strong>نوع کسب‌وکار</strong><span>{draft.businessType || "ثبت نشده"}</span></div><div><strong>مرحله فعلی</strong><span>{draft.stage || "ثبت نشده"}</span></div><div><strong>نوع مشتری</strong><span>{draft.customerType || "ثبت نشده"}</span></div><div><strong>بازار هدف</strong><span>{draft.market || "ثبت نشده"}</span></div><div><strong>هدف اعتبارسنجی</strong><span>{draft.goal || "ثبت نشده"}</span></div><div className="full-fact"><strong>شرح ایده</strong><span>{draft.description || "ثبت نشده"}</span></div></div></div>
    <div className="report-card finance-card"><div className="section-heading"><div><h2>تحلیل مالی و پیش‌بینی سود و زیان</h2><p>مقادیر را با واحد پولی دلخواه خودت وارد کن؛ این محاسبه برآوردی است و جایگزین حسابداری نیست.</p></div><BarChart3 size={17} /></div><div className="finance-input-grid"><label>تعداد فروش/خدمت در ماه<input inputMode="decimal" value={finance.monthlyUnits} onChange={event => updateFinance("monthlyUnits", event.target.value)} placeholder="مثال: ۱۰۰" /></label><label>قیمت هر واحد<input inputMode="decimal" value={finance.pricePerUnit} onChange={event => updateFinance("pricePerUnit", event.target.value)} placeholder="مثال: ۵۰۰۰۰۰" /></label><label>هزینه متغیر هر واحد<input inputMode="decimal" value={finance.variableCostPerUnit} onChange={event => updateFinance("variableCostPerUnit", event.target.value)} placeholder="مواد، ارسال، کارمزد" /></label><label>هزینه ثابت ماهانه<input inputMode="decimal" value={finance.monthlyFixedCosts} onChange={event => updateFinance("monthlyFixedCosts", event.target.value)} placeholder="اجاره، حقوق، ابزار" /></label><label>سرمایه‌گذاری اولیه<input inputMode="decimal" value={finance.initialInvestment} onChange={event => updateFinance("initialInvestment", event.target.value)} placeholder="اختیاری" /></label></div><div className="finance-result-grid"><div><span>درآمد ماهانه</span><strong>{formatNumber(revenue)}</strong></div><div><span>هزینه متغیر</span><strong>{formatNumber(variableTotal)}</strong></div><div><span>سود ناخالص</span><strong>{formatNumber(grossProfit)}</strong></div><div className={netProfit >= 0 ? "positive" : "negative"}><span>سود/زیان خالص</span><strong>{formatNumber(netProfit)}</strong></div><div><span>حاشیه سود خالص</span><strong>{revenue ? `${formatNumber(margin)}٪` : "—"}</strong></div><div><span>نقطه سربه‌سر ماهانه</span><strong>{breakEven ? `${formatNumber(breakEven)} واحد` : "—"}</strong></div>{payback > 0 && <div><span>بازگشت سرمایه تقریبی</span><strong>{formatNumber(payback)} ماه</strong></div>}</div></div>
    {isOnline && <div className="report-card virtual-report-card"><div className="section-heading"><div><h2>تحلیل رقبای فضای مجازی</h2><p>امتیاز مقایسه‌ای بر اساس دسترسی، تعامل و تبدیل محاسبه شده است.</p></div><Globe2 size={17} /></div>{virtualCompetitors.length ? <div className="virtual-report-list">{virtualCompetitors.map((item, index) => <div className="virtual-report-row" key={`${item.name}-${index}`}><div><strong>{item.name}</strong><span>{item.channel}</span></div><span>دسترسی {item.monthlyReach || "—"}</span><span>تعامل {item.engagementRate || "—"}٪</span><span>تبدیل {item.leads ? `${item.conversions || 0} از ${item.leads}` : "—"}</span><b>{virtualScore(item)}/۱۰۰</b></div>)}</div> : <p>هنوز رقیب مجازی ثبت نشده است.</p>}<p className="virtual-method-note">شاخص پیشنهادی: ۳۰٪ دسترسی ماهانه، ۴۰٪ نرخ تعامل، ۳۰٪ نرخ تبدیل سرنخ به خرید.</p></div>}
    {analysis && <div className="report-card ai-analysis-card"><div className="section-heading"><div><h2>نتیجه مشاوره هوش مصنوعی</h2><p>تحلیل ذخیره‌شده از Claude، ChatGPT یا Gemini</p></div><Sparkles size={18} /></div><div className="ai-analysis-content print-preserve">{analysis}</div></div>}
    <div className="report-score-grid"><div className="score-card"><div className="score-ring"><div><strong>{answered}</strong><span>پاسخ</span></div></div><div><span className="score-label">وضعیت تکمیل داده</span><h2>{answered} پاسخ ثبت شده</h2><p>امتیاز قطعی بدون شواهد واقعی محاسبه نمی‌شود.</p></div></div><div className="score-insight"><div className="insight-icon"><Sparkles size={18} /></div><div><strong>اطلاعات مکانی</strong><p>{hasLocation ? `محل کسب‌وکار و ${competitorCount} رقیب ثبت شده است.` : "محل کسب‌وکار هنوز روی نقشه انتخاب نشده است."}</p><button className="text-button" onClick={onBack}>تکمیل آزمایش‌ها</button></div></div></div>
    <div className="report-card full-answers-card"><div className="section-heading"><div><h2>تمام پاسخ‌های پرسشنامه</h2><p>{answered} پاسخ از {questions.length} سؤال ثبت شده است.</p></div><Check size={17} /></div><div className="full-answers-list">{questions.map((question, index) => <div className="full-answer-row" key={question.id}><div className="full-answer-number">{index + 1}</div><div><strong>{question.title}</strong><span>{answers[question.id] ? answerText(answers[question.id]) : "پاسخ ثبت نشده"}</span></div></div>)}</div></div>
    <div className="report-grid"><div className="report-main"><div className="report-card"><div className="section-heading"><div><h2>ابعاد ثبت‌شده</h2><p>وضعیت واقعی بخش‌های اصلی پروژه.</p></div><CircleHelp size={17} /></div><div className="dimension-list">{dimensions.map(([label, value]) => <div className="dimension-row" key={label}><div className="dimension-icon amber"><BarChart3 size={16} /></div><div className="dimension-copy"><div><strong>{label}</strong><span>{value || "ثبت نشده"}</span></div><b>—</b></div><div className="dimension-track"><span className="amber" style={{ width: value ? "25%" : "0%" }} /></div></div>)}</div></div>{!isOnline && location && <div className="report-card"><div className="section-heading"><div><h2>موقعیت و دسترسی آنلاین رقبا</h2><p>لینک‌ها بر اساس مختصات یا آدرس ثبت‌شده ساخته شده‌اند.</p></div><MapPin size={17} /></div>{location.businessPosition && <p className="location-coordinates">موقعیت کسب‌وکار: {location.businessPosition.lat.toFixed(5)}، {location.businessPosition.lng.toFixed(5)}</p>}{location.competitors.length ? <div className="report-links-list">{location.competitors.map((competitor, index) => { const links = mapLinks(competitor.position, competitor.address); return <div className="report-link-row" key={`${competitor.name}-${index}`}><div><strong>{competitor.name}</strong><span>{competitor.address || "آدرس ثبت نشده"} — {competitor.kind}</span></div><div className="report-link-actions"><a href={links.osm} target="_blank" rel="noreferrer"><ExternalLink size={13} /> OpenStreetMap</a><a href={links.google} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Google Maps</a></div></div>; })}</div> : <p>رقیبی ثبت نشده است.</p>}</div>}</div><aside className="report-side"><div className="report-card strengths-card"><div className="card-kicker"><MapPin size={15} /> وضعیت اطلاعات</div><ul><li>{answered} پاسخ از پرسشنامه ثبت شده</li><li>{hasLocation ? "موقعیت کسب‌وکار ثبت شده" : "موقعیت کسب‌وکار ثبت نشده"}</li><li>{competitorCount} رقیب توسط کاربر ثبت شده</li></ul></div><div className="report-card risks-card"><div className="card-kicker"><CircleHelp size={15} /> داده‌های موردنیاز</div><ul><li>شواهد رفتاری مشتری</li><li>نتیجه آزمایش واقعی</li><li>اطلاعات پرداخت یا پیش‌فروش</li></ul></div></aside></div>
  </section>;
}
