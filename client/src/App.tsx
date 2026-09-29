import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  CircleHelp,
  ClipboardCheck,
  Download,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  MapPin,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import "./index.css";
import { analyzeValidation } from "@/lib/ai";
import { LocationInsights } from "@/components/LocationInsights";
import { InteractiveExperiments } from "@/components/InteractiveExperiments";
import { UpgradeModal } from "@/components/UpgradeModal";
import { UserReport } from "@/components/UserReport";
import { VirtualCompetitors } from "@/components/VirtualCompetitors";
import { HelpCenter } from "@/components/HelpCenter";
import { Auth } from "@/pages/Auth";
import { clearCurrentProjectData, clearStoredData, readBackupFile, readStored, setStorageScope, STORAGE_KEYS, writeStored, type RecentProject, type StoredLocationInsights, type UserProfile } from "@/lib/persistence";
import { buildValidationPrompt, copyPrompt, getProviderLabel, getProviderUrl, openUserAI, readClipboardText, readUserAIResult, saveUserAIResult, type UserAIProvider } from "@/lib/user-ai";
import { toggleMultiSelection } from "@/lib/questionnaire";
import { supabase, getProfile, isSupabaseConfigured, getDemoSession, clearDemoSession } from "@/lib/supabase";
import { getBillingStatus } from "@/lib/billing";

type View = "dashboard" | "new-project" | "questions" | "ai-review" | "experiments" | "location" | "report" | "help";

type ProjectDraft = {
  name: string;
  description: string;
  stage: string;
  businessType: string;
  market: string;
  customerType: string;
  presenceType: "حضوری" | "آنلاین" | "ترکیبی" | "";
  goal: string;
};

const initialProject: ProjectDraft = {
  name: "", description: "", stage: "", businessType: "", market: "", customerType: "", presenceType: "", goal: "",
};

const initialAnswers: Record<string, string> = {};
const initialProfile: UserProfile = { name: "", role: "" };

const slugify = (value: string) => value.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "").replace(/^-+|-+$/g, "").toLowerCase();

const journey = [
  { id: "identity", label: "خودِ کارآفرین", icon: UserRound },
  { id: "idea", label: "ایده", icon: Lightbulb },
  { id: "problem", label: "مسئله و نیاز", icon: Target },
  { id: "customer", label: "مشتری هدف", icon: UsersRound },
  { id: "market", label: "بازار", icon: TrendingUp },
  { id: "competitors", label: "رقبا", icon: BriefcaseBusiness },
  { id: "value", label: "ارزش پیشنهادی", icon: Sparkles },
  { id: "revenue", label: "مدل درآمد", icon: WalletCards },
  { id: "test", label: "آزمایش", icon: FlaskConical },
  { id: "report", label: "گزارش", icon: BarChart3 },
];

const questions = [
  { id: "presenceCheck", step: "۰۱", type: "single", title: "کسب‌وکار شما به محل فیزیکی نیاز دارد یا آنلاین است؟", helper: "مشخص کن مشتری برای دریافت محصول یا خدمت باید به محل تو مراجعه کند یا همه‌چیز آنلاین انجام می‌شود.", why: "این انتخاب مسیر تحلیل رقبا را تعیین می‌کند: برای مدل حضوری، موقعیت و رقبای محدوده مهم است؛ برای مدل آنلاین، کانال‌ها و شاخص‌های رقابت دیجیتال بررسی می‌شوند.", options: ["نیازمند محل فیزیکی برای فروش یا ارائه خدمت", "کاملاً آنلاین؛ بدون نیاز به مراجعه حضوری", "ترکیبی؛ بخشی حضوری و بخشی آنلاین"] },
  { id: "identity", step: "۰۱", type: "single", title: "در هفته چقدر زمان می‌توانی برای این کسب‌وکار بگذاری؟", helper: "ظرفیت واقعی تو، اندازه آزمایش و سرعت مسیر را مشخص می‌کند.", why: "آزمایش خوب باید با منابع واقعی تو قابل اجرا باشد.", options: ["کمتر از ۵ ساعت", "۵ تا ۱۰ ساعت", "۱۰ تا ۲۰ ساعت", "بیشتر از ۲۰ ساعت"] },
  { id: "idea", step: "۰۲", type: "select", title: "ایده‌ات در کدام مرحله قرار دارد؟", helper: "نقطه شروع را مشخص کن تا پیشنهادها متناسب با وضعیت فعلی باشند.", why: "راهکار مناسب یک ایده خام با کسب‌وکاری که مشتری دارد متفاوت است.", options: ["فقط ایده", "نمونه اولیه", "فروش اولیه", "کسب‌وکار فعال"] },
  { id: "problem", step: "۰۳", type: "single", title: "این مشکل برای مشتری هر چند وقت یک‌بار رخ می‌دهد؟", helper: "تکرار مشکل را از چیزی که واقعاً دیده‌ای انتخاب کن.", why: "مشکل پرتکرار معمولاً فرصت بهتری برای آزمایش و خرید ایجاد می‌کند.", options: ["تقریباً هر روز", "هفته‌ای چند بار", "ماهانه", "به‌ندرت / نامشخص"] },
  { id: "customer", step: "۰۴", type: "multi", title: "مشتری اولیه بیشتر چه ویژگی‌هایی دارد؟", helper: "حداکثر سه گزینه را انتخاب کن؛ اینجا قرار نیست پرسونا را طولانی بنویسی.", why: "تمرکز روی یک گروه قابل دسترس، هزینه جذب و طراحی آزمایش را کاهش می‌دهد.", options: ["دسترسی آسان به او دارم", "همین مشکل را اخیراً داشته", "الان برای جایگزین پول می‌دهد", "تصمیم‌گیرنده خرید است", "به محصول جدید علاقه‌مند است"] },
  { id: "market", step: "۰۵", type: "single", title: "برای این کسب‌وکار، موقعیت جغرافیایی چقدر مهم است؟", helper: "اگر فروش حضوری یا خدمات محلی داری، پاخور را از همین‌جا وارد مسیر کن.", why: "لوکیشن، تردد افراد و خودروها می‌تواند روی تقاضا و هزینه جذب اثر مستقیم داشته باشد.", options: ["بسیار مهم؛ فروش حضوری / خدمات محلی", "مهم؛ بخشی از مشتری محلی است", "کم‌اهمیت؛ فروش آنلاین غالب است", "هنوز نمی‌دانم"] },
  { id: "competitors", step: "۰۶", type: "multi", title: "کدام جایگزین‌ها همین حالا مشتری را جذب می‌کنند؟", helper: "رقیب مستقیم و غیرمستقیم را از فهرست انتخاب کن؛ جزئیات را در صفحه رقبا اضافه می‌کنی.", why: "شناخت گزینه فعلی مشتری، دلیل تغییر رفتار و مزیت تو را روشن می‌کند.", options: ["محصول یا خدمت مشابه", "راه‌حل غیرمشابه برای همان نیاز", "روش دستی / خانگی", "خودداری از خرید", "هنوز بررسی نکرده‌ام"] },
  { id: "value", step: "۰۷", type: "multi", title: "مشتری برای چه نتیجه‌ای باید تو را انتخاب کند؟", helper: "می‌توانی چند نتیجه مهم را انتخاب کنی؛ بهتر است بیش از سه گزینه نباشد.", why: "ارزش پیشنهادی باید به نتیجه‌ای وصل شود که مشتری آن را مهم و قابل اندازه‌گیری می‌داند.", options: ["سریع‌تر انجام دادن کار", "ارزان‌تر تمام شدن", "کیفیت یا اعتماد بیشتر", "راحتی و دسترسی بهتر", "تجربه‌ای که جایگزین ندارد"] },
  { id: "revenue", step: "۰۸", type: "single", title: "محتمل‌ترین روش پرداخت مشتری کدام است؟", helper: "مدلی را انتخاب کن که با رفتار فعلی بازار سازگارتر است.", why: "مدل درآمد باید قبل از ساخت کامل محصول با پرداخت واقعی آزمایش شود.", options: ["پرداخت یک‌باره", "اشتراک ماهانه", "کمیسیون از هر تراکنش", "فروش به سازمان‌ها", "هنوز مشخص نیست"] },
  { id: "test", step: "۰۹", type: "single", title: "برای اولین آزمایش، کدام تعهد را می‌توانی بسنجی؟", helper: "قوی‌ترین گزینه‌ای را انتخاب کن که همین هفته قابل اجراست.", why: "تعهد مالی و رفتار واقعی از نظرخواهی شفاهی شواهد قوی‌تری ایجاد می‌کند.", options: ["پیش‌فروش یا پیش‌پرداخت", "ثبت‌نام در صفحه فرود", "مصاحبه با مشتری واقعی", "اجرای دستی خدمت برای چند نفر", "فعلاً فقط نظرسنجی"] },
];

