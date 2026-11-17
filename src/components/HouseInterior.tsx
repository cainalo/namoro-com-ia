import { ArrowLeft, Moon, Sun, Sunset } from "lucide-react";
import { useState } from "react";

type HouseLighting = "day" | "dusk" | "night";
type HallFeatureId = "fireplace" | "stained-glass" | "tapestry" | "staircase";

const hallFeatures: Array<{
  id: HallFeatureId;
  title: string;
  description: string;
  left: string;
  top: string;
}> = [
  {
    id: "fireplace",
    title: "Lareira",
    description: "O fogo mantém o salão acolhedor. É o lugar de sentar, conversar e descansar nos dias frios.",
    left: "36%",
    top: "58%",
  },
  {
    id: "stained-glass",
    title: "Vitral",
    description: "A luz atravessa as peças coloridas e projeta tons de rubi, ouro e azul sobre a pedra.",
    left: "50%",
    top: "44%",
  },
  {
    id: "tapestry",
    title: "Tapeçaria",
    description: "Tecida com fios profundos e detalhes dourados, ela guarda a identidade e a história da residência.",
    left: "65%",
    top: "38%",
  },
  {
    id: "staircase",
    title: "Escadaria",
    description: "A escada de madeira conduz aos pavimentos superiores. Outros ambientes da casa serão explorados em etapas futuras.",
    left: "79%",
    top: "48%",
  },
];

