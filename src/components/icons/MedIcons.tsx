interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function UteroIcon({ className, size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 7c-2 0-4 1-5 3-1 2-1 4 0 6s3 4 5 4 4-2 5-4 1-4 0-6c-1-2-3-3-5-3z" />
      <path d="M7 10c-1.5-1-3.5-1.5-5-1.5" />
      <path d="M17 10c1.5-1 3.5-1.5 5-1.5" />
      <path d="M2 8.5c-.5 1-1 2.5-1 4 0 2 1 3.5 2 4.5" />
      <path d="M22 8.5c.5 1 1 2.5 1 4 0 2-1 3.5-2 4.5" />
      <path d="M12 17v5" />
      <path d="M9 22h6" />
    </svg>
  );
}

export function BisturiIcon({ className, size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m14 4 6 6" />
      <path d="m4 14 10-10" />
      <path d="M3 21c1-1 1.5-2 1.5-4L6 14l4 4-3 1.5c-2 0-3 .5-4 1.5Z" />
      <path d="m11 11-4 4" />
    </svg>
  );
}
