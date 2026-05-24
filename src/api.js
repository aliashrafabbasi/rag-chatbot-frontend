export function parseErrorDetail(data, fallback = "Request failed") {
  if (!data) return fallback;
  const { detail } = data;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === "object" && d?.msg ? d.msg : String(d)))
      .join(", ");
  }
  return fallback;
}

export async function readJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

/** Backend returns this when the LLM decides the question is not answerable from context. */
export function isNotInDocumentAnswer(answer) {
  return /^not\s+in\s+document\.?$/i.test(String(answer ?? "").trim());
}
