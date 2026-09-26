import { useState } from "react";
import { ArrowLeft, Check, Loader2, Mail, Lock, UserRound } from "lucide-react";
import { signIn, signUp } from "@/lib/supabase";

type Mode = "login" | "signup";

export function Auth({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (fullName.trim().length < 2) {
          throw new Error("نام باید حداقل ۲ کاراکتر باشد.");
        }
        if (password.length < 6) {
          throw new Error("رمز عبور باید حداقل ۶ کاراکتر باشد.");
        }
        await signUp(email, password, fullName);
        setSuccessMessage("ثبت‌نام موفق! لطفاً ایمیل خود را برای تأیید بررسی کنید.");
      } else {
        await signIn(email, password);
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{mode === "login" ? "ورود به حساب" : "ساخت حساب جدید"}</h1>
          <p>
            {mode === "login"
              ? "برای ادامه کار، وارد حساب خود شوید."
              : "با ثبت‌نام، پروژه‌های خود را در همه دستگاه‌ها همگام‌سازی کنید."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <label className="auth-field">
              <span><UserRound size={15} /> نام و نام خانوادگی</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: سارا احمدی"
                required
              />
            </label>
          )}

          <label className="auth-field">
            <span><Mail size={15} /> ایمیل</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              dir="ltr"
            />
          </label>

          <label className="auth-field">
            <span><Lock size={15} /> رمز عبور</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="حداقل ۶ کاراکتر"
              required
              minLength={6}
              dir="ltr"
            />
          </label>

          {error && <div className="auth-error">{error}</div>}
          {successMessage && (
            <div className="auth-success">
              <Check size={16} /> {successMessage}
            </div>
          )}

          <button type="submit" className="primary-button full-width" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : null}
            {loading ? "لطفاً صبر کنید..." : mode === "login" ? "ورود" : "ثبت‌نام"}
            {!loading && <ArrowLeft size={16} />}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              حساب ندارید؟{" "}
              <button type="button" onClick={() => { setMode("signup"); setError(""); setSuccessMessage(""); }}>
                ثبت‌نام کنید
              </button>
            </>
          ) : (
            <>
              قبلاً ثبت‌نام کرده‌اید؟{" "}
              <button type="button" onClick={() => { setMode("login"); setError(""); setSuccessMessage(""); }}>
                وارد شوید
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}