type ValidationQuestion = (typeof questions)[number];

const q = (id: string, title: string, helper: string, why: string, options: string[], type: "single" | "multi" | "select" = "single"): ValidationQuestion => ({ id, step: "", type, title, helper, why, options });

function buildQuestionBank(draft: ProjectDraft): ValidationQuestion[] {
  const branch: ValidationQuestion[] = [];
  const online = draft.presenceType === "آنلاین" || ["دیجیتال", "آموزش"].includes(draft.businessType) || /آنلاین|دیجیتال|اینترنت|اپ|سایت/i.test(draft.description);
  const local = draft.presenceType !== "آنلاین" && (["خدماتی", "غذا و نوشیدنی"].includes(draft.businessType) || /حضوری|محلی|مکان|فروشگاه|رستوران/i.test(draft.description));
  const selling = ["فروش", "غذا و نوشیدنی"].includes(draft.businessType);
  const b2b = draft.customerType.includes("سازمان") || /سازمان|شرکت|کسب‌وکار/i.test(draft.description);
  const active = ["فروش اولیه", "کسب‌وکار فعال"].includes(draft.stage);

  branch.push(q("problemEvidence", "آخرین بار مشتری چگونه این مسئله را حل کرد؟", "به رفتار واقعی اشاره کن، نه نظر کلی.", "راه‌حل فعلی و هزینه‌ای که مشتری تحمل می‌کند، شدت مسئله را بهتر نشان می‌دهد.", ["راه‌حل موجود خریداری شده", "از ابزار یا روش رایگان استفاده کرده", "از دیگران کمک گرفته", "مسئله را نادیده گرفته", "هنوز نمی‌دانم"], "multi"));
  branch.push(q("customerAccess", "چگونه به اولین مشتریان دسترسی داری؟", "کانالی را انتخاب کن که واقعاً بتوانی همین هفته از آن استفاده کنی.", "دسترسی واقعی به مشتری، شرط اجرای آزمایش معتبر است.", ["ارتباط شخصی یا شبکه دوستان", "شبکه اجتماعی یا جامعه آنلاین", "مراجعه حضوری و محلی", "همکاری با سازمان یا واسطه", "هنوز کانال مشخصی ندارم"], "multi"));
  if (online) {
    branch.push(q("onlineAcquisition", "مشتری آنلاین از چه کانالی باید تو را پیدا کند؟", "دو کانال محتمل را انتخاب کن.", "کسب‌وکار آنلاین بدون کانال جذب قابل تکرار رشد نمی‌کند.", ["جست‌وجو و SEO", "شبکه‌های اجتماعی", "تبلیغات پولی", "معرفی و ارجاع", "همکاری با پلتفرم‌ها"], "multi"));
    branch.push(q("onlineActivation", "اولین ارزش محصول آنلاین چه زمانی به مشتری می‌رسد؟", "لحظه‌ای را مشخص کن که کاربر باید ارزش را تجربه کند.", "فاصله زیاد تا تجربه ارزش، ریزش کاربر را افزایش می‌دهد.", ["در اولین استفاده", "پس از تکمیل پروفایل یا ثبت‌نام", "پس از خرید یا پرداخت", "پس از چند روز استفاده", "هنوز مشخص نیست"]));
    branch.push(q("retention", "چه چیزی باعث بازگشت مشتری آنلاین می‌شود؟", "رفتار تکرارشونده مورد انتظار را انتخاب کن.", "تکرار استفاده یا خرید، نشانه مهمی برای پایداری مدل آنلاین است.", ["نیاز روزمره یا تکرارشونده", "محتوای تازه", "یادآوری و اعلان", "نتیجه بهتر با استفاده مستمر", "هنوز نمی‌دانم"]));
  }
  if (local) {
    branch.push(q("serviceArea", "محدوده خدمت‌رسانی یا جذب مشتری کجاست؟", "محدوده را با توجه به زمان و هزینه رفت‌وآمد انتخاب کن.", "در کسب‌وکار محلی، محدوده خدمت مستقیماً ظرفیت و هزینه را تعیین می‌کند.", ["یک محله", "چند محله نزدیک", "یک شهر", "چند شهر", "هنوز مشخص نیست"]));
    branch.push(q("capacity", "در هر روز یا هفته چه ظرفیتی می‌توانی ارائه کنی؟", "ظرفیت واقعی را با منابع فعلی بسنج.", "فروش بیشتر از ظرفیت، تجربه مشتری و سود را خراب می‌کند.", ["کمتر از ۵ سفارش یا خدمت", "۵ تا ۲۰", "۲۱ تا ۵۰", "بیش از ۵۰", "هنوز اندازه‌گیری نکرده‌ام"]));
    branch.push(q("locationChoice", "مشتری برای دریافت خدمت چگونه به تو می‌رسد؟", "روش اصلی تحویل یا مراجعه را مشخص کن.", "روش دریافت، قیمت، زمان و تجربه مشتری را تغییر می‌دهد.", ["مراجعه به محل کسب‌وکار", "اعزام به محل مشتری", "ارسال یا پیک", "ترکیبی", "هنوز مشخص نیست"]));
  }
  if (selling) {
    branch.push(q("inventory", "تهیه و موجودی محصول را چگونه مدیریت می‌کنی؟", "ریسک کمبود، خواب سرمایه و ضایعات را در نظر بگیر.", "در فروش کالا، موجودی و تأمین می‌تواند مهم‌تر از تبلیغات باشد.", ["تولید یا تأمین پس از سفارش", "موجودی محدود", "خرید عمده و انبار", "همکاری با تأمین‌کننده", "هنوز مشخص نیست"]));
    branch.push(q("margin", "حاشیه سود هر فروش را چگونه می‌سنجی؟", "هزینه کالا، ارسال، کارمزد و مرجوعی را هم حساب کن.", "فروش بدون حاشیه سود کافی رشد پایدار ایجاد نمی‌کند.", ["عدد دقیق دارم", "برآورد اولیه دارم", "فقط قیمت فروش را می‌دانم", "هنوز محاسبه نکرده‌ام"]));
    branch.push(q("purchaseFrequency", "مشتری معمولاً چند وقت یک‌بار خرید می‌کند؟", "رفتار خرید فعلی یا مشابه را انتخاب کن.", "تکرار خرید، انتخاب بین فروش یک‌باره و رابطه مستمر را روشن می‌کند.", ["روزانه یا هفتگی", "ماهانه", "فصلی یا سالانه", "خرید موردی", "هنوز نمی‌دانم"]));
  }
  if (b2b) {
    branch.push(q("decisionMaker", "چه کسی تصمیم نهایی خرید را می‌گیرد؟", "کاربر، تأثیرگذار و پرداخت‌کننده ممکن است متفاوت باشند.", "شناخت تصمیم‌گیرنده از آزمایش با فرد اشتباه جلوگیری می‌کند.", ["مالک یا مدیر", "مدیر واحد مربوط", "کارشناس یا کاربر نهایی", "کمیته یا چند نفر", "هنوز مشخص نیست"]));
    branch.push(q("salesCycle", "چرخه تصمیم‌گیری و خرید سازمانی چقدر است؟", "از اولین تماس تا قرارداد را در نظر بگیر.", "چرخه فروش طولانی به آزمایش و نقدینگی متفاوت نیاز دارد.", ["کمتر از یک هفته", "یک تا چهار هفته", "یک تا سه ماه", "بیش از سه ماه", "هنوز نمی‌دانم"]));
    branch.push(q("pilot", "برای شروع همکاری سازمانی چه پیشنهاد کم‌ریسکی داری؟", "پایلوت باید کوتاه، محدود و قابل سنجش باشد.", "پایلوت راهی برای تبدیل علاقه سازمان به شواهد واقعی است.", ["نسخه آزمایشی رایگان", "پایلوت پولی محدود", "نمونه یا دموی اختصاصی", "قرارداد کوچک اولیه", "هنوز پیشنهادی ندارم"]));
  }
  if (draft.businessType === "تولید") {
    branch.push(q("production", "ظرفیت و زمان تولید محصول چقدر است؟", "زمان تأمین مواد، تولید و کنترل کیفیت را جداگانه در نظر بگیر.", "ظرفیت تولید بر قیمت، زمان تحویل و امکان رشد اثر دارد.", ["کمتر از ۱۰ واحد در هفته", "۱۰ تا ۵۰ واحد", "۵۱ تا ۲۰۰ واحد", "بیش از ۲۰۰ واحد", "هنوز اندازه‌گیری نکرده‌ام"]));
    branch.push(q("quality", "مهم‌ترین معیار کیفیت از نگاه مشتری چیست؟", "معیاری را انتخاب کن که بتوانی اندازه‌گیری کنی.", "کیفیت مبهم قابل آزمایش و مقایسه نیست.", ["دوام و عملکرد", "ظاهر و طراحی", "دقت و یکنواختی", "ایمنی و استاندارد", "هنوز مشخص نیست"], "multi"));
  }
  if (draft.businessType === "آموزش") {
    branch.push(q("learningOutcome", "مشتری پس از آموزش چه نتیجه قابل مشاهده‌ای می‌گیرد؟", "نتیجه را با مهارت یا رفتار مشخص تعریف کن.", "فروش آموزش بدون نتیجه قابل سنجش، اعتماد و تمدید را دشوار می‌کند.", ["مهارت عملی", "مدرک یا آمادگی آزمون", "افزایش درآمد یا شغل", "حل یک مسئله مشخص", "هنوز تعریف نکرده‌ام"], "multi"));
  }
  if (active) {
    branch.push(q("existingEvidence", "تا امروز چه شواهد واقعی جمع کرده‌ای؟", "فقط اقدام یا نتیجه واقعی را ثبت کن.", "شواهد قبلی نقطه شروع آزمایش بعدی را مشخص می‌کند.", ["پرداخت یا پیش‌فروش", "استفاده یا خرید تکراری", "مصاحبه ثبت‌شده", "ثبت‌نام یا درخواست واقعی", "هنوز شاهدی ندارم"], "multi"));
  }
  if (draft.goal.includes("قیمت") || draft.goal.includes("پرداخت")) {
    branch.push(q("price", "قیمت یا مبلغ قابل آزمایش را چگونه انتخاب می‌کنی؟", "یک قیمت واقعی یا بازه مشخص برای آزمون تعیین کن.", "بدون قیمت، سنجش تمایل به پرداخت فقط اظهار نظر است.", ["مقایسه با رقیب", "محاسبه هزینه و حاشیه سود", "ارزش ادراک‌شده مشتری", "آزمون چند قیمت", "هنوز قیمت ندارم"]));
  }
  if (draft.goal.includes("کانال")) {
    branch.push(q("channelMetric", "موفقیت کانال جذب را با چه شاخصی می‌سنجی؟", "شاخص را پیش از اجرای آزمایش تعیین کن.", "بدون معیار از پیش تعیین‌شده، نتیجه کانال قابل قضاوت نیست.", ["هزینه هر سرنخ", "نرخ تبدیل به خرید", "تعداد درخواست معتبر", "خرید تکراری", "هنوز شاخص ندارم"]));
  }
  const result = [...questions.slice(0, 4), ...branch, ...questions.slice(4)];
  return result.map((question, index) => ({ ...question, step: String(index + 1).padStart(2, "۰") }));
}

