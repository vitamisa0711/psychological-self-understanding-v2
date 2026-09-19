"use client";

interface Props {
  variant: "safety" | "uncertain";
  message?: string;
  onReset: () => void;
}

export function SafetyPanel({ variant, message, onReset }: Props) {
  const title =
    variant === "safety"
      ? "Ưu tiên an toàn"
      : "Không thể tiếp tục phân tích lúc này";

  const body =
    message ??
    (variant === "safety"
      ? "Nội dung cho thấy có thể đang có nguy cơ an toàn. Hệ thống không tiếp tục phân tích tâm lý thông thường trong tình huống này. Nếu bạn đang gặp khó khăn nghiêm trọng, hãy tìm sự hỗ trợ từ người tin cậy hoặc dịch vụ hỗ trợ phù hợp tại địa phương."
      : "Hiện tại hệ thống không thể xử lý yêu cầu này một cách an toàn. Vui lòng thử lại sau.");

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
      <p className="mt-4 leading-relaxed text-stone-700">{body}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 min-h-11 rounded-full border border-stone-300 px-5 text-sm font-medium text-stone-800 hover:bg-stone-50"
      >
        Quay lại nhập nội dung
      </button>
    </div>
  );
}
