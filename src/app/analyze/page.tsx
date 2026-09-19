"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Turn {
  role: "user" | "assistant";
  content: string;
  state?: string;
}

interface ApiResponse {
  kind: string;
  response?: string;
  message?: string;
  state?: string;
  safety?: { status: string };
}

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        await fetch("/api/session");
        const res = await fetch("/api/chat");
        if (res.ok) {
          const data = (await res.json()) as { turns?: Turn[] };
          if (data.turns && data.turns.length > 0) setTurns(data.turns);
        }
      } catch { /* silent */ }
      setSessionReady(true);
    }
    bootstrap();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setTurns((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as ApiResponse;
      if (data.kind === "CONVERSATION" && data.response) {
        setTurns((prev) => [...prev, { role: "assistant", content: data.response!, state: data.state }]);
      } else if (data.kind === "SAFETY_RESPONSE") {
        setTurns((prev) => [...prev, { role: "assistant", content: data.message ?? "Hệ thống không thể tiếp tục.", state: "SAFETY" }]);
      } else {
        setTurns((prev) => [...prev, { role: "assistant", content: data.message ?? "Đã xảy ra lỗi. Vui lòng thử lại." }]);
      }
    } catch {
      setTurns((prev) => [...prev, { role: "assistant", content: "Mất kết nối. Vui lòng thử lại." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      <header className="flex-none border-b border-stone-200 bg-stone-50/80 backdrop-blur-sm px-4 py-3">
        <p className="text-sm text-stone-500 text-center leading-snug">
          Không phải chẩn đoán hay lời khuyên —{" "}
          <span className="text-stone-700">một không gian để hiểu mình hơn</span>
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto space-y-4">
          {turns.length === 0 && !loading && sessionReady && (
            <div className="pt-16 text-center space-y-3">
              <p className="text-2xl text-stone-800 font-medium leading-snug">Bạn đang nghĩ đến điều gì?</p>
              <p className="text-stone-400 text-sm max-w-xs mx-auto leading-relaxed">
                Kể chuyện, bày tỏ cảm xúc, hoặc đặt câu hỏi về điều bạn đang trải qua.
              </p>
            </div>
          )}

          {turns.map((turn, i) => (
            <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                turn.role === "user"
                  ? "bg-stone-800 text-stone-50 rounded-br-sm"
                  : turn.state === "SAFETY"
                    ? "bg-amber-50 border border-amber-200 text-amber-900 rounded-bl-sm"
                    : "bg-white border border-stone-200 text-stone-800 rounded-bl-sm shadow-sm"
              }`}>
                {turn.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <span className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="flex-none border-t border-stone-200 bg-stone-50/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-xl mx-auto flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || !sessionReady}
            rows={1}
            maxLength={4000}
            placeholder="Nhập điều bạn muốn chia sẻ…"
            className="flex-1 resize-none rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 disabled:opacity-50 transition-colors min-h-[42px] max-h-[160px]"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading || !sessionReady}
            className="flex-none w-10 h-10 rounded-xl bg-stone-800 text-stone-50 flex items-center justify-center disabled:opacity-40 hover:bg-stone-700 active:scale-95 transition-all"
            aria-label="Gửi"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-stone-400 text-xs mt-2">Enter để gửi · Shift+Enter xuống dòng</p>
      </footer>
    </div>
  );
}
