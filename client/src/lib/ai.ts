export type AIAnalysisInput = {
  project: Record<string, string>;
  answers: Record<string, string>;
};

export async function analyzeValidation(input: AIAnalysisInput): Promise<string> {
  const endpoint = import.meta.env.VITE_AI_API_URL?.trim();
  if (!endpoint) {
    throw new Error("اتصال هوش مصنوعی هنوز تنظیم نشده است. VITE_AI_API_URL را تنظیم کنید.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as { analysis?: string; error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || "تحلیل هوش مصنوعی انجام نشد.");
  }

  if (!payload?.analysis) {
    throw new Error("پاسخ تحلیل هوش مصنوعی خالی است.");
  }

  return payload.analysis;
}
