import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapView, type MapPosition } from "@/components/Map";
import {
  ArrowLeft,
  Camera,
  Car,
  Check,
  ChevronLeft,
  CircleHelp,
  Footprints,
  MapPin,
  Plus,
  ShieldCheck,
  Store,
  UsersRound,
  X,
} from "lucide-react";
import { readStored, STORAGE_KEYS, type SamplingEntry, type StoredLocationInsights, writeStored } from "@/lib/persistence";

type Competitor = {
  name: string;
  kind: "مستقیم" | "غیرمستقیم";
  address: string;
  distance: string;
  color: "red" | "violet";
  position?: MapPosition;
};

const INITIAL_CENTER = { lat: 35.7575, lng: 51.4105 };
const DEMO_COMPETITOR_NAMES = new Set(["فودباکس ونک", "کافه رستوران هفت", "آشپزخانه‌های خانگی"]);

const mapLinks = (position: MapPosition | undefined, address: string) => {
  const query = position ? `${position.lat},${position.lng}` : encodeURIComponent(address);
  return {
    osm: position ? `https://www.openstreetmap.org/?mlat=${position.lat}&mlon=${position.lng}#map=18/${position.lat}/${position.lng}` : `https://www.openstreetmap.org/search?query=${query}`,
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
  };
};

