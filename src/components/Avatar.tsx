type AvatarProps = {
  name: string;
  avatar?: string | null;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-xl",
};

export function Avatar({ name, avatar, size = "md" }: AvatarProps) {
  const cls = `flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 ${sizes[size]}`;
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatar} alt={name} className={`${cls} object-cover`} />
    );
  }
  return <div className={cls}>{name.charAt(0).toUpperCase()}</div>;
}
