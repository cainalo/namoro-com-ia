import { ArrowLeft, Moon, Sun, Sunset } from "lucide-react";

type HouseLighting = "day" | "dusk" | "night";

export function HouseInterior({
  lighting,
  onReturn,
  onLightingChange,
}: {
  lighting: HouseLighting;
  onReturn: () => void;
  onLightingChange: (lighting: HouseLighting) => void;
}) {
  return (
    <section className={`house-interior is-${lighting}`} aria-labelledby="house-interior-title">
      <header className="house-interior-heading">
        <div>
          <p className="date-kicker">Residência · térreo</p>
          <h2 id="house-interior-title">Salão de entrada</h2>
          <p>Pedra antiga, madeira aquecida e a primeira sala da casa.</p>
        </div>
        <div className="house-interior-header-actions">
          <div className="house-interior-lighting" role="group" aria-label="Iluminação do salão">
            <button
              type="button"
              className={lighting === "day" ? "is-selected" : ""}
              onClick={() => onLightingChange("day")}
              aria-pressed={lighting === "day"}
            >
              <Sun aria-hidden="true" />
              <span>Dia</span>
            </button>
            <button
              type="button"
              className={lighting === "dusk" ? "is-selected" : ""}
              onClick={() => onLightingChange("dusk")}
              aria-pressed={lighting === "dusk"}
            >
              <Sunset aria-hidden="true" />
              <span>Entardecer</span>
            </button>
            <button
              type="button"
              className={lighting === "night" ? "is-selected" : ""}
              onClick={() => onLightingChange("night")}
              aria-pressed={lighting === "night"}
            >
              <Moon aria-hidden="true" />
              <span>Noite</span>
            </button>
          </div>
          <button type="button" className="inline-action" onClick={onReturn}>
            <ArrowLeft aria-hidden="true" />
            Voltar ao terreno
          </button>
        </div>
      </header>

      <div className="house-interior-scene">
        <svg
          viewBox="0 0 900 520"
          role="img"
          aria-labelledby="house-hall-title house-hall-description"
          className="house-interior-art"
        >
          <title id="house-hall-title">Salão de entrada medieval</title>
          <desc id="house-hall-description">
            Salão de pedra com arcos góticos, vitral, lareira acesa, tapeçaria,
            escadaria de madeira e um tapete central.
          </desc>

          <defs>
            <linearGradient id="hall-back-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#766b5e" />
              <stop offset="1" stopColor="#4a453e" />
            </linearGradient>
            <linearGradient id="hall-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#88785f" />
              <stop offset="1" stopColor="#3b342d" />
            </linearGradient>
            <linearGradient id="hall-fire" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#8e321c" />
              <stop offset="0.6" stopColor="#e38b35" />
              <stop offset="1" stopColor="#f7d58a" />
            </linearGradient>
          </defs>

          <rect width="900" height="520" fill="#252b2a" />
          <polygon points="105,36 795,36 795,354 105,354" fill="url(#hall-back-wall)" stroke="#292925" strokeWidth="8" />
          <polygon points="0,0 105,36 105,354 0,520" fill="#393a34" />
          <polygon points="900,0 795,36 795,354 900,520" fill="#292f2b" />
          <path d="M0 0 L105 36 M900 0 L795 36" stroke="#ad9672" strokeWidth="9" />
          <path d="M105 36 L795 36 M105 354 L795 354" stroke="#c0a47a" strokeWidth="5" />

          <g stroke="#9d8a6d" strokeWidth="3" opacity="0.52">
            <path d="M105 92 H795 M105 150 H795 M105 210 H795 M105 270 H795 M105 330 H795" />
            <path d="M220 36 V354 M330 36 V354 M440 36 V354 M550 36 V354 M660 36 V354 M770 36 V354" />
            <path d="M0 130 L105 170 M0 260 L105 290 M900 130 L795 170 M900 260 L795 290" />
          </g>

          <path d="M355 354 V235 C355 113 545 113 545 235 V354" fill="#262b29" stroke="#c5ad83" strokeWidth="13" />
          <path d="M378 354 V240 C378 147 522 147 522 240 V354" fill="#182c35" stroke="#6d604c" strokeWidth="5" />
          <path d="M450 155 V354 M378 250 H522" stroke="#d3b778" strokeWidth="5" />
          <path d="M385 345 L450 175 L515 345" fill="none" stroke="#d3b778" strokeWidth="3" />
          <path d="M450 175 L450 345 M385 250 L515 250" stroke="#d3b778" strokeWidth="2" />
          <path d="M393 333 L450 273 L507 333" fill="none" stroke="#a64a4c" strokeWidth="9" opacity="0.8" />
          <circle cx="450" cy="245" r="19" fill="#d6b667" opacity="0.85" />

          <g>
            <path d="M145 145 H276 V319 H145 Z" fill="#302a25" stroke="#b38a52" strokeWidth="8" />
            <path d="M164 298 V208 Q210 132 256 208 V298 Z" fill="#1e2525" stroke="#d0b27d" strokeWidth="5" />
            <path d="M170 285 L210 170 L250 285 Z" fill="#8e3041" />
            <path d="M210 170 V285 M176 240 H244" stroke="#d5b46e" strokeWidth="4" />
            <path d="M153 319 H269" stroke="#d7bf8d" strokeWidth="11" />
            <path d="M168 326 L177 342 M252 326 L243 342" stroke="#40352a" strokeWidth="8" />
            <path d="M177 205 Q210 168 243 205" fill="none" stroke="#c99d5d" strokeWidth="4" />
          </g>

          <g>
            <path d="M635 354 L635 215 Q715 104 795 215 V354 Z" fill="#292723" stroke="#ad9874" strokeWidth="9" />
            <path d="M656 350 V222 Q715 149 774 222 V350" fill="#45382e" stroke="#6d5137" strokeWidth="7" />
            <path d="M657 280 L774 280 M676 350 L676 228 M754 350 L754 228" stroke="#a77a4a" strokeWidth="7" />
            <path d="M664 348 L760 230" stroke="#b18a58" strokeWidth="4" />
            <path d="M654 351 H782" stroke="#d0b27d" strokeWidth="10" />
          </g>

          <g>
            <path d="M285 350 H365 V252 H285 Z" fill="#392c24" stroke="#c1a16a" strokeWidth="7" />
            <path d="M299 338 V285 Q325 235 351 285 V338 Z" fill="#211f1a" stroke="#8e6c49" strokeWidth="5" />
            <path d="M306 334 Q312 300 325 316 Q340 285 346 334 Z" fill="url(#hall-fire)" />
            <path d="M304 351 H347" stroke="#c7a574" strokeWidth="7" />
            <path d="M277 246 H373" stroke="#d2b98a" strokeWidth="9" />
            <path d="M287 354 L287 370 M362 354 L362 370" stroke="#3a3027" strokeWidth="8" />
            <circle cx="325" cy="286" r="35" fill="#ef9b43" opacity="0.13" />
          </g>

          <g>
            <path d="M555 120 L610 148 L610 275 L555 247 Z" fill="#682d3d" stroke="#b68c56" strokeWidth="4" />
            <path d="M568 142 L598 157 V241 L568 226 Z" fill="#7e3c4b" stroke="#d2ad70" strokeWidth="2" />
            <path d="M582 152 V232 M568 184 H598" stroke="#d8b77a" strokeWidth="2" />
            <path d="M553 111 H614" stroke="#d8b77a" strokeWidth="6" />
            <path d="M553 254 L614 281" stroke="#d8b77a" strokeWidth="6" />
          </g>

          <g stroke="#513a28" strokeWidth="6" fill="none">
            <path d="M700 351 V130 M685 351 V172 M715 351 V150" />
            <path d="M685 180 L715 180 M685 210 L715 210 M685 240 L715 240 M685 270 L715 270 M685 300 L715 300" />
          </g>
          <path d="M660 350 L790 350" stroke="#c8a873" strokeWidth="8" />

          <polygon points="0,520 105,354 795,354 900,520" fill="url(#hall-floor)" stroke="#2e2b25" strokeWidth="7" />
          <g stroke="#c0a985" strokeWidth="2" opacity="0.34">
            <path d="M105 354 L0 520 M220 354 L170 520 M335 354 L340 520 M450 354 V520 M565 354 L560 520 M680 354 L730 520 M795 354 L900 520" />
            <path d="M75 430 H825 M38 475 H862" />
          </g>

          <polygon points="450,365 635,450 450,520 265,450" fill="#6d263a" stroke="#c2a06b" strokeWidth="5" />
          <polygon points="450,385 590,450 450,505 310,450" fill="#772a3a" stroke="#b88b50" strokeWidth="3" />
          <path d="M450 390 L490 450 L450 498 L410 450 Z" fill="none" stroke="#d9b66d" strokeWidth="4" />
          <path d="M450 407 L472 450 L450 484 L428 450 Z" fill="#d3ad65" opacity="0.62" />

          <g>
            <path d="M430 342 V292 M470 342 V292" stroke="#33291f" strokeWidth="7" />
            <path d="M400 296 H500 M415 282 H485" stroke="#c6a66c" strokeWidth="6" />
            <path d="M450 282 V245 M430 252 L450 235 L470 252" fill="none" stroke="#d8b778" strokeWidth="5" />
            <path d="M420 296 Q430 267 440 296 M460 296 Q470 267 480 296" fill="#f2c978" opacity="0.75" />
          </g>

          <g fill="#d9b76e">
            <circle cx="210" cy="126" r="5" />
            <circle cx="710" cy="126" r="5" />
            <circle cx="450" cy="95" r="5" />
          </g>
          <g stroke="#c6a66c" strokeWidth="3" fill="none">
            <path d="M210 126 V96 M195 96 H225" />
            <path d="M710 126 V96 M695 96 H725" />
            <path d="M450 95 V62 M435 62 H465" />
          </g>
          <g fill="#f6d18c">
            <path d="M210 91 Q195 76 210 58 Q225 76 210 91 Z" />
            <path d="M710 91 Q695 76 710 58 Q725 76 710 91 Z" />
            <path d="M450 57 Q435 42 450 24 Q465 42 450 57 Z" />
          </g>
        </svg>
        <div className="house-interior-caption">
          <span>01</span>
          <div>
            <strong>Salão de entrada</strong>
            <p>Um lugar para chegar, descansar e começar a explorar a casa.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
