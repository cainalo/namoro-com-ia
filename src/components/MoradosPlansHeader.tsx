import { memo } from "react";

type MoradosPlansHeaderProps = {
  eventCount: number | null;
  monthLabel: string;
};

/**
 * Abertura própria de Planos: uma agenda legível, com datas como pontos de encontro.
 * A ilustração é vetorial, decorativa e usa os mesmos tokens cromáticos da marca.
 */
export const MoradosPlansHeader = memo(function MoradosPlansHeader({
  eventCount,
  monthLabel,
}: MoradosPlansHeaderProps) {
  const countLabel =
    eventCount === null
      ? "contagem em atualização"
      : (eventCount === 1 ? "compromisso" : "compromissos") + " em " + monthLabel;

  return (
    <header className="morados-plans-heading" aria-labelledby="morados-plans-title">
      <div className="morados-plans-copy">
        <p className="morados-plans-kicker">
          <span aria-hidden="true" />
          A AGENDA
        </p>
        <h1 id="morados-plans-title">Planos</h1>
        <p className="morados-plans-description">
          Datas, compromissos e encontros organizados no calendário de vocês.
        </p>
        <p
          className="morados-plans-count"
          aria-live={eventCount === null ? undefined : "polite"}
          aria-atomic="true"
        >
          <strong>{eventCount === null ? "—" : eventCount}</strong>
          <span>{countLabel}</span>
        </p>
      </div>

      <div className="morados-plans-art" aria-hidden="true">
        <svg viewBox="0 0 220 166" role="presentation" focusable="false">
          <path
            d="M20 113c-4-35 17-76 55-89 40-14 103 2 122 36 18 33-3 78-38 91-40 15-133 8-139-38Z"
            fill="var(--morados-feed-paper)"
          />
          <rect
            x="39"
            y="29"
            width="142"
            height="117"
            rx="8"
            fill="var(--morados-feed-surface-raised)"
            stroke="var(--morados-feed-forest)"
            strokeWidth="2.5"
          />
          <path
            d="M39 58h142"
            stroke="var(--morados-feed-rule)"
            strokeWidth="2"
          />
          <path
            d="M72 21v19M148 21v19"
            stroke="var(--morados-feed-clay)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M57 76h12m14 0h12m14 0h12m14 0h12m14 0h12M57 98h12m14 0h12m14 0h12m14 0h12m14 0h12M57 120h12m14 0h12m14 0h12m14 0h12"
            stroke="var(--morados-feed-rule)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect
            x="101"
            y="86"
            width="22"
            height="22"
            rx="5"
            fill="var(--morados-feed-clay)"
          />
          <path
            d="M111 91v12m-5-5 5 5 5-5"
            fill="none"
            stroke="var(--morados-feed-surface-raised)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M181 116c12-2 20 3 23 13-12 6-22 2-23-13Z"
            fill="var(--morados-feed-ochre)"
          />
          <path
            d="M181 116c7 3 12 7 16 13"
            fill="none"
            stroke="var(--morados-feed-forest)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M25 54c7-11 17-15 27-12-2 12-12 18-27 12Z"
            fill="var(--morados-feed-forest)"
          />
          <path
            d="M28 54c5-4 11-8 17-10"
            fill="none"
            stroke="var(--morados-feed-surface-raised)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="194" cy="45" r="4" fill="var(--morados-feed-clay)" />
          <circle cx="27" cy="129" r="3" fill="var(--morados-feed-ochre)" />
        </svg>
      </div>
    </header>
  );
});
