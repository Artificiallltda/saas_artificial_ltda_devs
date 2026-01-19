import { PlusCircle } from "lucide-react";

export function EmptyState({
  title,
  description,
  ctaLabel = "Criar",
  onCtaClick,
  icon: Icon = PlusCircle,
}) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center py-20 px-6 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
      <div className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-100 text-blue-600 mb-4">
        <Icon size={28} />
      </div>

      <h2 className="text-lg font-semibold text-gray-900">
        {title}
      </h2>

      <p className="mt-2 text-sm text-gray-600 max-w-md">
        {description}
      </p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCtaClick?.();
        }}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl shadow hover:bg-blue-700 transition-colors cursor-pointer pointer-events-auto"
      >
        <PlusCircle size={16} />
        {ctaLabel}
      </button>
    </div>
  );
}