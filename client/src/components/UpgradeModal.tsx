import { Check, X, Zap } from "lucide-react";
import { useState } from "react";
import { purchaseGrowthYearly, restoreGrowthYearly } from "@/lib/billing";

type UpgradeModalProps = {
  onClose: () => void;
  onEntitled: () => void;
  onToast: (message: string) => void;
};

export function UpgradeModal({ onClose, onEntitled, onToast }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  const buy = async () => {
    setLoading(true);
    try {
      const result = await purchaseGrowthYearly();
      if (result.entitled) {
        onEntitled();
        onToast("پلن رشد با موفقیت فعال شد");
        onClose();
      } else {
        onToast("خرید تکمیل نشد؛ اطلاعات پرداخت را بررسی کنید");
      }
    } catch {
      onToast("پرداخت بازار در دسترس نیست یا لغو شد");
    } finally {
      setLoading(false);
    }
  };

  const restore = async () => {
    setLoading(true);
    try {
      const result = await restoreGrowthYearly();
      if (result.entitled) {
        onEntitled();
        onToast("خرید قبلی بازیابی شد");
        onClose();
      } else {
        onToast("خرید فعالی برای این حساب پیدا نشد");
      }
    } catch {
      onToast("بازیابی خرید انجام نشد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <div className="experiment-modal upgrade-modal">
        <button className="modal-close" onClick={onClose} aria-label="بستن"><X size={16} /></button>
        <div className="modal-icon"><Zap size={20} /></div>
        <h2 id="upgrade-title">فعال‌سازی پلن رشد</h2>
        <p>برای ساخت پروژه‌های بیشتر و نگهداری چند ایده به‌صورت هم‌زمان، پلن رشد را فعال کنید.</p>
        <div className="upgrade-benefits">
          {["پروژه‌های نامحدود", "آزمایش‌های نامحدود", "گزارش و خروجی کامل", "پشتیبان‌گیری و همگام‌سازی"].map(item => (
            <div key={item}><Check size={15} /> <span>{item}</span></div>
          ))}
        </div>
        <div className="upgrade-product-note">اشتراک سالانه BizSanj از طریق بازار</div>
        <div className="modal-actions">
          <button className="primary-button" onClick={buy} disabled={loading}>{loading ? "در حال اتصال به بازار..." : "ادامه پرداخت"}</button>
          <button className="ghost-button" onClick={restore} disabled={loading}>بازیابی خرید</button>
        </div>
        <small className="upgrade-legal">پرداخت و مدیریت اشتراک از طریق بازار انجام می‌شود.</small>
      </div>
    </div>
  );
}
