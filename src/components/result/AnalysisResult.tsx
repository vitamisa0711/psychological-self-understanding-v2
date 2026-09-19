"use client";

type Hyp = {
  label?: string;
  formulation?: string;
  fit?: { level?: string; explanation?: string };
  missing_data?: string[];
  alternative_explanations?: string[];
  confidence?: { level?: string };
  concept_id?: string;
};

type Formulation = {
  summary?: string;
  event?: { description?: string };
  interpretation?: Array<{ text?: string }>;
  emotions?: Array<{ label?: string }>;
  automatic_thoughts?: Array<{ text?: string }>;
  behaviors?: Array<{ text?: string }>;
  triggers?: Array<{ text?: string }>;
  needs?: Array<{ label?: string; explanation?: string }>;
  maintaining_loops?: Array<{ steps?: string[]; explanation?: string }>;
  hypotheses?: Hyp[];
  uncertainty?: {
    known?: string[];
    inferred?: string[];
    missing?: string[];
  };
  unresolved_questions?: string[];
  learning_history?: { note?: string };
};

interface Props {
  data: {
    formulation?: Formulation;
    generation?: {
      event?: string;
      interpretation?: string;
      emotions?: string[];
      automaticThoughts?: string[];
      behaviors?: string[];
      triggers?: string[];
      needs?: string[];
      maintainingLoop?: string;
      hypotheses?: Array<{
        label?: string;
        fit?: string;
        missingData?: string[];
        alternatives?: string[];
        confidence?: string;
      }>;
      uncertainty?: string[];
      reflectiveQuestions?: string[];
    };
  };
  onReset: () => void;
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      <div className="mt-3 text-stone-800 leading-relaxed">{children}</div>
    </section>
  );
}

function listOrNull(items?: string[]) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="list-inside list-disc space-y-1">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

export function AnalysisResult({ data, onReset }: Props) {
  const f = data.formulation;
  const g = data.generation;

  if (!f && !g) {
    return (
      <div className="rounded-2xl border p-6">
        <p>Không có dữ liệu kết quả để hiển thị.</p>
        <button type="button" onClick={onReset} className="mt-4 underline">
          Quay lại
        </button>
      </div>
    );
  }

  const event = g?.event ?? f?.event?.description;
  const interpretation =
    g?.interpretation ??
    f?.interpretation?.map((i) => i.text).filter(Boolean).join("; ");
  const emotions =
    g?.emotions ?? f?.emotions?.map((e) => e.label).filter(Boolean) as string[];
  const thoughts =
    g?.automaticThoughts ??
    (f?.automatic_thoughts?.map((t) => t.text).filter(Boolean) as string[]);
  const behaviors =
    g?.behaviors ??
    (f?.behaviors?.map((b) => b.text).filter(Boolean) as string[]);
  const triggers =
    g?.triggers ??
    (f?.triggers?.map((t) => t.text).filter(Boolean) as string[]);
  const needs =
    g?.needs ??
    (f?.needs?.map((n) => n.label).filter(Boolean) as string[]);
  const loop =
    g?.maintainingLoop ??
    f?.maintaining_loops?.[0]?.steps?.join(" → ");
  const questions =
    g?.reflectiveQuestions ?? f?.unresolved_questions ?? [];
  const uncertaintyLines =
    g?.uncertainty ??
    [
      ...(f?.uncertainty?.missing?.map((m) => `Chưa rõ: ${m}`) ?? []),
      ...(f?.uncertainty?.inferred?.map((m) => `Suy luận: ${m}`) ?? []),
    ];

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          Phản chiếu từ câu chuyện của bạn
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Đây là các khả năng diễn giải dựa trên thông tin bạn cung cấp — không
          phải chẩn đoán hay lời khuyên.
        </p>
      </div>

      {f?.summary && (
        <Card title="Tóm tắt">
          <p>{f.summary}</p>
        </Card>
      )}

      <Card title="Điều đã xảy ra">
        <p>{event || "Chưa tách được sự kiện rõ ràng từ mô tả."}</p>
      </Card>

      <Card title="Cách bạn có thể đã diễn giải sự việc">
        <p>{interpretation || "Chưa đủ thông tin về cách diễn giải."}</p>
      </Card>

      <Card title="Cảm xúc">{listOrNull(emotions) || <p>Chưa xác định rõ.</p>}</Card>
      <Card title="Suy nghĩ tự động">{listOrNull(thoughts) || <p>Chưa xác định rõ.</p>}</Card>
      <Card title="Phản ứng">{listOrNull(behaviors) || <p>Chưa xác định rõ.</p>}</Card>
      <Card title="Điều có thể đã được kích hoạt">{listOrNull(triggers) || <p>Chưa xác định rõ.</p>}</Card>
      <Card title="Nhu cầu có thể liên quan">{listOrNull(needs) || <p>Chưa xác định rõ.</p>}</Card>

      {loop && (
        <Card title="Vòng lặp có thể đang duy trì trải nghiệm">
          <p>{loop}</p>
        </Card>
      )}

      <Card title="Mẫu hình tâm lý có thể liên quan">
        {(g?.hypotheses ?? f?.hypotheses)?.length ? (
          <div className="space-y-4">
            {(g?.hypotheses ?? f?.hypotheses)?.map((h, i) => {
              const label = "label" in h ? h.label : undefined;
              const fit =
                typeof (h as Hyp).fit === "object"
                  ? (h as Hyp).fit?.explanation
                  : (h as { fit?: string }).fit;
              const missing =
                (h as Hyp).missing_data ??
                (h as { missingData?: string[] }).missingData;
              const alts =
                (h as Hyp).alternative_explanations ??
                (h as { alternatives?: string[] }).alternatives;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-stone-100 bg-stone-50 p-4"
                >
                  <p className="font-medium text-stone-900">
                    Khả năng {i + 1}
                    {label ? `: ${label}` : ""}
                  </p>
                  {(h as Hyp).formulation && (
                    <p className="mt-2 text-sm text-stone-700">
                      {(h as Hyp).formulation}
                    </p>
                  )}
                  {fit && (
                    <p className="mt-2 text-sm text-stone-600">
                      Mức độ phù hợp: {fit}
                    </p>
                  )}
                  {missing && missing.length > 0 && (
                    <p className="mt-2 text-sm text-stone-600">
                      Điều còn thiếu: {missing.join("; ")}
                    </p>
                  )}
                  {alts && alts.length > 0 && (
                    <p className="mt-2 text-sm text-stone-600">
                      Khả năng khác: {alts.slice(0, 3).join("; ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p>Chưa đủ dữ liệu để đưa ra các giả thuyết có cấu trúc.</p>
        )}
      </Card>

      <Card title="Điều vẫn chưa rõ">
        {listOrNull(uncertaintyLines) || (
          <p>Thông tin hiện tại còn hạn chế.</p>
        )}
      </Card>

      {questions.length > 0 && (
        <Card title="Câu hỏi để tự phản chiếu">
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li key={i} className="italic text-stone-700">
                “{q}”
              </li>
            ))}
          </ul>
        </Card>
      )}

      {f?.learning_history?.note && (
        <Card title="Lịch sử trải nghiệm">
          <p className="text-sm text-stone-600">{f.learning_history.note}</p>
        </Card>
      )}

      <button
        type="button"
        onClick={onReset}
        className="min-h-12 rounded-full border border-stone-300 px-6 text-sm font-medium text-stone-800 hover:bg-white"
      >
        Khám phá một trải nghiệm khác
      </button>
    </div>
  );
}
