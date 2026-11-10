/**
 * The author's own PNG icons (public/), drawn in the text colour through a CSS mask so they
 * follow every page colour without editing the files.
 */
const icons = { home: "home-icon.png", character: "rpg-icon.png" };

export function PictureIcon({ name, size = 24 }: { name: keyof typeof icons; size?: number }) {
  return (
    <span
      className="picture-icon"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        maskImage: `url(${import.meta.env.BASE_URL}${icons[name]})`,
      }}
    />
  );
}
