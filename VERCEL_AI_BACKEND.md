# Backend امن تحلیل هوش مصنوعی با Vercel

این پروژه endpoint زیر را ارائه می‌کند:

```text
POST /api/analyze
```

تابع در `api/analyze.ts` قرار دارد و کلید سرویس هوش مصنوعی را فقط از Environment Variables سمت Vercel می‌خواند.

## استقرار Backend

1. در Vercel یک پروژه جدید از همین repository بسازید یا repository را به پروژه موجود متصل کنید.
2. Framework را روی **Other** یا **Vite** بگذارید؛ نیازی به اجرای frontend در Vercel نیست.
3. در **Project Settings → Environment Variables** این متغیرها را فقط برای محیط Production و Preview اضافه کنید:

```text
AI_API_KEY=کلید واقعی سرویس هوش مصنوعی
AI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
FRONTEND_ORIGIN=https://aikurdestan-design.github.io
```

4. Deploy را انجام دهید و endpoint زیر را تست کنید:

```text
https://YOUR-PROJECT.vercel.app/api/analyze
```

5. برای build فرانت‌اند GitHub Pages، متغیر عمومی زیر را در workflow یا build environment تنظیم کنید:

```text
VITE_AI_API_URL=https://YOUR-PROJECT.vercel.app/api/analyze
```

`VITE_` به معنی عمومی‌بودن مقدار است؛ این متغیر فقط URL endpoint است و نباید حاوی کلید باشد.

## اتصال کلید به GitHub بدون افشا

کلید را در هیچ‌کدام از این موارد قرار ندهید:

- repository یا فایل `.env` commit‌شده
- `VITE_AI_API_KEY`
- کد React یا فایل‌های `client/`
- workflow به‌صورت متن ساده
- URL درخواست یا query string

کلید باید فقط در Vercel Project Settings → Environment Variables ذخیره شود. چون Function سمت سرور اجرا می‌شود، کد frontend هرگز کلید را دریافت نمی‌کند.

اگر به‌جای تنظیم دستی، از GitHub Actions برای deploy Backend استفاده کردید، کلید را در **GitHub Settings → Secrets and variables → Actions** به‌عنوان Secret ذخیره کنید و فقط با `${{ secrets.AI_API_KEY }}` به فرآیند deploy بدهید؛ مقدار را در log چاپ نکنید.

## رفتار دکمه تحلیل

دکمه «تحلیل با هوش مصنوعی» در صفحه گزارش، پروژه و پاسخ‌ها را به endpoint ارسال می‌کند. نتیجه فقط در همان صفحه نمایش داده می‌شود و در LocalStorage ذخیره نمی‌شود.

قبل از ارسال داده، کاربر باید آگاه باشد که اطلاعات برای تحلیل به Backend ارسال می‌شود. اطلاعات بسیار حساس، رمز عبور، کلیدها و داده‌های شناسایی‌کننده را در فرم Demo وارد نکنید.

## نکات عملی امنیتی

- برای Production مقدار `FRONTEND_ORIGIN` را دقیقاً روی دامنه frontend قرار دهید، نه `*`.
- روی endpoint احراز هویت یا rate limit اضافه کنید؛ کد فعلی محدودیت طول payload دارد اما rate limit دائمی ندارد.
- برای استفاده عمومی، یک سرویس rate limit مانند Upstash یا Vercel KV و سقف مصرف روزانه اضافه کنید.
- خطای upstream عمداً جزئیات کلید یا پیام داخلی سرویس را به مرورگر برنمی‌گرداند.
- کلید را دوره‌ای rotate کنید و در صورت افشا فوراً revoke کنید.
