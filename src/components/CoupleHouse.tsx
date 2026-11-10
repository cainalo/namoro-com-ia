import { useState } from "react";

const houseLocations = [
  {
    id: "residence",
    label: "Residência",
    detail: "A construção principal da propriedade.",
    left: "45%",
    top: "45%",
  },
  {
    id: "courtyard",
    label: "Pátio",
    detail: "O espaço de pedra que conecta a casa aos jardins.",
    left: "51%",
    top: "72%",
  },
  {
    id: "gardens",
    label: "Jardins",
    detail: "A área verde ao redor da residência.",
    left: "77%",
    top: "55%",
  },
] as const;

type HouseLocationId = (typeof houseLocations)[number]["id"];

export function CoupleHouse() {
  return (
    <section className="house-screen" aria-labelledby="house-title">
      <header className="house-heading">
        <div>
          <p className="date-kicker">O lugar de vocês</p>
          <h1 id="house-title">Casa</h1>
        </div>
        <span className="house-map-coordinate">Terreno inicial</span>
      </header>

      <div className="house-map-shell">
        <svg
          className="house-isometric-map"
          viewBox="0 0 900 500"
          role="img"
          aria-labelledby="house-map-title house-map-description"
        >
          <title id="house-map-title">Terreno da residência em perspectiva isométrica</title>
          <desc id="house-map-description">
            Uma residência medieval de pedra e madeira, cercada por caminhos,
            árvores, jardim e um pequeno pátio.
          </desc>

          <polygon
            points="450,28 852,238 450,448 48,238"
            fill="#244b3c"
            stroke="#d5a43b"
            strokeWidth="2"
          />
          <polygon
            points="450,48 827,238 450,428 73,238"
            fill="#315c48"
            stroke="#78916f"
            strokeWidth="1.5"
          />

          <path
            d="M117 245 L260 317 L370 259 L450 300 L542 253 L715 340"
            fill="none"
            stroke="#b5a27b"
            strokeWidth="27"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M117 245 L260 317 L370 259 L450 300 L542 253 L715 340"
            fill="none"
            stroke="#d2c09a"
            strokeWidth="2"
            strokeDasharray="5 10"
            strokeLinecap="round"
          />
          <path
            d="M450 300 L450 378"
            fill="none"
            stroke="#b5a27b"
            strokeWidth="22"
            strokeLinecap="round"
          />

          <polygon points="450,257 570,318 450,381 330,318" fill="#8c8068" />
          <polygon points="450,268 554,321 450,375 346,321" fill="#c0ad87" />
          <polygon points="450,283 527,322 450,361 373,322" fill="#a18e6d" />

          <polygon points="410,160 530,220 530,328 410,268" fill="#8d806b" stroke="#514b3e" strokeWidth="2" />
          <polygon points="410,268 530,208 530,316 410,376" fill="#6d6657" stroke="#514b3e" strokeWidth="2" />
          <polygon points="290,208 410,268 410,376 290,316" fill="#b7a58a" stroke="#514b3e" strokeWidth="2" />

          <path d="M300 224 L400 274 M300 246 L400 296 M300 268 L400 318" stroke="#8b7a62" strokeWidth="2" opacity="0.65" />
          <path d="M420 282 L520 232 M420 304 L520 254 M420 326 L520 276" stroke="#49483e" strokeWidth="2" opacity="0.55" />

          <polygon points="410,88 548,158 410,228 272,158" fill="#6d263a" stroke="#3b2028" strokeWidth="3" />
          <polygon points="410,88 548,158 410,228" fill="#542436" />
          <path d="M410 88 L410 228" stroke="#d5a43b" strokeWidth="3" opacity="0.65" />
          <path d="M272 158 L410 228 L548 158" fill="none" stroke="#b9824a" strokeWidth="4" />

          <polygon points="343,144 410,110 476,144 410,178" fill="#8a3441" stroke="#3b2028" strokeWidth="2" />
          <polygon points="343,144 410,178 410,236 343,202" fill="#b7a58a" stroke="#514b3e" strokeWidth="2" />
          <polygon points="410,178 476,144 476,202 410,236" fill="#82745f" stroke="#514b3e" strokeWidth="2" />
          <polygon points="343,144 410,110 476,144 410,178" fill="#9d4650" stroke="#3b2028" strokeWidth="2" />

          <polygon points="344,244 371,258 371,324 344,310" fill="#4d382b" stroke="#d5a43b" strokeWidth="2" />
          <circle cx="365" cy="282" r="3" fill="#d5a43b" />
          <polygon points="455,271 480,258 480,286 455,299" fill="#244b3c" stroke="#d5a43b" strokeWidth="2" />
          <path d="M467 263 L467 295" stroke="#d5a43b" strokeWidth="2" />
          <polygon points="305,225 324,235 324,258 305,248" fill="#315c48" stroke="#d5a43b" strokeWidth="2" />
          <polygon points="495,225 514,215 514,238 495,248" fill="#315c48" stroke="#d5a43b" strokeWidth="2" />

          <g stroke="#5c4430" strokeWidth="7" strokeLinecap="round">
            <path d="M184 176 L184 231" />
            <path d="M696 184 L696 238" />
            <path d="M680 335 L680 376" />
            <path d="M230 342 L230 379" />
          </g>
          <g fill="#527553" stroke="#b7bd83" strokeWidth="2">
            <circle cx="184" cy="155" r="32" />
            <circle cx="163" cy="175" r="22" />
            <circle cx="205" cy="178" r="24" />
            <circle cx="696" cy="163" r="34" />
            <circle cx="672" cy="185" r="22" />
            <circle cx="720" cy="187" r="23" />
            <circle cx="680" cy="316" r="27" />
            <circle cx="661" cy="333" r="18" />
            <circle cx="230" cy="325" r="27" />
            <circle cx="210" cy="340" r="18" />
          </g>
          <g fill="#d5a43b">
            <circle cx="179" cy="151" r="3" />
            <circle cx="690" cy="158" r="3" />
            <circle cx="674" cy="311" r="3" />
          </g>

          <polygon points="590,106 630,126 590,147 550,126" fill="#b7a58a" stroke="#d5a43b" strokeWidth="2" />
          <polygon points="590,114 615,126 590,139 565,126" fill="#244b3c" />
          <circle cx="590" cy="126" r="8" fill="#d5a43b" />
          <path d="M590 102 L590 88 M584 91 L590 84 L596 91" fill="none" stroke="#d5a43b" strokeWidth="3" strokeLinecap="round" />

          <g fill="#d5a43b" stroke="#49392b" strokeWidth="2">
            <path d="M262 190 L269 204 L276 190 Z" />
            <path d="M744 248 L751 262 L758 248 Z" />
            <path d="M620 364 L627 378 L634 364 Z" />
          </g>
          <g fill="#f0dca8">
            <circle cx="269" cy="186" r="4" />
            <circle cx="751" cy="244" r="4" />
            <circle cx="627" cy="360" r="4" />
          </g>
        </svg>

        <div className="house-map-hotspots" aria-label="Locais do terreno">
          {houseLocations.map((location) => (
            <button
              key={location.id}
              type="button"
              className={
                selectedLocationId === location.id
                  ? "house-map-hotspot is-selected"
                  : "house-map-hotspot"
              }
              style={{ left: location.left, top: location.top }}
              onClick={() => setSelectedLocationId(location.id)}
              aria-pressed={selectedLocationId === location.id}
              aria-label={location.label}
            >
              <span className="house-map-marker" aria-hidden="true" />
              <span className="house-map-hotspot-label">{location.label}</span>
            </button>
          ))}
        </div>

        <div className="house-map-legend" aria-live="polite">
          <span className="house-map-marker" aria-hidden="true" />
          <div>
            <strong>{selectedLocation.label}</strong>
            <span>{selectedLocation.detail}</span>
          </div>
        </div>
      </div>

      <p className="house-map-note">
        Selecione os pontos do mapa para conhecer cada área do terreno.
      </p>
    </section>
  );
}
