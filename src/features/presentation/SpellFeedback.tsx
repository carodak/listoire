export function SpellFeedback({
  ability,
  instant = false,
}: {
  ability?: string;
  instant?: boolean;
}) {
  if (!ability || instant) return null;
  return (
    <span
      className="reader-viewport-feedback spell-learning-effect spell-cast-effect"
      aria-hidden="true"
    />
  );
}