export function LocationInsights() {
  const mapRef = useRef<L.Map | null>(null);
  const competitorMarkersRef = useRef<L.Layer[]>([]);
  const pickingPointRef = useRef(false);
  const pickingBusinessRef = useRef(false);
  const draftMarkerRef = useRef<L.Layer | null>(null);
  const businessMarkerRef = useRef<L.Layer | null>(null);
  const [showCompetitorForm, setShowCompetitorForm] = useState(false);
  const [pickingPoint, setPickingPoint] = useState(false);
  const [pickingBusiness, setPickingBusiness] = useState(false);
  const storedLocation = readStored<StoredLocationInsights | null>(STORAGE_KEYS.location, null);
  const [competitors, setCompetitors] = useState((storedLocation?.competitors || []).filter(competitor => !DEMO_COMPETITOR_NAMES.has(competitor.name)));
  const [businessPosition, setBusinessPosition] = useState<MapPosition | undefined>(storedLocation?.businessPosition);
  const [footfall, setFootfall] = useState(storedLocation?.footfall || { peoplePerDay: "", carsPerDay: "", confidence: "" });
  const [newCompetitor, setNewCompetitor] = useState<{ name: string; kind: Competitor["kind"]; address: string; position?: MapPosition }>({ name: "", kind: "مستقیم", address: "" });
  const [locationSaved, setLocationSaved] = useState(true);
  const [source, setSource] = useState(storedLocation?.source || "");
  const [showSampling, setShowSampling] = useState(false);
  const [sampling, setSampling] = useState<SamplingEntry[]>(storedLocation?.samplingPlan || []);
  const [mapsReference, setMapsReference] = useState(storedLocation?.googleMapsReference || { peoplePerDay: "", carsPerDay: "" });

  useEffect(() => {
    writeStored(STORAGE_KEYS.location, {
      center: businessPosition || storedLocation?.center || INITIAL_CENTER,
      businessPosition,
      source,
      footfall,
      competitors,
      samplingPlan: sampling,
      googleMapsReference: mapsReference,
    });
  }, [businessPosition, competitors, footfall, source, sampling, mapsReference]);

  const number = (value: string) => Number(value.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[^0-9.]/g, "")) || 0;
  const average = (entries: SamplingEntry[], key: "people" | "cars") => { const filled = entries.filter(entry => number(entry[key]) > 0); return filled.length ? Math.round(filled.reduce((sum, entry) => sum + number(entry[key]), 0) / filled.length) : 0; };
  const totalAveragePeople = average(sampling, "people");
  const mapsPeople = number(mapsReference.peoplePerDay);
  const mapsDifference = mapsPeople && totalAveragePeople ? Math.round((totalAveragePeople - mapsPeople) / mapsPeople * 100) : null;
  const updateSampling = (id: string, key: "people" | "cars", value: string) => setSampling(current => current.map(entry => entry.id === id ? { ...entry, [key]: value } : entry));
  const createSamplingPlan = () => {
    const days: SamplingEntry["day"][] = ["روز کاری اول", "روز کاری دوم", "روز تعطیل"];
    const times: SamplingEntry["time"][] = ["صبح", "ظهر", "عصر"];
    setSampling(days.flatMap(day => times.map(time => ({ id: `${day}-${time}`, day, time, people: "", cars: "" }))));
    setShowSampling(true);
  };

  useEffect(() => {
    if (mapRef.current) drawCompetitors(mapRef.current);
  }, [competitors]);

  const drawCompetitors = (map: L.Map) => {
    competitorMarkersRef.current.forEach(marker => marker.remove());
    competitorMarkersRef.current = [];
    const addMarker = (competitor: Competitor, position: MapPosition) => {
      const marker = L.circleMarker([position.lat, position.lng], {
        radius: competitor.kind === "مستقیم" ? 8 : 7,
        color: competitor.kind === "مستقیم" ? "#d66b62" : "#8269c5",
        fillColor: competitor.kind === "مستقیم" ? "#e89187" : "#a995df",
        fillOpacity: .9,
        weight: 2,
      }).addTo(map).bindPopup(`<strong>${competitor.name}</strong><br />${competitor.kind}<br />${competitor.address || "آدرس ثبت نشده"}<br /><a href="${mapLinks(position, competitor.address).osm}" target="_blank" rel="noreferrer">بازکردن در OpenStreetMap</a><br /><a href="${mapLinks(position, competitor.address).google}" target="_blank" rel="noreferrer">بازکردن در Google Maps</a>`);
      competitorMarkersRef.current.push(marker);
    };
    competitors.forEach(competitor => {
      if (competitor.position) {
        addMarker(competitor, competitor.position);
      }
    });
  };

  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
    if (businessPosition) {
      map.setView([businessPosition.lat, businessPosition.lng], 14);
      businessMarkerRef.current = L.circleMarker([businessPosition.lat, businessPosition.lng], { radius: 10, color: "#078f95", fillColor: "#0fb99f", fillOpacity: 1, weight: 3 }).addTo(map).bindPopup("محل کسب‌وکار انتخاب‌شده");
    }
    map.on("click", event => {
      if (pickingBusinessRef.current) {
        const position = { lat: event.latlng.lat, lng: event.latlng.lng };
        setBusinessPosition(position);
        businessMarkerRef.current?.remove();
        businessMarkerRef.current = L.circleMarker([position.lat, position.lng], { radius: 10, color: "#078f95", fillColor: "#0fb99f", fillOpacity: 1, weight: 3 }).addTo(map).bindPopup("محل کسب‌وکار انتخاب‌شده").openPopup();
        map.setView([position.lat, position.lng], Math.max(map.getZoom(), 14));
        setPickingBusiness(false);
        pickingBusinessRef.current = false;
        setLocationSaved(false);
        return;
      }
      if (!pickingPointRef.current) return;
      const position = { lat: event.latlng.lat, lng: event.latlng.lng };
      setNewCompetitor(current => ({ ...current, position, address: current.address || `مختصات: ${position.lat.toFixed(5)}، ${position.lng.toFixed(5)}` }));
      setPickingPoint(false);
      pickingPointRef.current = false;
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = L.marker([position.lat, position.lng]).addTo(map).bindPopup("نقطه رقیب جدید").openPopup();
      setShowCompetitorForm(true);
    });
    drawCompetitors(map);
  };

  const startPointPicking = () => {
    setPickingPoint(true);
    pickingPointRef.current = true;
    setShowCompetitorForm(false);
  };

  const startBusinessPicking = () => {
    setPickingBusiness(true);
    pickingBusinessRef.current = true;
    setPickingPoint(false);
    pickingPointRef.current = false;
    setShowCompetitorForm(false);
  };

  const togglePointPickingFromForm = () => {
    const next = !pickingPoint;
    setPickingPoint(next);
    pickingPointRef.current = next;
    if (next) setShowCompetitorForm(false);
  };

  const addCompetitor = () => {
    if (!newCompetitor.name.trim()) return;
    setCompetitors([...competitors, { ...newCompetitor, distance: newCompetitor.position ? "نقطه روی نقشه" : "ثبت دستی", color: newCompetitor.kind === "مستقیم" ? "red" : "violet" }]);
    draftMarkerRef.current?.remove();
    draftMarkerRef.current = null;
    setNewCompetitor({ name: "", kind: "مستقیم", address: "" });
    setPickingPoint(false);
    pickingPointRef.current = false;
    setShowCompetitorForm(false);
  };

  const closeCompetitorForm = () => {
    draftMarkerRef.current?.remove();
    draftMarkerRef.current = null;
    setPickingPoint(false);
    pickingPointRef.current = false;
    setShowCompetitorForm(false);
  };

  return (
    <section className="location-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">بازار و رقبا</div>
          <h1>موقعیت، پاخور و نقشه رقبا</h1>
          <p>قبل از تصمیم‌گیری درباره محل، تردد آدم‌ها و ماشین‌ها را به یک فرضیه قابل سنجش تبدیل کن.</p>
        </div>
        <button className="primary-button" onClick={() => setLocationSaved(true)}><Check size={17} /> ذخیره تحلیل</button>
      </div>

      <div className="location-grid">
        <div className="map-card">
          <div className="map-card-head">
            <div><div className="card-kicker"><MapPin size={15} /> نقشه موقعیت</div><h2>{businessPosition ? "محل انتخاب‌شده کسب‌وکار" : "محل کسب‌وکار انتخاب نشده"}</h2><p>{businessPosition ? `${businessPosition.lat.toFixed(5)}، ${businessPosition.lng.toFixed(5)}` : "برای ثبت محل، روی نقشه نقطه انتخاب کنید."}</p></div>
            <div className="map-actions"><span className="map-toggle active"><MapPin size={15} /> OpenStreetMap</span><button className="secondary-button" onClick={startBusinessPicking}><Store size={16} /> {businessPosition ? "تغییر محل" : "انتخاب محل"}</button></div>
          </div>
          <div className="map-shell"><MapView initialCenter={businessPosition || INITIAL_CENTER} initialZoom={14} onMapReady={handleMapReady} className="location-map" />{(pickingPoint || pickingBusiness) && <div className="map-picking-banner"><MapPin size={15} /> {pickingBusiness ? "روی نقشه کلیک کن تا محل کسب‌وکار ثبت شود" : "روی نقشه کلیک کن تا نقطه رقیب ثبت شود"} <button type="button" onClick={() => { setPickingPoint(false); setPickingBusiness(false); pickingPointRef.current = false; pickingBusinessRef.current = false; }}>انصراف</button></div>}<div className="map-legend"><span><i className="legend-dot business-dot" /> محل کسب‌وکار</span><span><i className="legend-dot direct-dot" /> رقیب مستقیم</span><span><i className="legend-dot indirect-dot" /> رقیب غیرمستقیم</span></div></div>
          <div className="map-footnote"><ShieldCheck size={14} /> نقشه از OpenStreetMap می‌آید؛ نشانگرهای محل پیشنهادی و رقبا بر اساس داده‌های ثبت‌شده در همین پروژه نمایش داده می‌شوند.</div>
        </div>

        <aside className="location-side">
          <div className="location-score-card"><div className="score-card-top"><div><span>امتیاز تناسب لوکیشن</span><strong>۷۲ <small>/ ۱۰۰</small></strong></div><div className="score-mini-ring">۷۲</div></div><div className="progress-track"><div className="progress-fill amber-fill" style={{ width: "72%" }} /></div><p>پاخور خوب، اما برای تصمیم نهایی به نمونه‌برداری در چند بازه زمانی نیاز است.</p></div>
          <div className="metric-card"><div className="section-heading"><div><h2>پاخور ثبت‌شده</h2><p>اعداد را خودت وارد کن</p></div><CircleHelp size={16} className="muted-icon" /></div><div className="footfall-inputs"><label>نفر / روز<input value={footfall.peoplePerDay} onChange={event => setFootfall({ ...footfall, peoplePerDay: event.target.value })} placeholder="مثال: ۸۶۰" /></label><label>خودرو / روز<input value={footfall.carsPerDay} onChange={event => setFootfall({ ...footfall, carsPerDay: event.target.value })} placeholder="مثال: ۱۴۲۰" /></label><label>اطمینان برآورد<input value={footfall.confidence} onChange={event => setFootfall({ ...footfall, confidence: event.target.value })} placeholder="مثال: متوسط، ۶۲٪" /></label></div></div>
          <div className="source-card"><div className="section-heading"><div><h2>منبع داده پاخور</h2><p>منبع را برای تحلیل شفاف ثبت کن.</p></div><Camera size={17} className="muted-icon" /></div><select value={source} onChange={e => setSource(e.target.value)}><option value="">انتخاب منبع</option><option>ترکیبی: شمارش دستی + نقشه</option><option>پایش دوربین مجاز فروشگاه</option><option>داده ترافیکی</option><option>برآورد دستی / مشاهده میدانی</option></select><div className="privacy-note"><ShieldCheck size={14} /><span>فقط داده تجمیعی ثبت کن؛ چهره، پلاک و هویت افراد نباید ذخیره شود.</span></div></div>
        </aside>
      </div>

      <div className="competitor-section"><div className="section-heading"><div><h2>رقبا و جایگزین‌ها</h2><p>رقیب مستقیم همان راه‌حل است؛ غیرمستقیم می‌تواند روش دیگری برای حل همان نیاز باشد.</p></div><div className="competitor-actions"><button className="secondary-button" onClick={() => setShowCompetitorForm(true)}><Plus size={16} /> افزودن رقیب</button><button className="secondary-button" onClick={startPointPicking}><MapPin size={16} /> انتخاب نقطه روی نقشه</button></div></div><div className="competitor-table"><div className="competitor-table-head"><span>نام / نوع</span><span>آدرس یا توضیح</span><span>فاصله</span><span>وضعیت</span></div>{competitors.map((competitor, index) => <div className="competitor-row" key={`${competitor.name}-${index}`}><div className="competitor-name"><span className={`competitor-marker ${competitor.color}`}><MapPin size={14} /></span><div><strong>{competitor.name}</strong><span className={`competitor-kind ${competitor.kind === "مستقیم" ? "direct" : "indirect"}`}>{competitor.kind}</span></div></div><span>{competitor.address}</span><span>{competitor.distance}</span><span className="competitor-status"><Check size={13} /> ثبت شده</span></div>)}</div></div>

      <div className="footfall-plan"><div className="plan-icon"><Camera size={19} /></div><div><strong>برای تصمیم مطمئن‌تر، یک برنامه نمونه‌برداری بساز</strong><p>صبح، ظهر و عصر را در دو روز کاری و یک روز تعطیل ثبت کن و میانگین را با داده Google Maps مقایسه کن.</p></div><button className="secondary-button" onClick={() => sampling.length ? setShowSampling(true) : createSamplingPlan()}>ثبت نمونه‌برداری <ArrowLeft size={15} /></button></div>

      {showSampling && <div className="modal-backdrop" onClick={() => setShowSampling(false)}><div className="sampling-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setShowSampling(false)}><X size={18} /></button><div className="modal-icon"><Camera size={21} /></div><div className="eyebrow">برنامه نمونه‌برداری پاخور</div><h2>۹ نوبت شمارش را ثبت کن</h2><p>در هر نوبت، افراد و خودروهای عبوری را فقط به‌صورت تجمیعی ثبت کن. این داده با Google Maps مقایسه می‌شود، نه اینکه از Google Maps به‌صورت خودکار خوانده شود.</p><div className="sampling-table"><div className="sampling-head"><span>روز</span><span>بازه</span><span>نفر</span><span>خودرو</span></div>{sampling.map(entry => <div className="sampling-row" key={entry.id}><strong>{entry.day}</strong><span>{entry.time}</span><input inputMode="decimal" value={entry.people} onChange={event => updateSampling(entry.id, "people", event.target.value)} placeholder="تعداد نفر" /><input inputMode="decimal" value={entry.cars} onChange={event => updateSampling(entry.id, "cars", event.target.value)} placeholder="تعداد خودرو" /></div>)}</div><div className="maps-reference"><strong>مرجع مقایسه Google Maps</strong><span>مقدار روزانه‌ای را که از اطلاعات/برآورد Google Maps به‌دست آورده‌ای وارد کن.</span><div><label>نفر / روز<input inputMode="decimal" value={mapsReference.peoplePerDay} onChange={event => setMapsReference({ ...mapsReference, peoplePerDay: event.target.value })} placeholder="اختیاری" /></label><label>خودرو / روز<input inputMode="decimal" value={mapsReference.carsPerDay} onChange={event => setMapsReference({ ...mapsReference, carsPerDay: event.target.value })} placeholder="اختیاری" /></label></div></div>{sampling.length > 0 && <div className="sampling-summary"><span>میانگین فعلی ثبت‌شده: <b>{totalAveragePeople ? `${totalAveragePeople.toLocaleString("fa-IR")} نفر/روز` : "هنوز کامل نشده"}</b></span>{mapsDifference !== null && <span>اختلاف با مرجع Google Maps: <b className={mapsDifference >= 0 ? "positive" : "negative"}>{mapsDifference > 0 ? "+" : ""}{mapsDifference.toLocaleString("fa-IR")}٪</b></span>}</div>}<div className="modal-actions"><button className="ghost-button" onClick={() => setShowSampling(false)}>بستن</button><button className="primary-button" onClick={() => { setLocationSaved(true); setShowSampling(false); }}>ذخیره نمونه‌برداری <Check size={16} /></button></div></div></div>}

      {showCompetitorForm && <div className="modal-backdrop" onClick={closeCompetitorForm}><div className="competitor-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={closeCompetitorForm}><X size={18} /></button><div className="modal-icon"><UsersRound size={21} /></div><div className="eyebrow">رقیب جدید</div><h2>یک رقیب یا جایگزین اضافه کن</h2><p>نام و نوع رقیب را وارد کن؛ سپس برای ثبت دقیق، روی نقشه نقطه آن را انتخاب کن.</p><label className="modal-label">نام رقیب<input value={newCompetitor.name} onChange={e => setNewCompetitor({ ...newCompetitor, name: e.target.value })} placeholder="مثال: کافه رستوران هفت" /></label><label className="modal-label">نوع رقابت<select value={newCompetitor.kind} onChange={e => setNewCompetitor({ ...newCompetitor, kind: e.target.value as Competitor["kind"] })}><option>مستقیم</option><option>غیرمستقیم</option></select></label><label className="modal-label">آدرس یا توضیح<input value={newCompetitor.address} onChange={e => setNewCompetitor({ ...newCompetitor, address: e.target.value })} placeholder="آدرس، لینک یا روش فعلی مشتری" /></label><button type="button" className={`map-pick-button ${pickingPoint ? "active" : ""}`} onClick={togglePointPickingFromForm}><MapPin size={15} /> {pickingPoint ? "حالا روی نقشه کلیک کن" : newCompetitor.position ? "نقطه انتخاب شد؛ تغییر نقطه" : "انتخاب نقطه روی نقشه"}</button>{newCompetitor.position && <small className="selected-coordinates">مختصات ثبت شد: {newCompetitor.position.lat.toFixed(5)}، {newCompetitor.position.lng.toFixed(5)}</small>}<div className="modal-actions"><button className="ghost-button" onClick={closeCompetitorForm}>انصراف</button><button className="primary-button" onClick={addCompetitor}>افزودن رقیب <ArrowLeft size={16} /></button></div></div></div>}
    </section>
  );
}
