import { memo } from "react";

/**
 * Abertura editorial do Feed: um marco visual próprio do espaço compartilhado.
 * A ilustração é vetorial, decorativa e não depende de imagem externa.
 */
export const MoradosFeedHeader = memo(function MoradosFeedHeader() {
  return (
    <header className="morados-feed-heading" aria-labelledby="morados-feed-title">
      <div className="morados-feed-heading-copy">
        <p className="morados-feed-kicker">
          <span aria-hidden="true" />
          O MURAL DE VOCÊS
        </p>
        <h1 id="morados-feed-title">O que vale a pena guardar.</h1>
        <p className="morados-feed-description">
          Momentos pequenos, histórias inteiras e tudo o que acontece entre vocês.
        </p>
      </div>

      <div className="morados-feed-art" aria-hidden="true">
        <svg viewBox="0 0 208 166" role="presentation" focusable="false">
          <path
            d="M24 119C9 88 27 44 65 26c38-18 89-13 116 15 23 24 20 63-5 91-25 28-111 31-142-13Z"
            fill="#E9E6D8"
          />
          <path d="M43 126c18-17 24-36 39-53 11-12 24-19 42-21" fill="none" stroke="#526A50" strokeWidth="5" strokeLinecap="round"/>
          <path d="M165 127c-16-19-21-35-35-49-10-10-21-17-37-20" fill="none" stroke="#B96D50" strokeWidth="5" strokeLinecap="round"/>
          <path d="M80 73c-19-19-36-20-43-12-7 9 8 26 31 25" fill="#83936B"/>
          <path d="M96 57c-7-23 2-35 13-34 12 2 15 21 3 37" fill="#6E8060"/>
          <path d="M128 77c18-18 35-19 42-10 6 9-9 25-31 24" fill="#D7A06A"/>
          <path d="M111 58c7-23-2-35-13-34-12 2-15 21-3 37" fill="#C48261"/>
          <path d="M48 125c12-9 22-11 32-9M161 126c-12-9-22-11-32-9" fill="none" stroke="#526A50" strokeWidth="3" strokeLinecap="round" opacity=".8"/>
          <path d="M104 82c-9-10-24-4-22 8 2 10 19 19 22 21 4-2 21-11 22-21 2-12-13-18-22-8Z" fill="#D5AA65"/>
          <circle cx="104" cy="93" r="4" fill="#F8F2E7"/>
          <path d="M29 48l3 7 7 3-7 3-3 7-3-7-7-3 7-3zM179 77l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#C69A59"/>
          <circle cx="62" cy="121" r="3" fill="#B96D50"/>
          <circle cx="147" cy="118" r="3" fill="#526A50"/>
        </svg>
      </div>
    </header>
  );
});
