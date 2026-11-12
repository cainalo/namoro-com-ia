type MoradosMarkProps = {
  size?: number;
  className?: string;
};

/**
 * Símbolo autoral do Morados: duas linhas que partem de lados distintos
 * e se encontram no centro, formando um M contínuo — duas vidas, um espaço.
 */
export function MoradosMark({ size = 34, className }: MoradosMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 56"
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 47V17.5C8 8.6 18.7 4.8 24.2 11.6L32 22.2"
        fill="none"
        stroke="#555f36"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M56 47V17.5C56 8.6 45.3 4.8 39.8 11.6L32 22.2"
        fill="none"
        stroke="#a64b24"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 22.2V46"
        fill="none"
        stroke="#d88e5b"
        strokeWidth="5.2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="7.2" r="3.2" fill="#8a8848" />
    </svg>
  );
}
