# انتشار Demo روی GitHub Pages

این پروژه یک workflow آماده در `.github/workflows/deploy-pages.yml` دارد که نسخه استاتیک رابط React/Vite را پس از هر push به شاخه `main` منتشر می‌کند.

## راه‌اندازی اولیه

1. پروژه را در یک repository در GitHub قرار دهید و کد را به شاخه `main` push کنید.
2. در repository به مسیر **Settings → Pages** بروید.
3. در بخش **Build and deployment**، گزینه **Source** را روی **GitHub Actions** قرار دهید.
4. workflow با نام **Deploy Demo to GitHub Pages** را از بخش **Actions** اجرا یا با push بعدی فعال کنید.
5. پس از موفقیت workflow، آدرس Demo در بخش Pages و در environment مربوط به `github-pages` نمایش داده می‌شود.

## اجرای محلی نسخه Demo

```bash
pnpm install --frozen-lockfile
VITE_BASE_PATH=/business-validation-mvp/ pnpm run build:demo
```

خروجی استاتیک در `dist/public` ایجاد می‌شود. برای تست محلی آن می‌توانید از یک static server استفاده کنید:

```bash
pnpm dlx serve dist/public
```

## نکات مهم

- workflow به‌طور خودکار نام repository را به‌عنوان `VITE_BASE_PATH` تنظیم می‌کند؛ بنابراین برای project pages مسیر assetها درست خواهد بود.
- نسخه Demo فقط رابط کاربری استاتیک است. Prisma، Express، tRPC و دیتابیس در این انتشار اجرا نمی‌شوند.
- متغیرهای Umami اختیاری هستند. برای فعال‌سازی analytics، در workflow یا تنظیمات محیط انتشار این دو مقدار را اضافه کنید:
  - `VITE_ANALYTICS_ENDPOINT`
  - `VITE_ANALYTICS_WEBSITE_ID`
- فایل manifest و آیکون SVG امکان نصب سریع Demo به‌صورت web app در مرورگرهای سازگار را فراهم می‌کنند.
- برای repositoryهایی با custom domain یا user/org pages، مقدار `VITE_BASE_PATH` در workflow باید متناسب با دامنه یا مسیر انتشار تنظیم شود.
