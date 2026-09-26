import { useState } from "react";
import { ArrowLeft, Check, ChevronLeft, FlaskConical, Plus, X } from "lucide-react";

type TestOption = { id: string; title: string; description: string };
const options: TestOption[] = [
  { id: "preorder", title: "پیش‌فروش / پیش‌پرداخت", description: "قوی‌ترین شواهد از تعهد مالی مشتری" },
  { id: "interview", title: "مصاحبه با مشتری", description: "برای فهم رفتار گذشته و هزینه فعلی" },
  { id: "landing", title: "صفحه فرود", description: "برای سنجش علاقه و ثبت‌نام اولیه" },
];

export function InteractiveExperiments({ onReport, onToast }: { onReport: () => void; onToast: (message: string) => void }) {
  const [selected, setSelected] = useState(options[0].id);
  const [open, setOpen] = useState<string | null>(options[0].id);
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [result, setResult] = useState("");
  const [created, setCreated] = useState<string[]>([]);
  const active = options.find(option => option.id === selected) || options[0];

  const createExperiment = () => {
    if (!name.trim() || !hypothesis.trim()) {
      onToast("نام آزمایش و فرضیه را وارد کنید");
      return;
    }
    setCreated(current => [...current, name.trim()]);
    onToast(result.trim() ? "آزمایش و نتیجه آن ذخیره شد" : "آزمایش جدید با موفقیت اضافه شد");
    setName(""); setHypothesis(""); setResult(""); setOpen(null);
  };

  return <section className="experiments-page">
    <div className="page-heading"><div><div className="eyebrow">مرحله آزمایش</div><h1>فرضیات و آزمایش‌ها</h1><p>فرضیه را وارد کن، روش آزمایش را انتخاب کن و شواهد واقعی جمع کن.</p></div><button className="primary-button" onClick={() => setOpen("new")}><Plus size={18} /> آزمایش جدید</button></div>
    <div className="experiment-summary"><div><div className="summary-icon amber-bg"><FlaskConical size={19} /></div><div><span>آزمایش‌های ثبت‌شده</span><strong>{created.length}</strong></div></div><div><div className="summary-icon blue-bg"><Check size={19} /></div><div><span>روش انتخاب‌شده</span><strong>{active.title}</strong></div></div><div><div className="summary-icon green-bg"><FlaskConical size={19} /></div><div><span>وضعیت</span><strong>{result ? "نتیجه ثبت شده" : "آماده طراحی"}</strong></div></div></div>
    <div className="section-heading experiments-heading"><div><h2>انتخاب روش آزمایش</h2><p>یکی از روش‌ها را باز کن و انتخاب کن؛ گزینه‌ها قابل تغییر هستند.</p></div></div>
    <div className="experiment-options accordion-options">{options.map(option => <div className={`experiment-option accordion-item ${open === option.id ? "expanded" : ""}`} key={option.id}><button type="button" className="accordion-trigger" onClick={() => setOpen(open === option.id ? null : option.id)}><div><strong>{option.title}</strong><span>{option.description}</span></div>{selected === option.id ? <Check size={17} /> : <ChevronLeft size={16} />}</button>{open === option.id && <div className="accordion-body"><label className="modal-label">انتخاب این روش<input type="radio" checked={selected === option.id} onChange={() => setSelected(option.id)} /> <span>{selected === option.id ? "انتخاب شده" : "انتخاب نشده"}</span></label><button className={selected === option.id ? "primary-button" : "secondary-button"} onClick={() => { setSelected(option.id); onToast(`روش ${option.title} انتخاب شد`); }}>انتخاب این روش <ArrowLeft size={15} /></button>{selected === option.id && <label className="modal-label experiment-result-label">نتیجه آزمایش<textarea value={result} onChange={event => setResult(event.target.value)} placeholder="نتیجه واقعی، تعداد افراد، نرخ پاسخ یا هر شاهد ثبت‌شده را وارد کنید..." rows={4} /></label>}</div>}</div>)}</div>
    <div className="next-step-banner"><div><strong>روش فعال: {active.title}</strong><p>{result || active.description}</p></div><button className="secondary-button" onClick={onReport}>دیدن گزارش <ArrowLeft size={15} /></button></div>
    {open === "new" && <div className="modal-backdrop" onClick={() => setOpen(null)}><div className="experiment-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setOpen(null)}><X size={18} /></button><div className="modal-icon"><FlaskConical size={22} /></div><div className="eyebrow">طراحی آزمایش کم‌هزینه</div><h2>آزمایش خودت را طراحی کن</h2><p>نام، فرضیه، روش و نتیجه آزمایش را وارد کن.</p><label className="modal-label">نام آزمایش<input value={name} onChange={event => setName(event.target.value)} placeholder="مثال: مصاحبه با مشتریان اولیه" /></label><label className="modal-label">فرضیه قابل آزمایش<textarea value={hypothesis} onChange={event => setHypothesis(event.target.value)} placeholder="مثال: مشتری حاضر است برای راه‌حل پیشنهادی مبلغی پرداخت کند" rows={3} /></label><label className="modal-label">نتیجه آزمایش (اختیاری)<textarea value={result} onChange={event => setResult(event.target.value)} placeholder="نتیجه یا شواهد واقعی آزمایش" rows={3} /></label><div className="accordion-selected">روش انتخاب‌شده: <strong>{active.title}</strong></div><div className="modal-actions"><button className="ghost-button" onClick={() => setOpen(null)}>انصراف</button><button className="primary-button" onClick={createExperiment}>ذخیره آزمایش <ArrowLeft size={16} /></button></div></div></div>}
  </section>;
}