function App() {
  if (!isSupabaseConfigured) setStorageScope(getDemoSession()?.user.email);
  const [view, setView] = useState<View>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [draft, setDraft] = useState<ProjectDraft>(() => readStored(STORAGE_KEYS.draft, initialProject));
  const [profile, setProfile] = useState<UserProfile>(() => readStored(STORAGE_KEYS.profile, initialProfile));
  const [answers, setAnswers] = useState<Record<string, string>>(() => readStored(STORAGE_KEYS.answers, initialAnswers));
  const [activeQuestion, setActiveQuestion] = useState(() => readStored(STORAGE_KEYS.activeQuestion, 0));
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState("");
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => readStored(STORAGE_KEYS.recentProjects, []));
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [growthEntitled, setGrowthEntitled] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const legacyProjectNames = new Set(["فروش غذای سالم اشتراکی", "دستیار مالی شخصی"]);
    const legacyProfileNames = new Set(["سارا", "سارا احمدی"]);
    if (legacyProjectNames.has(draft.name) || legacyProfileNames.has(profile.name)) {
      setDraft(initialProject);
      setProfile(initialProfile);
      setAnswers(initialAnswers);
      setActiveQuestion(0);
      writeStored(STORAGE_KEYS.draft, initialProject);
      writeStored(STORAGE_KEYS.profile, initialProfile);
      writeStored(STORAGE_KEYS.answers, initialAnswers);
      writeStored(STORAGE_KEYS.activeQuestion, 0);
      writeStored(STORAGE_KEYS.location, null);
    }
  }, []);

  useEffect(() => {
    getBillingStatus().then(status => setGrowthEntitled(status.entitled));
  }, []);

  // بررسی وضعیت احراز هویت و خواندن پروفایل
  useEffect(() => {
    const loadProfile = async (currentSession: any) => {
      if (!currentSession?.user?.id) {
        setProfile(initialProfile);
        return;
      }
      if (!isSupabaseConfigured) {
        setProfile({
          name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'کاربر',
          role: 'فضای شخصی',
        });
        return;
      }
      try {
        const data = await getProfile(currentSession.user.id);
        setProfile({
          name: data?.full_name || currentSession.user.email?.split('@')[0] || 'کاربر',
          role: data?.role || 'فضای شخصی',
        });
      } catch (err) {
        console.error('خطا در خواندن پروفایل:', err);
        setProfile({
          name: currentSession.user.email?.split('@')[0] || 'کاربر',
          role: 'فضای شخصی',
        });
      }
    };

    if (!isSupabaseConfigured) {
      const demoSession = getDemoSession();
      setStorageScope(demoSession?.user.email);
      setSession(demoSession);
      setAuthLoading(false);
      void loadProfile(demoSession);
    } else {
      supabase.auth.getSession().then(({ data }) => {
        setStorageScope(data.session?.user.email);
        setSession(data.session);
        setAuthLoading(false);
        loadProfile(data.session);
      }).catch(() => {
        setSession(null);
        setAuthLoading(false);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession);
    });

    const handleDemoAuthChange = () => {
      const nextSession = getDemoSession();
      setStorageScope(nextSession?.user.email);
      setSession(nextSession);
      setDraft(readStored(STORAGE_KEYS.draft, initialProject));
      setAnswers(readStored(STORAGE_KEYS.answers, initialAnswers));
      setActiveQuestion(readStored(STORAGE_KEYS.activeQuestion, 0));
      setRecentProjects(readStored(STORAGE_KEYS.recentProjects, []));
      void loadProfile(nextSession);
    };
    window.addEventListener('bizsanj-auth-change', handleDemoAuthChange);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('bizsanj-auth-change', handleDemoAuthChange);
    };
  }, []);

  const questionBank = useMemo(() => buildQuestionBank(draft), [draft]);
  const active = questionBank[activeQuestion] || questionBank[0];
  const progress = view === "questions" ? Math.round(((activeQuestion + 1) / questionBank.length) * 100) : view === "experiments" ? 78 : view === "report" ? 100 : 18;
  useEffect(() => { if (activeQuestion >= questionBank.length) setActiveQuestion(Math.max(0, questionBank.length - 1)); }, [activeQuestion, questionBank.length]);

  useEffect(() => {
    writeStored(STORAGE_KEYS.draft, draft);
    writeStored(STORAGE_KEYS.profile, profile);
    writeStored(STORAGE_KEYS.answers, answers);
    writeStored(STORAGE_KEYS.activeQuestion, activeQuestion);
    setSaved(true);
  }, [draft, profile, answers, activeQuestion]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const go = (next: View) => {
    setView(next);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startNewProject = () => {
    if (draft.name.trim() && recentProjects.length > 0 && !growthEntitled) {
      setUpgradeOpen(true);
      showToast("برای ساخت پروژه دوم، پلن رشد را فعال کنید");
      return;
    }
    if (draft.name.trim()) {
      const next: RecentProject = { id: `${Date.now()}`, name: draft.name.trim(), description: draft.description, presenceType: draft.presenceType, businessType: draft.businessType, updatedAt: new Date().toISOString() };
      const projects = [next, ...recentProjects.filter(project => project.name !== next.name)].slice(0, 6);
      setRecentProjects(projects);
      writeStored(STORAGE_KEYS.recentProjects, projects);
    }
    setAnswers({});
    setActiveQuestion(0);
    setSaved(true);
    go("questions");
    showToast("پروژه ساخته شد؛ پرسشنامه از سؤال اول شروع شد");
  };

  const resetLocalData = () => {
    clearStoredData();
    setDraft(initialProject);
    setProfile(initialProfile);
    setAnswers(initialAnswers);
    setActiveQuestion(0);
    setRecentProjects([]);
    go("dashboard");
    showToast("داده‌های محلی پروژه پاک شد");
  };

  const downloadJson = () => {
    const backup = {
      formatVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      profile,
      project: draft,
      answers,
      activeQuestion,
      location: readStored<StoredLocationInsights | null>(STORAGE_KEYS.location, null),
      finance: readStored(STORAGE_KEYS.finance, {
        monthlyUnits: "",
        pricePerUnit: "",
        variableCostPerUnit: "",
        monthlyFixedCosts: "",
        initialInvestment: "",
      }),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(draft.name) || "kasbokar-project"}-backup.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("فایل پشتیبان JSON دانلود شد");
  };

  const importJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const backup = await readBackupFile(file);
      setDraft({ ...backup.project, presenceType: backup.project.presenceType || "" });
      if (backup.profile) setProfile(backup.profile);
      setAnswers(backup.answers);
      setActiveQuestion(backup.activeQuestion);
      if (backup.location) writeStored(STORAGE_KEYS.location, backup.location);
      if (backup.finance) writeStored(STORAGE_KEYS.finance, backup.finance);
      go("dashboard");
      showToast("پروژه از فایل JSON بازیابی شد");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "بازیابی فایل انجام نشد");
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    else clearDemoSession();
    showToast("از حساب خود خارج شدید");
  };

  const navItems = ([
    { id: "dashboard", label: "داشبورد", icon: LayoutDashboard },
    { id: "new-project", label: "پروژه جدید", icon: Plus },
    { id: "questions", label: "مسیر اعتبارسنجی", icon: ClipboardCheck },
    { id: "experiments", label: "فرضیات و آزمایش‌ها", icon: FlaskConical },
    { id: "location", label: "موقعیت و پاخور", icon: MapPin },
    { id: "report", label: "گزارش اعتبارسنجی", icon: BarChart3 },
  ] as { id: View; label: string; icon: typeof LayoutDashboard }[]).filter(item => item.id !== "location" || draft.presenceType !== "آنلاین");

  if (authLoading) {
    return (
      <div dir="rtl" style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "inherit",
        color: "#7b8494"
      }}>
        در حال بارگذاری...
      </div>
    );
  }

  if (!session) {
    return <Auth onSuccess={() => {
      if (!isSupabaseConfigured) setSession(getDemoSession());
    }} />;
  }

  return (
    <div className="app" dir="rtl">
      <div className={`mobile-overlay ${mobileNav ? "is-open" : ""}`} onClick={() => setMobileNav(false)} />
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="brand-row">
          <img className="brand-logo" src="./bizsanj-logo.png" alt="BizSanj - اعتبارسنج کسب و کار" />
          <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="بستن منو"><X size={18} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="avatar avatar-small">{profile.name?.slice(0, 1) || "؟"}</div>
          <div className="workspace-copy"><strong>{profile.name || "کاربر جدید"}</strong><span>{profile.role || "فضای شخصی"}</span></div>
          <ChevronLeft size={15} className="muted-icon" />
        </div>

        <div className="nav-label">فضای کار</div>
        <nav className="main-nav" aria-label="ناوبری اصلی">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => go(id)}>
              <Icon size={18} /> <span>{label}</span>
              {id === "experiments" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="nav-label nav-label-lower">پروژه‌های اخیر</div>
        {recentProjects.length ? recentProjects.slice(0, 3).map((project, index) => <button className={`recent-project ${index === 0 ? "active-project" : ""}`} key={project.id} onClick={() => go("questions")}>
          <span className={`project-dot ${index === 0 ? "amber" : "violet"}`} />
          <span>{project.name}</span>
          {index === 0 && <MoreHorizontal size={16} className="muted-icon" />}
        </button>) : <div className="recent-projects-empty">هنوز پروژه‌ای ساخته نشده است</div>}

        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          <button className="footer-link" onClick={() => go("help") }><CircleHelp size={17} /> راهنما و پرسش‌های متداول</button>
          <button className="footer-link" onClick={downloadJson}><Download size={17} /> دانلود پشتیبان JSON</button>
          <button className="footer-link" onClick={() => importInputRef.current?.click()}><Upload size={17} /> بازیابی از JSON</button>
          <button className="footer-link" onClick={handleSignOut}><LogOut size={17} /> خروج از حساب</button>
          <button className="footer-link" onClick={resetLocalData}><Settings2 size={17} /> پاک‌کردن داده‌های محلی</button>
          <button className="plan-card" onClick={() => growthEntitled ? showToast("پلن رشد شما فعال است") : setUpgradeOpen(true)}>
            <div className="plan-icon"><Zap size={17} /></div>
            <div><strong>{growthEntitled ? "پلن رشد فعال" : "نسخه رایگان"}</strong><span>{growthEntitled ? "پروژه‌های نامحدود" : "۱ پروژه فعال رایگان"}</span></div>
            <ArrowLeft size={16} className="muted-icon" />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="باز کردن منو"><Menu size={21} /></button>
          <div className="breadcrumbs"><span>فضای شخصی</span><ChevronLeft size={14} /><strong>{view === "dashboard" ? "داشبورد" : draft.name}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => showToast("اعلان جدیدی ندارید")} aria-label="اعلان‌ها"><Bell size={18} /></button>
            <div className="topbar-divider" />
          <div className="user-chip"><div className="avatar avatar-tiny">{profile.name?.slice(0, 1) || session?.user?.email?.slice(0, 1) || "؟"}</div><span>{profile.name || session?.user?.email || "کاربر"}</span><ChevronLeft size={14} /></div>
          </div>
        </header>

        <div className="page-wrap">
          {view === "dashboard" && <Dashboard profile={profile} draft={draft} recentProjects={recentProjects} onNavigate={go} onToast={showToast} />}
          {view === "help" && <HelpCenter onBack={() => go("dashboard")} />}
          {view === "new-project" && <NewProject profile={profile} setProfile={setProfile} draft={draft} setDraft={setDraft} hasExistingData={Boolean(draft.name.trim() || Object.keys(answers).length)} onBack={() => go("dashboard")} onExportBackup={downloadJson} onReset={() => { clearCurrentProjectData(); setDraft(initialProject); setAnswers(initialAnswers); setActiveQuestion(0); showToast("اطلاعات پروژه قبلی پاک شد؛ پروژه جدید را وارد کنید"); }} onContinue={startNewProject} />}
          {view === "questions" && <QuestionFlow questionBank={questionBank} draft={draft} setDraft={setDraft} active={active} activeQuestion={activeQuestion} setActiveQuestion={setActiveQuestion} answers={answers} setAnswers={setAnswers} saved={saved} setSaved={setSaved} onNext={() => activeQuestion < questionBank.length - 1 ? setActiveQuestion(activeQuestion + 1) : go("ai-review")} onExperiments={() => go("experiments")} onLocation={() => go("location")} progress={progress} />}
          {view === "ai-review" && <AIReview draft={draft} answers={answers} onContinue={() => go("experiments")} onToast={showToast} />}
          {view === "experiments" && <><InteractiveExperiments onReport={() => go("report")} onToast={showToast} />{draft.presenceType === "آنلاین" && <VirtualCompetitors />}</>}
          {view === "location" && draft.presenceType !== "آنلاین" && <LocationInsights />}
          {view === "report" && <UserReport draft={draft} answers={answers} questions={questionBank} onBack={() => go("experiments")} onAIReview={() => go("ai-review")} />}
        </div>
      </main>

      <input ref={importInputRef} type="file" accept="application/json,.json" onChange={importJson} style={{ display: "none" }} />
      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} onEntitled={() => setGrowthEntitled(true)} onToast={showToast} />}
    </div>
  );
}

