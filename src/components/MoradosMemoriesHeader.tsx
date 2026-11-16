import { memo } from "react";

type MoradosMemoriesHeaderProps = {
  count: number | null;
};

/**
 * Abertura própria de Memórias: um caderno cronológico para registros reais.
 * A ilustração é vetorial, decorativa e não depende de mídia externa.
 */
export const MoradosMemoriesHeader = memo(function MoradosMemoriesHeader({
  count,
}: MoradosMemoriesHeaderProps) {
  const label =
    count === null
      ? "arquivo sendo carregado"
      : count === 1
        ? "lembrança guardada"
        : "lembranças guardadas";

  return (
    <header className="morados-memories-heading" aria-labelledby="morados-memories-title">
      <div className="morados-memories-copy">
        <p className="morados-memories-kicker">
          <span aria-hidden="true" />
          O CADERNO DE VOCÊS
        </p>
        <h1 id="morados-memories-title">Há momentos que merecem ficar.</h1>
        <p className="morados-memories-description">
          Palavras, dias e pequenos detalhes reunidos no tempo de vocês.
        </p>
        <p
          className="morados-memories-count"
          aria-live={count === null ? undefined : "polite"}
        >
          <strong>{count === null ? "—" : count}</strong>
          <span>{label}</span>
        </p>
      </div>

      <div className="morados-memories-art" aria-hidden="true">
        <svg viewBox="0 0 220 164" role="presentation" focusable="false">
          <path
            d="M17 128c10-31 25-72 70-91 31-13 71-7 103 13 12 8 17 21 13 38-8 33-39 53-83 60-41 7-88-1-103-20Z"
            fill="#e9e5d8"
          />
          <path
            d="M110 49c-24-13-58-13-76-3v86c22-10 53-9 76 6V49Z"
            fill="#fffaf0"
            stroke="#71836a"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M110 49c24-13 58-13 76-3v86c-22-10-53-9-76 6V49Z"
            fill="#f4ead8"
            stroke="#71836a"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M110 49v89" fill="none" stroke="#b96d50" strokeWidth="3" strokeLinecap="round" />
          <path d="M48 67c14-5 31-4 45 1M48 81c13-4 28-3 41 2M48 95c12-3 25-2 35 2" fill="none" stroke="#c8bca7" strokeWidth="2" strokeLinecap="round" />
          <path d="M137 66c13-5 27-5 39-1M137 81c13-4 27-3 39 1M137 96c12-3 24-2 35 2" fill="none" stroke="#c8bca7" strokeWidth="2" strokeLinecap="round" />
          <path d="M151 46l14 2-4 28-10-8-10 4 4-25Z" fill="#c47b5b" />
          <path d="M29 43c8-13 20-18 31-16-2 13-12 22-31 16Z" fill="#8b9a72" />
          <path d="M34 42c5-5 11-9 19-12" fill="none" stroke="#526a50" strokeWidth="2" strokeLinecap="round" />
          <path d="M192 113c-4-13 1-24 11-30 7 11 4 22-11 30Z" fill="#d3a56b" />
          <path d="M192 113c-1-8 2-15 8-22" fill="none" stroke="#9a7448" strokeWidth="2" strokeLinecap="round" />
          <circle cx="27" cy="104" r="4" fill="#c69a59" />
          <circle cx="195" cy="39" r="3" fill="#b96d50" />
          <path d="M83 25l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#c69a59" />
        </svg>
      </div>
    </header>
  );
});
