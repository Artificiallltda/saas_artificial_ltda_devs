export default function CardsGrid({ children, className = "" }) {
  return (
    <div
      className={[
        "grid",
        "grid-cols-1",
        "md:grid-cols-2",
        "xl:grid-cols-3",
        "2xl:grid-cols-4",
        "gap-4 md:gap-6",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