function Dashboard({ profile, draft, recentProjects, onNavigate, onToast }: { profile: UserProfile; draft: ProjectDraft; recentProjects: RecentProject[]; onNavigate: (view: View) => void; onToast: (message: string) => void }) {
  const projectItems = recentProjects.length ? recentProjects : (draft.name ? [{ id: "current", name: draft.name, description: draft.description, presenceType: draft.presenceType, businessType: draft.businessType, updatedAt: new Date().toISOString() }] : []);
  return <section className="dashboard-page"><div className="page-heading dashboard-heading"><div><div className="eyebrow">فضای شخصی</div><h1>{profile.name ? `سلام ${profile.name}، آماده‌ای یک فرضیه را آزمایش کنیم؟` : "برای شروع، اطلاعات خودت را وارد کن"}</h1><p>ایده‌ها زمانی ارزشمند می‌شوند که به شواهد واقعی وصل شوند.</p></div><button className="primary-button" onClick={() => onNavigate("new-project")}><Plus size={18} /> پروژه جدید</button></div><div className="stat-grid"><div className="stat-card accent-card"><div className="stat-icon"><Gauge size={19} /></div><div><span>امتیاز اعتبارسنجی</span><strong>— <small>پس از ثبت داده</small></strong></div></div><div className="stat-card"><div className="stat-icon blue"><FlaskConical size={19} /></div><div><span>آزمایش‌های انجام‌شده</span><strong>۰</strong></div><div className="stat-note">هنوز داده‌ای ثبت نشده</div></div><div className="stat-card"><div className="stat-icon purple"><ShieldCheck size={19} /></div><div><span>شواهد ثبت‌شده</span><strong>۰</strong></div><div className="stat-note">هنوز داده‌ای ثبت نشده</div></div></div><div className="dashboard-grid"><div className="main-column"><div className="section-heading"><div><h2>پروژه‌های اخیر</h2><p>آخرین پروژه‌هایی که در این مرورگر ساخته یا ادامه داده‌ای.</p></div><button className="text-button" onClick={() => onNavigate("new-project")}>پروژه جدید <Plus size={15} /></button></div>{projectItems.length ? projectItems.map((project, index) => <div className={`project-card ${index === 0 ? "featured-project" : "compact-project"}`} key={project.id}><div className="project-card-top"><div className="project-title-wrap"><div className={`project-symbol ${index === 0 ? "amber-bg" : "violet-bg"}`}><BriefcaseBusiness size={20} /></div><div><h3>{project.name}</h3><div className="meta-row"><span className="status-pill draft"><span className="status-dot" />{index === 0 ? "آخرین پروژه" : "پروژه ذخیره‌شده"}</span>{project.presenceType && <span>{project.presenceType}</span>}{project.businessType && <span>{project.businessType}</span>}</div></div></div></div><div className="project-card-footer"><span className="evidence-count"><ShieldCheck size={14} /> ذخیره‌شده در همین مرورگر</span><button className="secondary-button" onClick={() => onNavigate("questions")}>ادامه مسیر <ArrowLeft size={15} /></button></div></div>) : <div className="empty-projects-card"><BriefcaseBusiness size={25} /><h3>هنوز پروژه‌ای ساخته نشده است</h3><p>اولین ایده‌ات را ثبت کن تا در این قسمت نگهداری شود.</p><button className="primary-button" onClick={() => onNavigate("new-project")}><Plus size={16} /> ساخت اولین پروژه</button></div>}</div><aside className="side-column"><div className="next-action-card"><div className="card-kicker"><Sparkles size={15} /> پیشنهاد بعدی</div><h3>{draft.name ? "یک آزمایش کوچک طراحی کن" : "ابتدا پروژه بساز"}</h3><p>{draft.name ? "برای مهم‌ترین فرضیه پروژه، یک آزمایش کوچک طراحی کن." : "نام و اطلاعات ایده‌ات را وارد کن تا مسیر اعتبارسنجی ساخته شود."}</p><div className="action-insight"><div className="insight-icon"><Target size={17} /></div><div><span>وضعیت</span><strong>{draft.name ? "هنوز فرضیه‌ای ثبت نشده" : "منتظر اطلاعات کاربر"}</strong></div></div><button className="primary-button full-width" onClick={() => onNavigate(draft.name ? "experiments" : "new-project")}>{draft.name ? "طراحی آزمایش" : "ساخت پروژه"} <ArrowLeft size={16} /></button></div><div className="tip-card"><div className="tip-icon"><Lightbulb size={18} /></div><div><strong>نکته اعتبارسنجی</strong><p>به جای پرسیدن «آیا می‌خری؟»، درباره آخرین باری بپرس که مشتری این مشکل را حل کرده است.</p><button className="text-button" onClick={() => onNavigate("help")}>مطالعه راهنما <ArrowLeft size={14} /></button></div></div></aside></div></section>;
}

