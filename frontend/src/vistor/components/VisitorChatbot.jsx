import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { api } from "../../shared/api/client";

const WELCOME_MESSAGE = {
  answer: "Hello! I can share general heart-health information from trusted medical sources. How can I help?",
  role: "assistant",
};

export default function VisitorChatbot({ onClose, initialQuery = "" }) {
  const [question, setQuestion] = useState(initialQuery);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (event) => {
    event.preventDefault();
    const text = question.trim();

    if (!text || busy) return;

    setMessages((current) => [...current, { answer: text, role: "user" }]);
    setQuestion("");
    setError("");
    setBusy(true);

    try {
      const reply = await api.ask(text);
      setMessages((current) => [...current, { ...reply, role: "assistant" }]);
    } catch (requestError) {
      setError(requestError.message || "Unable to get a response right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visitor-chat-title"
    >
      <section className="flex h-[min(42rem,calc(100dvh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-teal-100 bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-gradient-to-r from-[#81e6d9] to-[#38b2ac] p-4 text-white">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" aria-hidden="true" />
            <h2 id="visitor-chat-title" className="text-sm font-bold">CardioAI Assistant</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 transition-colors hover:bg-black/10 hover:text-white"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f8fcfe] p-4 text-sm" aria-live="polite">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                message.role === "user"
                  ? "ml-auto bg-teal-500 text-white"
                  : message.redirected
                    ? "border border-amber-200 bg-amber-50 text-amber-950"
                    : "border border-teal-100 bg-teal-50 text-teal-900"
              }`}
            >
              <p className="m-0">{message.answer}</p>
              {message.role === "assistant" && message.sources?.length > 0 && (
                <p className="mt-2 mb-0 text-xs text-teal-800">
                  Sources: {message.sources.map((url, sourceIndex) => (
                    <span key={url}>
                      {sourceIndex > 0 && ", "}
                      <a className="underline" href={url} target="_blank" rel="noreferrer">
                        {hostOf(url)}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>
          ))}
          {busy && <div className="max-w-[85%] rounded-2xl border border-teal-100 bg-teal-50 p-3 text-teal-900">Looking that up…</div>}
        </div>

        <form onSubmit={send} className="border-t border-teal-50 bg-white p-3">
          {error && <p className="mb-2 text-xs text-red-700" role="alert">{error}</p>}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Type your message..."
              className="min-w-0 flex-1 rounded-full border border-teal-100 bg-teal-50/40 px-4 py-2 text-sm text-teal-900 placeholder:text-teal-800/40 focus:border-teal-400 focus:outline-none"
              aria-label="Your question"
              disabled={busy}
            />
            <button
              type="submit"
              className="rounded-full bg-[#38b2ac] p-2 text-white transition-colors hover:bg-[#319795] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy || !question.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}