type MoradosSectionArtProps = {
  variant: "conversation" | "memories" | "plans" | "games" | "house";
};

const artLabels: Record<MoradosSectionArtProps["variant"], string> = {
  conversation: "Duas cartas e um coração",
  memories: "Álbum de lembranças com fotografia e sol",
  plans: "Calendário com dia marcado",
  games: "Dados e peças de jogo",
  house: "Casa com jardim",
};

export function MoradosSectionArt({ variant }: MoradosSectionArtProps) {
  return (
    <span className={`module-art module-art--${variant}`} aria-hidden="true">
      <svg viewBox="0 0 120 82" role="img" aria-label={artLabels[variant]} xmlns="http://www.w3.org/2000/svg">
        {variant === "conversation" && (
          <>
            <path d="M12 18Q12 11 20 11h43q8 0 8 8v25q0 8-8 8H40L24 64v-12h-4q-8 0-8-8Z" fill="#0F4C5C"/>
            <path d="M53 25q0-8 8-8h39q8 0 8 8v21q0 8-8 8h-5v11L81 53H61q-8 0-8-8Z" fill="#C8402A"/>
            <path d="M43 29h14M43 37h20" stroke="#FFF9EF" strokeWidth="3" strokeLinecap="round"/>
            <path d="M79 30c-5-6-14 1-6 8l7 7 7-7c8-7-1-14-8-8Z" fill="#D4A017"/>
          </>
        )}
        {variant === "memories" && (
          <>
            <rect x="18" y="13" width="72" height="55" rx="5" fill="#6B3A6E"/>
            <rect x="25" y="20" width="58" height="41" rx="2" fill="#FFF9EF"/>
            <circle cx="67" cy="31" r="7" fill="#D4A017"/>
            <path d="M29 56 45 39l12 12 8-8 15 13Z" fill="#0F4C5C"/>
            <path d="m91 18 4-8 4 8 8 4-8 4-4 8-4-8-8-4Z" fill="#C8402A"/>
          </>
        )}
        {variant === "plans" && (
          <>
            <rect x="20" y="10" width="64" height="62" rx="6" fill="#FFF9EF" stroke="#0F4C5C" strokeWidth="3"/>
            <path d="M20 27h64" stroke="#C8402A" strokeWidth="9"/>
            <path d="M35 7v10M69 7v10" stroke="#0F4C5C" strokeWidth="5" strokeLinecap="round"/>
            <g fill="#D9C9AF">
              <rect x="30" y="37" width="9" height="8" rx="2"/><rect x="46" y="37" width="9" height="8" rx="2"/>
              <rect x="62" y="37" width="9" height="8" rx="2"/><rect x="30" y="53" width="9" height="8" rx="2"/>
            </g>
            <rect x="46" y="51" width="13" height="12" rx="3" fill="#556B2F"/>
            <path d="m48 56 3 3 6-7" fill="none" stroke="#FFF9EF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="m91 48 5 9 10 2-7 7 2 10-10-5-9 5 2-10-8-7 11-2Z" fill="#D4A017"/>
          </>
        )}
        {variant === "games" && (
          <>
            <g transform="rotate(-12 40 41)">
              <rect x="12" y="17" width="51" height="51" rx="9" fill="#C8402A"/>
              <g fill="#FFF9EF"><circle cx="27" cy="32" r="4"/><circle cx="48" cy="32" r="4"/><circle cx="37" cy="43" r="4"/><circle cx="27" cy="54" r="4"/><circle cx="48" cy="54" r="4"/></g>
            </g>
            <g transform="rotate(10 87 39)">
              <rect x="69" y="12" width="37" height="37" rx="7" fill="#0F4C5C"/>
              <circle cx="80" cy="23" r="3.2" fill="#FFF9EF"/><circle cx="95" cy="38" r="3.2" fill="#FFF9EF"/>
            </g>
            <path d="M79 59c-7-8-18 2-8 12l8 7 8-7c10-10-1-20-8-12Z" fill="#D4A017"/>
          </>
        )}
        {variant === "house" && (
          <>
            <path d="M10 38 55 8l45 30v35H10Z" fill="#0F4C5C"/>
            <path d="M8 38 55 5l47 33" fill="none" stroke="#C8402A" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="45" y="45" width="20" height="28" rx="2" fill="#D4A017"/>
            <rect x="21" y="44" width="15" height="15" rx="2" fill="#FFF9EF"/>
            <rect x="74" y="44" width="15" height="15" rx="2" fill="#FFF9EF"/>
            <path d="M6 75q14-14 27 0 12-17 26 0 14-16 28 0" fill="none" stroke="#556B2F" strokeWidth="5" strokeLinecap="round"/>
            <circle cx="102" cy="13" r="7" fill="#D4A017"/>
          </>
        )}
      </svg>
    </span>
  );
}
