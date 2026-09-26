type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  end: () => void;
};

type AnalyzeBody = {
  project?: Record<string, unknown>;
  answers?: Record<string, unknown>;
};

const MAX_TEXT_LENGTH = 1200;
const MAX_ANSWERS = 30;

export default async function handler(req: RequestLike, res: ResponseLike) {
  const origin = process.env.FRONTEND_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "AI backend is not configured." });
    return;
  }

  const body = isRecord(req.body) ? req.body as AnalyzeBody : null;
  const project = sanitizeRecord(body?.project);
  const answers = sanitizeRecord(body?.answers);
  if (!project || !answers) {
    res.status(400).json({ error: "Project and answers are required." });
    return;
  }

  const baseUrl = (process.env.AI_API_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const userPayload = JSON.stringify({ project, answers }, null, 2);
  const systemPrompt = [
    "تو دستیار متخصص اعتبارسنجی ایده کسب‌وکار هستی.",
    "پاسخ را به فارسی و در قالب Markdown کوتاه و کاربردی بنویس.",
    "فقط بر اساس اطلاعات ورودی تحلیل کن و چیزی را به‌عنوان واقعیت قطعی جعل نکن.",
    "خروجی باید شامل این بخش‌ها باشد: خلاصه، سه ریسک اصلی، شواهد موجود، یک آزمایش پیشنهادی کم‌هزینه، و سؤال‌های بعدی.",
    "اطلاعات شخصی یا محرمانه را بازتولید نکن.",
  ].join("\n");

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `داده‌های اعتبارسنجی:\n${userPayload}` },
        ],
      }),
    });

    const response = await upstream.json().catch(() => null) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    } | null;

    if (!upstream.ok) {
      console.error("[AI] Upstream error", upstream.status, response?.error?.message || "unknown");
      res.status(502).json({ error: "سرویس هوش مصنوعی در دسترس نیست." });
      return;
    }

    const analysis = response?.choices?.[0]?.message?.content?.trim();
    if (!analysis) {
      res.status(502).json({ error: "پاسخ هوش مصنوعی خالی است." });
      return;
    }

    res.status(200).json({ analysis, model });
  } catch (error) {
    console.error("[AI] Request failed", error);
    res.status(502).json({ error: "ارتباط با سرویس هوش مصنوعی برقرار نشد." });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeRecord(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;

  const entries = Object.entries(value).slice(0, MAX_ANSWERS);
  return Object.fromEntries(
    entries
      .filter(([, item]) => typeof item === "string")
      .map(([key, item]) => [key.slice(0, 100), String(item).slice(0, MAX_TEXT_LENGTH)]),
  );
}
