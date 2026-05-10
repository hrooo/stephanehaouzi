export function ZlatanQuote({
  comment,
  points,
}: {
  comment: string;
  points: number;
}) {
  const tone =
    points >= 4
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : points >= 1
        ? "border-amber-300 bg-amber-50 text-amber-900"
        : "border-slate-300 bg-slate-50 text-slate-700";
  return (
    <div className={`flex items-start gap-3 rounded-xl border-l-4 px-3 py-2 text-sm ${tone}`}>
      <span className="text-xl leading-none" aria-hidden>
        🗣️
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
          Zlatan&nbsp;:
        </p>
        <p className="italic">{comment}</p>
      </div>
    </div>
  );
}
