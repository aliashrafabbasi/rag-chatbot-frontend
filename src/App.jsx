import { useEffect, useRef, useState } from "react";
import {
  isNotInDocumentAnswer,
  parseErrorDetail,
  readJsonResponse,
} from "./api";
import { API } from "./config";

function uniqueChunks(chunks) {
  if (!Array.isArray(chunks)) return [];
  const seen = new Set();
  return chunks.filter((chunk) => {
    const key = String(chunk).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function UserMessage({ text }) {
  return (
    <div className="animate-message flex gap-3 flex-row-reverse">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-semibold text-white">
        You
      </div>
      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-3 text-[15px] leading-relaxed text-white">
        {text}
      </div>
    </div>
  );
}

function BotMessage({ answer, chunks }) {
  const notInDocument = isNotInDocumentAnswer(answer);

  return (
    <div className="animate-message flex gap-3 w-full">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xs font-semibold text-slate-300">
        AI
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        {notInDocument && chunks.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="font-medium text-amber-200">
              The model could not answer your question from the document.
            </p>
            <p className="mt-1.5 text-amber-100/85 leading-relaxed">
              Related text was still retrieved below. Try a specific question
              such as &quot;Summarize this document&quot;, &quot;What skills are
              listed?&quot;, or &quot;What projects are mentioned?&quot; Avoid
              questions about details that are not in the PDF (e.g. salary).
            </p>
          </div>
        )}

        <section
          className={`rounded-2xl rounded-bl-md border bg-slate-800/90 overflow-hidden ${
            notInDocument
              ? "border-amber-500/30"
              : "border-indigo-500/30"
          }`}
        >
          <div
            className={`border-b border-slate-700/60 px-4 py-2 ${
              notInDocument ? "bg-amber-500/10" : "bg-indigo-500/10"
            }`}
          >
            <h3
              className={`text-xs font-semibold uppercase tracking-wider ${
                notInDocument ? "text-amber-300" : "text-indigo-300"
              }`}
            >
              Answer
            </h3>
          </div>
          <p className="px-4 py-3 text-[15px] leading-relaxed text-slate-100 whitespace-pre-wrap break-words">
            {answer || "No answer was returned."}
          </p>
        </section>

        {chunks.length > 0 && (
          <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
            <div className="border-b border-slate-700/60 px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Retrieved chunks
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {chunks.length} unique passage{chunks.length !== 1 ? "s" : ""}{" "}
                used for this answer
              </p>
            </div>
            <div className="divide-y divide-slate-700/40">
              {chunks.map((chunk, idx) => (
                <details key={idx} className="group" open={idx === 0}>
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-700/30 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-700 text-xs text-indigo-300">
                        {idx + 1}
                      </span>
                      <span className="flex-1 truncate">
                        Chunk {idx + 1}
                        <span className="ml-2 font-normal text-slate-500">
                          ({chunk.length} chars)
                        </span>
                      </span>
                      <svg
                        className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </summary>
                  <div className="border-t border-slate-700/40 bg-slate-900/40 px-4 py-3">
                    <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap break-words">
                      {chunk}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const messagesEndRef = useRef(null);

  const showMessageArea = messages.length > 0 || loading;

  const resetSession = () => {
    setMessages([]);
    setQuestion("");
    setLoading(false);
    setUploading(false);
    setSessionComplete(false);
    setPdfReady(false);
    setUploadStatus(null);
  };

  useEffect(() => {
    if (showMessageArea) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, showMessageArea]);

  const uploadPDF = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    resetSession();
    setUploading(true);
    setUploadStatus({ type: "loading", text: "Uploading and indexing document…" });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(API.uploadPdf, {
        method: "POST",
        body: formData,
      });

      const data = await readJsonResponse(res);

      if (!res.ok) {
        throw new Error(
          parseErrorDetail(data, `Upload failed (HTTP ${res.status})`),
        );
      }

      setPdfReady(true);
      setUploadStatus({
        type: "success",
        text: `"${file.name}" indexed — ask one question below`,
      });
    } catch (err) {
      setPdfReady(false);
      setUploadStatus({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Upload failed. Check the API and try again.",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading || !pdfReady || sessionComplete) return;

    setMessages([{ role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch(API.ask, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await readJsonResponse(res);

      if (!res.ok) {
        throw new Error(parseErrorDetail(data, `Request failed (${res.status})`));
      }

      setMessages((p) => [
        ...p,
        {
          role: "bot",
          answer: data.answer ?? "",
          chunks: uniqueChunks(data.retrieved_chunks),
        },
      ]);
    } catch (err) {
      setMessages((p) => [
        ...p,
        {
          role: "bot",
          answer:
            err instanceof Error
              ? err.message
              : "Something went wrong. Please check that the API is running.",
          chunks: [],
        },
      ]);
    } finally {
      setLoading(false);
      setSessionComplete(true);
      setUploadStatus({
        type: "success",
        text: "Upload a new PDF to start again",
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const canAsk = pdfReady && !sessionComplete && !loading && !uploading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl h-[min(92vh,820px)] flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/70 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
        <header className="shrink-0 px-6 py-5 border-b border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                RAG Chatbot
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Upload a PDF, ask one question, then upload a new document
              </p>
            </div>
          </div>
        </header>

        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-700/40">
          <label
            className={`group flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 transition-colors ${
              uploading
                ? "cursor-wait border-indigo-500/50 bg-indigo-500/10"
                : "cursor-pointer border-slate-600/80 bg-slate-800/30 hover:border-indigo-500/50 hover:bg-indigo-500/5"
            }`}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={uploadPDF}
              disabled={uploading}
              className="sr-only"
            />
            <svg
              className="mb-2 h-8 w-8 text-slate-500 transition-colors group-hover:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-sm font-medium text-slate-300">
              {uploading
                ? "Indexing your PDF on the server…"
                : "Drop a PDF here or click to browse"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              One question per document
            </span>
          </label>

          {uploadStatus && (
            <p
              className={`mt-3 text-center text-sm ${
                uploadStatus.type === "success"
                  ? "text-emerald-400"
                  : uploadStatus.type === "error"
                    ? "text-rose-400"
                    : "text-slate-400"
              }`}
            >
              {uploadStatus.text}
            </p>
          )}
        </div>

        {showMessageArea ? (
          <div className="messages-scroll flex-1 overflow-y-auto px-4 sm:px-6 py-5">
            <div className="flex flex-col gap-5">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <UserMessage key={i} text={m.text} />
                ) : (
                  <BotMessage key={i} answer={m.answer} chunks={m.chunks ?? []} />
                ),
              )}

              {loading && (
                <div className="animate-message flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xs font-semibold text-slate-300">
                    AI
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-700/50 bg-slate-800 px-5 py-4">
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          <div className="flex-1" aria-hidden />
        )}

        <div className="shrink-0 border-t border-slate-700/50 bg-slate-900/60 p-4 sm:p-5">
          <div className="flex gap-2 sm:gap-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !pdfReady
                  ? "Upload a PDF to ask your question…"
                  : sessionComplete
                    ? "Upload a new PDF to ask again…"
                    : "Ask one question about this document…"
              }
              disabled={!canAsk}
              className="flex-1 rounded-xl border border-slate-600/60 bg-slate-800/80 px-4 py-3 text-[15px] text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={ask}
              disabled={!canAsk || !question.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="hidden sm:inline">Send</span>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          {canAsk && (
            <p className="mt-2 text-center text-xs text-slate-500">
              One question per PDF · Press Enter to send
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