export function HouseInterior({
  lighting,
  onReturn,
  onLightingChange,
}: {
  lighting: HouseLighting;
  onReturn: () => void;
  onLightingChange: (lighting: HouseLighting) => void;
}) {
  const [selectedFeature, setSelectedFeature] = useState<HallFeatureId>("fireplace");
  const currentFeature =
    hallFeatures.find((feature) => feature.id === selectedFeature) ?? hallFeatures[0];

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
              <stop offset="0" stopColor="#c4b49a" />
              <stop offset="1" stopColor="#9b8a70" />
            </linearGradient>
            <linearGradient id="hall-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c0a783" />
              <stop offset="1" stopColor="#8b775b" />
            </linearGradient>
            <linearGradient id="hall-fire" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#b65b3d" />
              <stop offset="0.6" stopColor="#d98a42" />
              <stop offset="1" stopColor="#f5d49a" />
            </linearGradient>
          </defs>

          <rect width="900" height="520" fill="#e1d6c2" />
          <polygon points="105,36 795,36 795,354 105,354" fill="url(#hall-back-wall)" stroke="#776d5a" strokeWidth="8" />
          <polygon points="0,0 105,36 105,354 0,520" fill="#c2b39a" />
          <polygon points="900,0 795,36 795,354 900,520" fill="#b2a188" />
          <path d="M0 0 L105 36 M900 0 L795 36" stroke="#9d886b" strokeWidth="9" />
          <path d="M105 36 L795 36 M105 354 L795 354" stroke="#a99373" strokeWidth="5" />

          <g stroke="#b19f82" strokeWidth="3" opacity="0.52">
            <path d="M105 92 H795 M105 150 H795 M105 210 H795 M105 270 H795 M105 330 H795" />
            <path d="M220 36 V354 M330 36 V354 M440 36 V354 M550 36 V354 M660 36 V354 M770 36 V354" />
            <path d="M0 130 L105 170 M0 260 L105 290 M900 130 L795 170 M900 260 L795 290" />
          </g>

          <path d="M355 354 V235 C355 113 545 113 545 235 V354" fill="#7f7462" stroke="#a58d68" strokeWidth="13" />
          <path d="M378 354 V240 C378 147 522 147 522 240 V354" fill="#45665d" stroke="#a58f6c" strokeWidth="5" />
          <path d="M450 155 V354 M378 250 H522" stroke="#d6b77c" strokeWidth="5" />
          <path d="M385 345 L450 175 L515 345" fill="none" stroke="#d6b77c" strokeWidth="3" />
          <path d="M450 175 L450 345 M385 250 L515 250" stroke="#d6b77c" strokeWidth="2" />
          <path d="M393 333 L450 273 L507 333" fill="none" stroke="#b96d50" strokeWidth="9" opacity="0.8" />
          <circle cx="450" cy="245" r="19" fill="#c69a59" opacity="0.85" />

          <g>
            <path d="M145 145 H276 V319 H145 Z" fill="#6f5a43" stroke="#c69a59" strokeWidth="8" />
            <path d="M164 298 V208 Q210 132 256 208 V298 Z" fill="#786e5d" stroke="#d6c29c" strokeWidth="5" />
            <path d="M170 285 L210 170 L250 285 Z" fill="#b96d50" />
            <path d="M210 170 V285 M176 240 H244" stroke="#d0ad69" strokeWidth="4" />
            <path d="M153 319 H269" stroke="#e2d2ae" strokeWidth="11" />
            <path d="M168 326 L177 342 M252 326 L243 342" stroke="#6b5946" strokeWidth="8" />
            <path d="M177 205 Q210 168 243 205" fill="none" stroke="#c69a59" strokeWidth="4" />
          </g>

          <g>
            <path d="M635 354 L635 215 Q715 104 795 215 V354 Z" fill="#75634e" stroke="#b09c7b" strokeWidth="9" />
            <path d="M656 350 V222 Q715 149 774 222 V350" fill="#80694f" stroke="#8b6747" strokeWidth="7" />
            <path d="M657 280 L774 280 M676 350 L676 228 M754 350 L754 228" stroke="#b68857" strokeWidth="7" />
            <path d="M664 348 L760 230" stroke="#c19a68" strokeWidth="4" />
            <path d="M654 351 H782" stroke="#d6c29c" strokeWidth="10" />
          </g>

          <g>
            <path d="M285 350 H365 V252 H285 Z" fill="#695441" stroke="#c6a575" strokeWidth="7" />
            <path d="M299 338 V285 Q325 235 351 285 V338 Z" fill="#594a39" stroke="#97744e" strokeWidth="5" />
            <path className="house-hall-flame" d="M306 334 Q312 300 325 316 Q340 285 346 334 Z" fill="url(#hall-fire)" />
            <path d="M304 351 H347" stroke="#c9ad84" strokeWidth="7" />
            <path d="M277 246 H373" stroke="#e5d6b4" strokeWidth="9" />
            <path d="M287 354 L287 370 M362 354 L362 370" stroke="#715a44" strokeWidth="8" />
            <circle cx="325" cy="286" r="35" fill="#e39a4b" opacity="0.13" />
          </g>

          <g>
            <path d="M555 120 L610 148 L610 275 L555 247 Z" fill="#8e4d42" stroke="#bf965f" strokeWidth="4" />
            <path d="M568 142 L598 157 V241 L568 226 Z" fill="#a75d50" stroke="#d0ad77" strokeWidth="2" />
            <path d="M582 152 V232 M568 184 H598" stroke="#e0c48c" strokeWidth="2" />
            <path d="M553 111 H614" stroke="#e0c48c" strokeWidth="6" />
            <path d="M553 254 L614 281" stroke="#e0c48c" strokeWidth="6" />
          </g>

          <g stroke="#72553e" strokeWidth="6" fill="none">
            <path d="M700 351 V130 M685 351 V172 M715 351 V150" />
            <path d="M685 180 L715 180 M685 210 L715 210 M685 240 L715 240 M685 270 L715 270 M685 300 L715 300" />
          </g>
          <path d="M660 350 L790 350" stroke="#c8a576" strokeWidth="8" />

          <polygon points="0,520 105,354 795,354 900,520" fill="url(#hall-floor)" stroke="#8c7961" strokeWidth="7" />
          <g stroke="#d0bd99" strokeWidth="2" opacity="0.34">
            <path d="M105 354 L0 520 M220 354 L170 520 M335 354 L340 520 M450 354 V520 M565 354 L560 520 M680 354 L730 520 M795 354 L900 520" />
            <path d="M75 430 H825 M38 475 H862" />
          </g>

          <polygon points="450,365 635,450 450,520 265,450" fill="#b96d50" stroke="#c69a59" strokeWidth="5" />
          <polygon points="450,385 590,450 450,505 310,450" fill="#9d5548" stroke="#c69a59" strokeWidth="3" />
          <path d="M450 390 L490 450 L450 498 L410 450 Z" fill="none" stroke="#dfbe7f" strokeWidth="4" />
          <path d="M450 407 L472 450 L450 484 L428 450 Z" fill="#d7b878" opacity="0.62" />

          <g>
            <path d="M430 342 V292 M470 342 V292" stroke="#554536" strokeWidth="7" />
            <path d="M400 296 H500 M415 282 H485" stroke="#c6a575" strokeWidth="6" />
            <path d="M450 282 V245 M430 252 L450 235 L470 252" fill="none" stroke="#d8b778" strokeWidth="5" />
            <path d="M420 296 Q430 267 440 296 M460 296 Q470 267 480 296" fill="#f4d28b" opacity="0.75" />
          </g>

          <g fill="#e1c27b">
            <circle cx="210" cy="126" r="5" />
            <circle cx="710" cy="126" r="5" />
            <circle cx="450" cy="95" r="5" />
          </g>
          <g stroke="#c6a575" strokeWidth="3" fill="none">
            <path d="M210 126 V96 M195 96 H225" />
            <path d="M710 126 V96 M695 96 H725" />
            <path d="M450 95 V62 M435 62 H465" />
          </g>
          <g fill="#f9dea7">
            <path d="M210 91 Q195 76 210 58 Q225 76 210 91 Z" />
            <path d="M710 91 Q695 76 710 58 Q725 76 710 91 Z" />
            <path d="M450 57 Q435 42 450 24 Q465 42 450 57 Z" />
          </g>
        </svg>
        <div className="house-interior-hotspots" role="group" aria-label="Explorar elementos do salão">
          {hallFeatures.map((feature) => (
            <button
              type="button"
              key={feature.id}
              className={selectedFeature === feature.id ? "is-selected" : ""}
              style={{ left: feature.left, top: feature.top }}
              onClick={() => setSelectedFeature(feature.id)}
              aria-pressed={selectedFeature === feature.id}
              aria-label={`Explorar ${feature.title}`}
              title={feature.title}
            >
              <span />
            </button>
          ))}
        </div>
      </div>
      <div className="house-interior-caption" aria-live="polite">
        <span>✦</span>
        <div>
          <strong>{currentFeature.title}</strong>
          <p>{currentFeature.description}</p>
        </div>
      </div>
      <p className="house-interior-explore-hint">
        Toque nos pontos luminosos para explorar os detalhes do salão.
      </p>
    </section>
  );
}
