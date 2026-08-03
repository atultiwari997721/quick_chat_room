type AvatarProps = {
  name: string;
  avatar?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: boolean;
};

const sizes = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-20 w-20 text-2xl",
};

const ringSizes = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

export function Avatar({ name, avatar, size = "md", ring }: AvatarProps) {
  const inner = `flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 ${ring ? ringSizes[size] : sizes[size]}`;

  const content = avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar}
      alt={name}
      className={`${inner} rounded-full object-cover`}
    />
  ) : (
    <div className={inner}>{name.charAt(0).toUpperCase()}</div>
  );

  if (!ring) return content;

  return (
    <div className="shrink-0 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 p-[2.5px]">
      <div className="rounded-full bg-white p-[2px] dark:bg-zinc-900">
        {content}
      </div>
    </div>
  );
}