function NewProject({ profile, setProfile, draft, setDraft, hasExistingData, onBack, onExportBackup, onReset, onContinue }: { profile: UserProfile; setProfile: (profile: UserProfile) => void; draft: ProjectDraft; setDraft: (draft: ProjectDraft) => void; hasExistingData: boolean; onBack: () => void; onExportBackup: () => void; onReset: () => void; onContinue: () => void }) {
  const [step, setStep] = useState(1);
  const valid = profile.name.trim().length > 1 && draft.name.trim().length > 2 && draft.description.trim().length > 10;
  const update = (key: keyof ProjectDraft, value: string) => setDraft({ ...draft, [key]: value });
  const businessTypes = ["دیجیتال", "خدماتی", "فروش", "تولید", "غذا و نوشیدنی", "آموزش", "سایر"];
  const goals = ["آیا مشکل واقعی است؟", "آیا مشتری حاضر به پرداخت است؟", "آیا قیمت مناسب است؟", "آیا کانال جذب مشتری جواب می‌دهد؟"];
  return <section className="form-page"><div className="page-heading"><div><div className="eyebrow">شروع یک مسیر جدید</div><h1>پروژه جدید بساز</h1><p>در چند قدم، ایده‌ات را به مجموعه‌ای از فرضیه‌های قابل آزمایش تبدیل کن.</p></div><div className="new-project-actions">{hasExistingData && <><div className="reset-warning">اگر پروژه قبلی برایت مهم است، ابتدا از آن <button type="button" onClick={onExportBackup}>فایل JSON پشتیبان بساز</button>؛ پاک‌سازی قابل بازگشت نیست.</div><button className="ghost-button reset-project-button" onClick={() => { if (window.confirm("اگر پروژه قبلی برایت مهم است، ابتدا فایل JSON پشتیبان بساز. اطلاعات پروژه فعلی پاک شود؟")) { onReset(); setStep(1); } }}><X size={16} /> پاک کردن اطلاعات پروژه قبلی</button></>}<button className="ghost-button" onClick={onBack}><X size={17} /> انصراف</button></div></div>
    <div className="stepper"><div className={`stepper-step ${step >= 1 ? "done" : ""}`}><span>{step > 1 ? <Check size={14} /> : "۱"}</span><label>هویت ایده</label></div><div className="stepper-line"><div style={{ width: step === 3 ? "100%" : step === 2 ? "50%" : "0%" }} /></div><div className={`stepper-step ${step >= 2 ? "done" : ""}`}><span>{step > 2 ? <Check size={14} /> : "۲"}</span><label>بازار و مشتری</label></div><div className="stepper-line"><div style={{ width: step === 3 ? "100%" : "0%" }} /></div><div className={`stepper-step ${step >= 3 ? "done" : ""}`}><span>۳</span><label>هدف اعتبارسنجی</label></div></div>
    <div className="form-layout"><div className="form-card"><div className="form-card-heading"><span className="form-step-label">مرحله {step} از ۳</span><h2>{step === 1 ? "ایده‌ات را واضح و کوتاه تعریف کن" : step === 2 ? "ایده در چه بازاری قرار می‌گیرد؟" : "این بار می‌خواهی چه چیزی را بفهمی؟"}</h2><p>{step === 1 ? "هنوز لازم نیست همه‌چیز را بدانی؛ فقط مسئله و مشتری را تا حد ممکن دقیق کن." : step === 2 ? "این اطلاعات مسیر پرسش‌ها و آزمایش‌های بعدی را شخصی‌سازی می‌کند." : "اولویت تو مشخص می‌کند کدام فرضیه زودتر بررسی شود."}</p></div>
      {step === 1 && <div className="form-fields"><label>نام شما <span>*</span><input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="نام و نام خانوادگی" /></label><label>نقش یا تخصص شما<input value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} placeholder="مثال: بنیان‌گذار، طراح، فروشنده" /></label><label>نام ایده یا پروژه <span>*</span><input value={draft.name} onChange={e => update("name", e.target.value)} placeholder="نام پروژه" /></label><label>ایده در یک جمله <span>*</span><textarea value={draft.description} onChange={e => update("description", e.target.value)} rows={4} placeholder="برای [گروه خاص مشتری] که با [مشکل مشخص] مواجه هستند..." /><small>بهتر است جمله‌ات مشتری، مشکل، راه‌حل و نتیجه را مشخص کند.</small></label><label>این ایده اکنون در چه مرحله‌ای است<select value={draft.stage} onChange={e => update("stage", e.target.value)}><option value="">انتخاب مرحله</option><option>فقط ایده</option><option>نمونه اولیه</option><option>فروش اولیه</option><option>کسب‌وکار فعال</option></select></label></div>}
      {step === 2 && <div className="form-fields"><label>شیوه ارائه محصول یا خدمت <span>*</span></label><div className="choice-grid presence-choice-grid">{["حضوری", "آنلاین", "ترکیبی"].map(type => <button key={type} className={`choice-button ${draft.presenceType === type ? "selected" : ""}`} onClick={() => update("presenceType", type as ProjectDraft["presenceType"])}>{type}{draft.presenceType === type && <Check size={15} />}</button>)}</div><small>اگر آنلاین را انتخاب کنی، تحلیل نقشه و رقبای محدوده حذف و تحلیل رقبای مجازی فعال می‌شود.</small><label>نوع کسب‌وکار</label><div className="choice-grid">{businessTypes.map(type => <button key={type} className={`choice-button ${draft.businessType === type ? "selected" : ""}`} onClick={() => update("businessType", type)}>{type}{draft.businessType === type && <Check size={15} />}</button>)}</div><div className="two-col"><label>بازار هدف<input value={draft.market} onChange={e => update("market", e.target.value)} placeholder="مثال: تهران" /></label><label>نوع مشتری<select value={draft.customerType} onChange={e => update("customerType", e.target.value)}><option value="مصرف‌کننده نهایی">مصرف‌کننده نهایی</option><option value="سازمان‌ها و کسب‌وکارها">سازمان‌ها و کسب‌وکارها</option><option value="مصرف‌کننده نهایی و سازمان‌ها">مصرف‌کننده نهایی و سازمان‌ها</option></select></label></div></div>}
      {step === 3 && <div className="form-fields"><label>مهم‌ترین تصمیمی که می‌خواهی بگیری</label><div className="goal-list">{goals.map(goal => <button key={goal} className={`goal-button ${draft.goal === goal ? "selected" : ""}`} onClick={() => update("goal", goal)}><span className="radio-dot">{draft.goal === goal && <span />}</span><span>{goal}</span><ChevronLeft size={16} /></button>)}</div><div className="trust-note"><ShieldCheck size={18} /><div><strong>اینجا جای جواب درست یا غلط نیست.</strong><span>ما از اطلاعات تو برای پیدا کردن مهم‌ترین ریسک و طراحی آزمایش‌های کوچک استفاده می‌کنیم.</span></div></div></div>}
      <div className="form-actions"><button className="ghost-button" onClick={() => step === 1 ? onBack() : setStep(step - 1)}><ArrowRight size={16} /> قبلی</button>{step < 3 ? <button className="primary-button" disabled={step === 1 && !valid} onClick={() => setStep(step + 1)}>ادامه <ArrowLeft size={16} /></button> : <button className="primary-button" onClick={onContinue}>ساخت پروژه و شروع <ArrowLeft size={16} /></button>}</div>
    </div><aside className="form-aside"><div className="aside-illustration"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="floating-icon icon-one"><Lightbulb size={19} /></div><div className="floating-icon icon-two"><Target size={18} /></div><div className="core-icon"><Sparkles size={28} /></div></div><h3>یک ایده خوب، شروع یک گفت‌وگوست</h3><p>تا وقتی فرضیه‌ها را به آزمایش و شواهد وصل نکرده‌ای، هنوز زود است درباره موفقیت تصمیم بگیری.</p><div className="quote-mark">“</div></aside></div></section>;
}

