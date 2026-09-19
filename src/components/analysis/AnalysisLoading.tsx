export function AnalysisLoading() {
  return (
    <div
      className="flex flex-col items-center gap-4 py-16 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-pulse rounded-full bg-stone-300" />
      <p className="text-lg font-medium text-stone-800">
        Đang đọc câu chuyện của bạn…
      </p>
      <p className="max-w-sm text-sm text-stone-500">
        Hệ thống đang phân tách các lớp trải nghiệm dựa trên nội dung bạn chia
        sẻ.
      </p>
    </div>
  );
}
