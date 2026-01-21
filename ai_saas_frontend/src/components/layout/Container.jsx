export default function Container({
  children,
  className = "",
  as: Component = "div",
}) {
  return (
    <Component className={`max-w-screen-2xl mx-auto px-4 ${className}`}>
      {children}
    </Component>
  );
}
