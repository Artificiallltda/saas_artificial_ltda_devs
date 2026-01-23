import { PlusCircle } from "lucide-react";

export function EmptyState({
title,
description,
ctaLabel = "Criar",
onCtaClick,
icon: Icon = PlusCircle,
}) {
return (
    <div
    className="
        relative z-10 flex flex-col items-center justify-center text-center
        py-20 px-6 rounded-2xl
        border border-dashed
        bg-[var(--surface)] border-[var(--border)] text-[var(--text)]
        dark:bg-[var(--surface)] dark:border-[var(--border)]
    "
    >
    <div className="flex items-center justify-center h-14 w-14 rounded-full mb-4 bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
        <Icon size={28} />
    </div>

    <h2 className="text-lg font-semibold text-[var(--text)] dark:text-[var(--text)]">
        {title}
    </h2>

    <p className="mt-2 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] max-w-md">
        {description}
    </p>

    <button
        type="button"
        onClick={(e) => {
        e.stopPropagation();
        onCtaClick?.();
        }}
        className="
        mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium
        text-white bg-blue-600 hover:bg-blue-700
        dark:bg-blue-500 dark:hover:bg-blue-400
        rounded-xl shadow hover:shadow-md
        transition-colors cursor-pointer pointer-events-auto
        "
    >
        <PlusCircle size={16} />
        {ctaLabel}
    </button>
    </div>
);
}