function QuestionFlow({ questionBank, draft, setDraft, active, activeQuestion, setActiveQuestion, answers, setAnswers, saved, setSaved, onNext, onExperiments, progress }: { questionBank: ValidationQuestion[]; draft: ProjectDraft; setDraft: (draft: ProjectDraft) => void; active: ValidationQuestion; activeQuestion: number; setActiveQuestion: (n: number) => void; answers: Record<string, string>; setAnswers: (value: Record<string, string>) => void; saved: boolean; setSaved: (value: boolean) => void; onNext: () => void; onExperiments: () => void; onLocation: () => void; progress: number }) {
  const selected = (answers[active.id] || "").split("||").filter(Boolean);
  const updateAnswer = (value: string) => { setAnswers({ ...answers, [active.id]: value }); setSaved(false); };
  const choose = (option: string) => {
    if (active.type === "multi") {
      updateAnswer(toggleMultiSelection(answers[active.id] || "", option, 3));
    } else {
      updateAnswer(option);
      if (active.id === "presenceCheck") {
        const presenceType = option.startsWith("کاملاً آنلاین") ? "آنلاین" : option.startsWith("ترکیبی") ? "ترکیبی" : "حضوری";
        setDraft({ ...draft, presenceType });
      }
    }
  };
  return <section className="questions-page"><div className="project-header"><div><button className="back-link" onClick={onExperiments}><ArrowRight size={15} /> بازگشت به پروژه‌ها</button><h1>{draft.name}</h1><div className="project-header-meta"><span className="status-pill progress"><span className="status-dot" />در حال اعتبارسنجی</span><span className="save-state">{saved ? <><Check size={14} /> ذخیره خودکار: انجام شد</> : "در حال ذخیره..."}</span></div></div><button className="secondary-button" onClick={() => setSaved(true)}><MoreHorizontal size={16} /> گزینه‌ها</button></div><div className="journey-progress"><div className="journey-progress-top"><span>مسیر اعتبارسنجی</span><strong>{progress}% تکمیل شده</strong></div><div className="progress-track"><div className="progress-fill amber-fill" style={{ width: `${progress}%` }} /></div></div><div className="question-layout"><aside className="journey-sidebar"><div className="journey-title">مسیر پروژه <span>{questionBank.length} مرحله</span></div>{questionBank.map((question, index) => { const isActive = question.id === active.id; const done = index < activeQuestion; return <button key={question.id} className={`journey-item ${isActive ? "active" : ""} ${done ? "completed" : ""}`} onClick={() => setActiveQuestion(index)}><span className="journey-icon">{done ? <Check size={14} /> : <Target size={15} />}</span><span>{question.title}</span>{isActive && <ChevronLeft size={15} />}</button>})}<button className="journey-report" onClick={onExperiments}><FlaskConical size={16} /> رفتن به آزمایش‌ها <ArrowLeft size={14} /></button></aside><div className="question-main"><div className="question-label">مرحله {active.step} از {questionBank.length} <span>•</span> اعتبارسنجی مرحله‌ای</div><h2>{active.title}</h2><p className="question-helper">{active.helper}</p><div className="question-card"><div className="question-card-top"><div className="question-icon"><Target size={20} /></div><div><span>پاسخ تو</span><small>{active.type === "multi" ? "حداکثر سه گزینه را انتخاب کن." : "یک گزینه را انتخاب کن؛ بعداً می‌توانی تغییرش بدهی."}</small></div></div>{active.type === "select" ? <select className="question-select" value={answers[active.id] || ""} onChange={e => choose(e.target.value)}><option value="">انتخاب کن...</option>{active.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : <div className="question-options">{active.options.map(option => <button key={option} className={`question-option ${selected.includes(option) ? "selected" : ""}`} onClick={() => choose(option)}><span className={active.type === "multi" ? "check-box" : "radio-dot"}>{selected.includes(option) && <Check size={12} />}</span><span>{option}</span><ChevronLeft size={15} /></button>)}</div>}<div className="question-card-footer"><span className="selection-count">{active.type === "multi" ? `${selected.length} از ۳ انتخاب` : selected.length ? "انتخاب ثبت شد" : "هنوز انتخاب نشده"}</span><span className="private-note"><ShieldCheck size={14} /> فقط برای پروژه تو</span></div></div><div className="why-card"><div className="why-icon"><CircleHelp size={18} /></div><div><strong>چرا این سؤال مهم است؟</strong><p>{active.why}</p></div></div><div className="question-actions"><button className="ghost-button" disabled={activeQuestion === 0} onClick={() => setActiveQuestion(Math.max(0, activeQuestion - 1))}><ArrowRight size={16} /> قبلی</button><button className="primary-button" disabled={!selected.length} onClick={onNext}>{activeQuestion === questionBank.length - 1 ? "بررسی پاسخ‌ها با هوش مصنوعی" : "ذخیره و ادامه"} <ArrowLeft size={16} /></button></div><div className="question-counter"><button className="dot-arrow" onClick={() => setActiveQuestion(Math.max(0, activeQuestion - 1))}><ArrowRight size={15} /></button>{questionBank.map((_, i) => <button key={i} aria-label={`سؤال ${i + 1}`} className={`question-dot ${i === activeQuestion ? "active" : ""} ${i < activeQuestion ? "done" : ""}`} onClick={() => setActiveQuestion(i)} />)}<button className="dot-arrow" onClick={() => setActiveQuestion(Math.min(questionBank.length - 1, activeQuestion + 1))}><ArrowLeft size={15} /></button></div></div></div></section>;
}

function AIReview({ draft, answers, onContinue, onToast }: { draft: ProjectDraft; answers: Record<string, string>; onContinue: () => void; onToast: (message: string) => void }) {
  const [analysis, setAnalysis] = useState(() => readUserAIResult());
  const [promptCopied, setPromptCopied] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<UserAIProvider>("claude");
  const [userResult, setUserResult] = useState(() => readUserAIResult());
  const [error, setError] = useState("");
  const location = useMemo(() => readStored<StoredLocationInsights | null>(STORAGE_KEYS.location, null), []);
  const prompt = useMemo(() => buildValidationPrompt({ project: draft, answers, location }), [draft, answers, location]);

  const prepareForAI = async (provider: UserAIProvider) => {
    setSelectedProvider(provider);
    setError("");
    try {
      await copyPrompt(prompt);
      setPromptCopied(true);
      openUserAI(provider);
      onToast(`پرامپت کپی شد؛ آن را در ${getProviderLabel(provider)} جای‌گذاری کنید`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "کپی پرامپت انجام نشد.");
    }
  };

  const showResult = () => {
    const result = userResult.trim();
    if (!result) {
      setError("ابتدا پاسخ دریافت‌شده از هوش مصنوعی را در کادر وارد کنید.");
      return;
    }
    saveUserAIResult(result);
    setAnalysis(result);
    onToast(`نتیجه ${getProviderLabel(selectedProvider)} داخل پروژه ذخیره شد`);
  };

  const pasteFromClipboard = async () => {
    try {
      setUserResult(await readClipboardText());
      setError("");
      onToast("پاسخ از کلیپ‌بورد وارد شد");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "خواندن کلیپ‌بورد انجام نشد.");
    }
  };

  return <section className="ai-review-page"><div className="page-heading"><div><div className="eyebrow">پایان پرسشنامه <span className="slash">/</span> بررسی هوشمند</div><h1>قبل از گزارش، پاسخ‌ها را بررسی کنیم</h1><p>پرامپت کامل پروژه را کپی کن، آن را در هوش مصنوعی شخصی خودت اجرا کن و پاسخ را دوباره داخل برنامه قرار بده.</p></div><div className="ai-review-icon"><Sparkles size={23} /></div></div><div className="ai-review-card"><div className="ai-review-card-head"><div><span className="card-kicker"><Sparkles size={15} /> تحلیل با هوش مصنوعی کاربر</span><h2>{analysis ? "نتیجه بررسی آماده است" : "انتخاب سرویس تحلیل"}</h2></div><span className="ai-review-count">{Object.keys(answers).length} پاسخ ثبت‌شده</span></div><div className="user-ai-note"><strong>بدون کلید API و بدون Backend</strong><span>اطلاعات فقط با اقدام خودت به سرویس انتخابی ارسال می‌شود.</span></div><div className="user-ai-buttons"><button className="primary-button" onClick={() => void prepareForAI("claude")}>تحلیل با Claude <ArrowLeft size={16} /></button><button className="secondary-button" onClick={() => void prepareForAI("chatgpt")}>تحلیل با ChatGPT</button><button className="secondary-button" onClick={() => void prepareForAI("gemini")}>تحلیل با Gemini</button></div>{promptCopied && <div className="ai-review-success"><Check size={16} /> پرامپت کپی شد. در <a href={getProviderUrl(selectedProvider)} target="_blank" rel="noreferrer">{getProviderLabel(selectedProvider)}</a> جای‌گذاری و ارسال کنید؛ سپس پاسخ را در کادر زیر وارد کنید.</div>}<label className="user-ai-result-label">پاسخ دریافت‌شده را اینجا جای‌گذاری کنید<textarea className="user-ai-result" value={userResult} onChange={event => setUserResult(event.target.value)} placeholder="پاسخ Claude، ChatGPT یا Gemini را اینجا وارد کنید..." rows={9} /><button className="secondary-button user-ai-paste-button" onClick={() => void pasteFromClipboard()}>چسباندن خودکار از کلیپ‌بورد</button></label>{error && <div className="ai-review-error"><strong>ورود نتیجه انجام نشد</strong><p>{error}</p></div>}<div className="ai-review-actions"><button className="ghost-button" onClick={() => onToast("پاسخ‌ها در مرورگر ذخیره شده‌اند")}>بازبینی ذخیره‌سازی</button><div className="user-ai-action-group"><button className="secondary-button" onClick={showResult}>نمایش نتیجه در برنامه</button><button className="primary-button" onClick={onContinue}>{analysis ? "ادامه به فرضیات و آزمایش‌ها" : "ادامه بدون تحلیل آنلاین"} <ArrowLeft size={16} /></button></div></div>{analysis && <div className="ai-review-content">{analysis}</div>}</div></section>;
}

