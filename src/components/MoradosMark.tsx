type MoradosMarkProps = {
  size?: number;
  className?: string;
};

export function MoradosMark({ size = 34, className }: MoradosMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.5 41V22.5C5.5 13.7 12.7 6.5 21.5 6.5S37.5 13.7 37.5 22.5V41"
        fill="none"
        stroke="#555f36"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 41V28.5C17 20.9 23.1 14.8 30.7 14.8S44.4 20.9 44.4 28.5V41"
        fill="none"
        stroke="#a64b24"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M23.7 8.5L26.2 13.1L30.8 15.6L26.2 18.1L23.7 22.7L21.2 18.1L16.6 15.6L21.2 13.1Z" fill="#d88e5b" />
    </svg>
  );
}
