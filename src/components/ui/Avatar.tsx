"use client";

import { useEffect, useState } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Avatar({ src, name, size = "md" }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span className={`avatar avatar-${size}`} aria-label={name}>
      {src && !failed ? <img src={src} alt={name} onError={() => setFailed(true)} /> : <span>{initials}</span>}
    </span>
  );
}
