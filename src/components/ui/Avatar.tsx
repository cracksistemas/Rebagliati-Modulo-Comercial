interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Avatar({ src, name, size = "md" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className={`avatar avatar-${size}`} aria-label={name}>
      {src ? <img src={src} alt={name} /> : <span>{initials}</span>}
    </span>
  );
}