function Experiments({ onReport, open, setOpen, onToast }: { onReport: () => void; open: boolean; setOpen: (value: boolean) => void; onToast: (message: string) => void }) {
  const [experimentName, setExperimentName] = useState("");
  return <section className="experiments-page"><div className="page-heading"><div><div className="eyebrow">فروش غذای سالم اشتراکی <span className="slash">/</span> مرحله آزمایش</div><h1>فرضیات و آزمایش‌ها</h1><p>فرضیات پرریسک را پیدا کن، برایشان آزمایش کوچک طراحی کن و شواهد واقعی جمع کن.</p></div><button className="primary-button" onClick={() => setOpen(true)}><Plus size={18} /> آزمایش جدید</button></div><div className="experiment-summary"><div><div className="summary-icon amber-bg"><Target size={19} /></div><div><span>فرضیه‌های شناسایی‌شده</span><strong>۳ فرضیه</strong></div></div><div><div className="summary-icon blue-bg"><FlaskConical size={19} /></div><div><span>آزمایش در حال اجرا</span><strong>۱ آزمایش</strong></div></div><div><div className="summary-icon green-bg"><ShieldCheck size={19} /></div><div><span>سطح شواهد</span><strong>متوسط</strong></div></div><div className="summary-score"><span>امتیاز فعلی</span><strong>۶۸ <small>/ ۱۰۰</small></strong><div className="mini-progress"><span style={{ width: "68%" }} /></div></div></div><div className="section-heading experiments-heading"><div><h2>فرضیه‌های مهم</h2><p>از پرریسک‌ترین فرضیه شروع کن.</p></div><button className="text-button" onClick={() => onToast("فیلترها به‌زودی فعال می‌شوند")}><Search size={15} /> فیلتر</button></div><div className="hypothesis-list"><HypothesisCard number="۰۱" title="کارمندان پرمشغله حاضرند برای غذای سالم اشتراک ماهانه بخرند" tag="ریسک بالا" tagClass="danger" status="آزمایش در حال اجرا" statusClass="running" description="فرضیه مطلوبیت و پرداخت؛ اگر اشتباه باشد، مدل اشتراکی نیاز به بازطراحی دارد." evidence="۲ شواهد" action="مشاهده آزمایش" onClick={() => setOpen(true)} /><HypothesisCard number="۰۲" title="تحویل بین ساعت ۱۲ تا ۱۳:۳۰ برای مشتری قابل‌اعتماد است" tag="ریسک متوسط" tagClass="warning" status="آماده آزمایش" statusClass="ready" description="فرضیه امکان اجرا؛ باید زمان و محدوده تحویل را با یک آزمایش دستی بسنجیم." evidence="۰ شواهد" action="طراحی آزمایش" onClick={() => setOpen(true)} /><HypothesisCard number="۰۳" title="اینستاگرام کانال کم‌هزینه‌ای برای جذب اولین مشتریان است" tag="ریسک پایین" tagClass="success" status="تأیید نشده" statusClass="pending" description="فرضیه کانال؛ فعلاً داده کافی برای مقایسه با معرفی و همکاری سازمانی نداریم." evidence="۱ شاهد" action="ثبت شواهد" onClick={() => onToast("فرم ثبت شواهد باز می‌شود")} /></div><div className="next-step-banner"><div className="banner-icon"><Zap size={20} /></div><div><strong>پیشنهاد سیستم برای قدم بعدی</strong><p>برای فرضیه اول، با ۱۰ مشتری بالقوه درباره پرداخت پیش‌پرداخت صحبت کن.</p></div><button className="secondary-button" onClick={onReport}>دیدن نمونه گزارش <ArrowLeft size={15} /></button></div>{open && <div className="modal-backdrop" onClick={() => setOpen(false)}><div className="experiment-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setOpen(false)}><X size={18} /></button><div className="modal-icon"><FlaskConical size={22} /></div><div className="eyebrow">طراحی آزمایش کم‌هزینه</div><h2>فرضیه اول را چطور آزمایش می‌کنی؟</h2><p>آزمایشی را انتخاب کن که قبل از ساخت محصول، بیشترین عدم‌قطعیت را کم کند.</p><div className="experiment-options"><button className="experiment-option selected"><div><strong>پیش‌فروش / پیش‌پرداخت</strong><span>قوی‌ترین شواهد از تعهد مالی مشتری</span></div><Check size={17} /></button><button className="experiment-option"><div><strong>مصاحبه با مشتری</strong><span>برای فهم رفتار گذشته و هزینه فعلی</span></div><ChevronLeft size={16} /></button><button className="experiment-option"><div><strong>صفحه فرود</strong><span>برای سنجش علاقه و ثبت‌نام اولیه</span></div><ChevronLeft size={16} /></button></div><label className="modal-label">نام آزمایش (اختیاری)<input value={experimentName} onChange={e => setExperimentName(e.target.value)} placeholder="مثال: پیش‌فروش ۱۰ اشتراک ماهانه" /></label><div className="modal-actions"><button className="ghost-button" onClick={() => setOpen(false)}>انصراف</button><button className="primary-button" onClick={() => { setOpen(false); onToast("آزمایش با موفقیت به پروژه اضافه شد") }}>ساخت آزمایش <ArrowLeft size={16} /></button></div></div></div>}</section>;
}

function HypothesisCard({ number, title, tag, tagClass, status, statusClass, description, evidence, action, onClick }: { number: string; title: string; tag: string; tagClass: string; status: string; statusClass: string; description: string; evidence: string; action: string; onClick: () => void }) {
  return <div className="hypothesis-card"><div className="hypothesis-number">{number}</div><div className="hypothesis-content"><div className="hypothesis-top"><div><span className={`risk-tag ${tagClass}`}>{tag}</span><span className={`experiment-status ${statusClass}`}><span className="status-dot" />{status}</span></div><button className="icon-button"><MoreHorizontal size={18} /></button></div><h3>{title}</h3><p>{description}</p><div className="hypothesis-footer"><span className="evidence-count"><ShieldCheck size={14} /> {evidence}</span><button className="text-button" onClick={onClick}>{action} <ArrowLeft size={14} /></button></div></div></div>;
}

function Report({ draft, answers, onBack, onToast }: { draft: ProjectDraft; answers: Record<string, string>; onBack: () => void; onToast: (message: string) => void }) {
  const bars = useMemo(() => [62, 74, 48, 81, 67, 54, 72], []);
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const runAIAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const result = await analyzeValidation({ project: draft, answers });
      setAnalysis(result);
      onToast("تحلیل هوش مصنوعی آماده شد");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "تحلیل هوش مصنوعی انجام نشد");
    } finally {
      setAnalysisLoading(false);
    }
  };
  return <section className="report-page"><div className="report-top"><button className="back-link" onClick={onBack}><ArrowRight size={15} /> بازگشت به فرضیات</button><div className="report-actions"><button className="secondary-button" onClick={() => onToast("لینک اشتراک‌گذاری کپی شد")}><UsersRound size={16} /> اشتراک‌گذاری</button><button className="secondary-button" onClick={runAIAnalysis} disabled={analysisLoading}><Sparkles size={16} /> {analysisLoading ? "در حال تحلیل..." : "تحلیل با هوش مصنوعی"}</button><button className="primary-button" onClick={() => onToast("نسخه PDF در حال آماده‌سازی است")}><ArrowLeft size={16} /> خروجی گزارش</button></div></div><div className="report-heading"><div><div className="eyebrow">گزارش اعتبارسنجی <span className="slash">/</span> ۲۸ مهر ۱۴۰۳</div><h1>فروش غذای سالم اشتراکی</h1><p>تصویری از آنچه تاکنون می‌دانیم؛ نه پیش‌بینی قطعی موفقیت.</p></div><span className="report-version"><Check size={14} /> بروزرسانی خودکار</span></div>{analysis && <div className="report-card ai-analysis-card"><div className="section-heading"><div><h2>تحلیل هوش مصنوعی</h2><p>این تحلیل بر اساس پاسخ‌های فعلی پروژه تولید شده است.</p></div><Sparkles size={18} /></div><div className="ai-analysis-content">{analysis}</div></div>}<div className="report-score-grid"><div className="score-card"><div className="score-ring"><div><strong>۶۸</strong><span>از ۱۰۰</span></div></div><div><span className="score-label">امتیاز آمادگی اعتبارسنجی</span><h2>قابل آزمایش در بازار</h2><p>شواهد اولیه امیدوارکننده‌اند، اما هنوز درباره پرداخت و تکرار خرید اطمینان کافی نداریم.</p></div></div><div className="score-insight"><div className="insight-icon"><Sparkles size={18} /></div><div><strong>مهم‌ترین ریسک باقی‌مانده</strong><p>آیا مشتری برای اشتراک ماهانه، قبل از تجربه محصول، تعهد مالی می‌دهد؟</p><button className="text-button" onClick={onBack}>رفتن به آزمایش <ArrowLeft size={14} /></button></div></div></div><div className="report-grid"><div className="report-main"><div className="report-card"><div className="section-heading"><div><h2>امتیاز در هر بُعد</h2><p>امتیازها بر اساس کیفیت شواهد ثبت‌شده محاسبه شده‌اند.</p></div><button className="icon-button" onClick={() => onToast("توضیحات امتیاز باز شد")}><CircleHelp size={17} /></button></div><div className="dimension-list"><Dimension label="مسئله و نیاز" score="۸۲" color="amber" note="مصاحبه و شواهد رفتاری" /><Dimension label="مشتری هدف" score="۷۴" color="blue" note="پرسونا تعریف شده" /><Dimension label="بازار و رقبا" score="۵۸" color="purple" note="نیاز به تحقیق بیشتر" /><Dimension label="ارزش پیشنهادی" score="۶۵" color="green" note="نمونه اولیه آماده" /><Dimension label="مدل درآمد" score="۴۹" color="red" note="پرریسک‌ترین بخش" /></div></div><div className="report-card chart-card"><div className="section-heading"><div><h2>روند پیشرفت</h2><p>امتیاز طی چهار هفته</p></div><span className="chart-period">۴ هفته <ChevronLeft size={14} /></span></div><div className="chart"><div className="chart-y"><span>۱۰۰</span><span>۵۰</span><span>۰</span></div><div className="chart-bars">{bars.map((height, i) => <div key={i} className="bar-wrap"><div className={`bar ${i === bars.length - 1 ? "current" : ""}`} style={{ height: `${height}%` }} /><span>{["هفته ۱", "", "هفته ۲", "", "هفته ۳", "", "اکنون"][i]}</span></div>)}</div></div></div></div><aside className="report-side"><div className="report-card strengths-card"><div className="card-kicker green-text"><Check size={15} /> نقاط قوت</div><ul><li>مسئله پرتکرار و قابل لمس شناسایی شده</li><li>گروه اولیه مشتری مشخص است</li><li>نمونه اولیه برای آزمایش آماده است</li></ul></div><div className="report-card risks-card"><div className="card-kicker red-text"><Target size={15} /> ریسک‌ها</div><ul><li>تمایل به پرداخت هنوز تأیید نشده</li><li>هزینه تحویل می‌تواند حاشیه سود را کم کند</li><li>رقیب‌های تثبیت‌شده در بازار حضور دارند</li></ul></div><div className="next-action-report"><div className="card-kicker"><Zap size={15} /> اقدام بعدی</div><h3>۱۰ پیش‌فروش بگیر</h3><p>بدون ساخت محصول کامل، با مشتریان واقعی تعهد مالی را بسنج.</p><button className="primary-button full-width" onClick={onBack}>شروع آزمایش <ArrowLeft size={16} /></button></div></aside></div></section>;
}

function Dimension({ label, score, color, note }: { label: string; score: string; color: string; note: string }) { return <div className="dimension-row"><div className={`dimension-icon ${color}`}><BarChart3 size={16} /></div><div className="dimension-copy"><div><strong>{label}</strong><span>{note}</span></div><b>{score}<small>/ ۱۰۰</small></b></div><div className="dimension-track"><span className={color} style={{ width: `${Number(score) / 1}%` }} /></div></div>; }

export default App;
