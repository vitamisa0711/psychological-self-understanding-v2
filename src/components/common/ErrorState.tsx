"use client";

interface Props {
  message: string;
  onReset: () => void;
}

export function ErrorState({ message, onReset }: Props) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6" role="alert">
      <h1 className="text-lg font-semibold text-stone-900">Không thể hoàn tất</h1>
      <p className="mt-2 text-stone-700">{message}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 min-h-11 rounded-full bg-stone-900 px-5 text-sm font-medium text-white"
      >
        Thử lại
      </button>
    </div>
  );
}
