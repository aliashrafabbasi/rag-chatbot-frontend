const DEFAULT_API_URL = "https://aliashrafabbasi-rag-chatbot.hf.space";

export const API_BASE = (
  import.meta.env.VITE_API_URL || DEFAULT_API_URL
).replace(/\/$/, "");

export const API = {
  uploadPdf: `${API_BASE}/upload-pdf`,
  ask: `${API_BASE}/ask`,
};
