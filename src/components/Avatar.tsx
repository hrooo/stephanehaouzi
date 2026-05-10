import { avatarDataUri } from "@/lib/avatar";

const SIZES = {
  xs: "h-7 w-7",
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
} as const;

export function Avatar({
  style,
  seed,
  size = "sm",
  className = "",
  alt,
}: {
  style: string | null | undefined;
  seed: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
  alt?: string;
}) {
  const src = avatarDataUri(style ?? "fun-emoji", seed ?? "anonymous");
  return (
    <img
      src={src}
      alt={alt ?? "Avatar"}
      className={`${SIZES[size]} rounded-full bg-white ring-1 ring-slate-200 ${className}`}
      draggable={false}
    />
  );
}
