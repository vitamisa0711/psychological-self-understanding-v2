"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function AnalysisInput({ value, onChange, onSubmit, disabled = false }: Props) {
  const len = value.length;
  const tooShort = value.trim().length > 0 && value.trim().length < 10;
  const tooLong = len > 4000;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          Chuyện gì đang xảy ra với bạn?
        </h1>
        <p className="mt-2 text-stone-600">
          Hãy kể lại một tình huống bạn muốn hiểu rõ hơn. Không cần họ tên hay
          thông tin định danh.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-800">Bạn có thể kể:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>chuyện gì đã xảy ra</li>
          <li>bạn đã cảm thấy gì</li>
          <li>điều gì khiến bạn phản ứng mạnh</li>
          <li>suy nghĩ xuất hiện lúc đó</li>
        </ul>
      </div>

      <div>
        <label htmlFor="story" className="sr-only">
          Nhập câu chuyện của bạn
        </label>
        <textarea
          id="story"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          maxLength={4000}
          disabled={disabled}
          placeholder="Hãy kể lại một tình huống mà bạn muốn hiểu rõ hơn…"
          className="w-full resize-y rounded-2xl border border-stone-300 bg-white p-4 text-base leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
          aria-describedby="story-hint story-count"
        />
        <div className="mt-2 flex justify-between text-xs text-stone-500">
          <span id="story-hint">
            {tooShort
              ? "Nội dung hơi ngắn — thêm vài chi tiết sẽ hữu ích hơn."
              : tooLong
                ? "Đã vượt giới hạn ký tự."
                : "Không lưu nội dung trên URL trình duyệt."}
          </span>
          <span id="story-count">{len}/4000</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || value.trim().length < 10 || tooLong}
        className="min-h-12 rounded-full bg-stone-900 px-6 text-base font-medium text-white transition enabled:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Gửi để khám phá
      </button>
    </div>
  );
}
