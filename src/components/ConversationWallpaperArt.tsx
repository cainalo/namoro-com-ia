import type { ConversationWallpaper } from "@/lib/couple-conversation-settings";

type ConversationWallpaperArtProps = {
  variant: Exclude<ConversationWallpaper, "photo">;
  compact?: boolean;
};

export function ConversationWallpaperArt({ variant, compact = false }: ConversationWallpaperArtProps) {
  const className = "conversation-wallpaper-art" + (compact ? " is-compact" : "");

  if (variant === "petals") {
    return (
      <svg className={className} viewBox="0 0 420 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="420" height="860" fill="#F8E9E8" />
        <circle cx="352" cy="130" r="112" fill="#F3C8B7" opacity=".56" />
        <circle cx="42" cy="710" r="148" fill="#E5DCD0" opacity=".7" />
        <path d="M-36 520c94-95 178-85 254 20 62 87 115 104 236 26v294H-36Z" fill="#D9E6D6" />
        <path d="M-12 655c89-58 156-41 227 31 66 67 142 78 225 12v186H-12Z" fill="#B9D2C2" />
        <g transform="translate(82 230)">
          <path d="M96 140c-8 112-7 216-42 305" fill="none" stroke="#4F806A" strokeWidth="11" strokeLinecap="round" />
          <path d="M61 324c-77-59-115-45-126 8 46 37 87 37 126-8Z" fill="#739A77" />
          <path d="M83 264c72-66 117-49 126 4-41 47-84 47-126-4Z" fill="#8BAE83" />
          <path d="M59 184c-92-15-112-57-77-99 54 1 87 35 77 99Z" fill="#E98C77" />
          <path d="M93 179c70-78 120-69 139-18-32 55-78 64-139 18Z" fill="#EDB36D" />
          <circle cx="94" cy="114" r="26" fill="#F2C957" />
          <g transform="translate(250 110)">
            <ellipse cx="0" cy="-47" rx="25" ry="48" fill="#E9868E" />
            <ellipse cx="45" cy="-3" rx="25" ry="48" transform="rotate(90 45 -3)" fill="#F0A2A1" />
            <ellipse cx="0" cy="42" rx="25" ry="48" fill="#E9868E" />
            <ellipse cx="-44" cy="-3" rx="25" ry="48" transform="rotate(90 -44 -3)" fill="#F3B7A5" />
            <circle r="27" fill="#F2C957" />
          </g>
        </g>
        <g fill="none" stroke="#B96F5B" strokeWidth="5" strokeLinecap="round">
          <path d="M44 145c31-21 57-21 79 0" />
          <path d="M302 590c20-16 38-16 56 0" />
        </g>
        <g fill="#D98B72">
          <circle cx="60" cy="380" r="6" /><circle cx="335" cy="360" r="8" /><circle cx="280" cy="770" r="5" />
        </g>
      </svg>
    );
  }

  if (variant === "confetti") {
    return (
      <svg className={className} viewBox="0 0 420 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="420" height="860" fill="#EAF0E4" />
        <rect x="-55" y="105" width="210" height="210" rx="58" transform="rotate(-18 -55 105)" fill="#E88B65" />
        <circle cx="345" cy="185" r="116" fill="#F2C96E" />
        <path d="M-40 526c92-78 183-81 273-8 72 58 133 60 227-3v354H-40Z" fill="#D5E5E7" />
        <path d="M-30 683c86-78 172-71 248 2 78 73 137 84 226 22v153H-30Z" fill="#BCD4C6" />
        <rect x="210" y="360" width="175" height="175" rx="52" transform="rotate(17 210 360)" fill="#D78BB1" />
        <circle cx="104" cy="462" r="49" fill="#E8B45C" />
        <path d="M104 412v100m-50-50h100" stroke="#C87A56" strokeWidth="8" strokeLinecap="round" />
        <path d="M280 622c34-31 83-28 112 8-3 45-40 74-87 69-25-15-34-43-25-77Z" fill="#6B8D7E" />
        <path d="M324 685c0-42 20-74 59-98" fill="none" stroke="#426E60" strokeWidth="8" strokeLinecap="round" />
        <path d="m76 710 18 36 39 9-39 10-18 36-18-36-38-10 38-9Z" fill="#E58B75" />
        <path d="M288 72h46m-23-23v46" stroke="#688A75" strokeWidth="9" strokeLinecap="round" />
        <g fill="#668775">
          <circle cx="221" cy="115" r="7" /><circle cx="240" cy="138" r="4" /><circle cx="50" cy="365" r="6" />
          <circle cx="382" cy="450" r="7" /><circle cx="190" cy="780" r="5" />
        </g>
        <g fill="none" stroke="#D88764" strokeWidth="6" strokeLinecap="round">
          <path d="M236 250c24-22 48-22 72 0" /><path d="M51 580c19-19 39-19 58 0" />
        </g>
      </svg>
    );
  }

  if (variant === "night") {
    return (
      <svg className={className} viewBox="0 0 420 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="420" height="860" fill="#183B46" />
        <circle cx="316" cy="180" r="125" fill="#315C66" opacity=".72" />
        <circle cx="310" cy="162" r="77" fill="#F2C875" />
        <circle cx="345" cy="138" r="77" fill="#183B46" />
        <path d="M-25 532c84-85 174-93 258-23 73 61 127 66 212 10v341H-25Z" fill="#244E56" />
        <path d="M-20 679c81-77 159-69 234 2 76 71 132 74 233 8v171H-20Z" fill="#2F6864" />
        <path d="M70 398c49-63 95-63 144 0" fill="none" stroke="#E78A67" strokeWidth="13" strokeLinecap="round" />
        <path d="M70 400v-90h144v90" fill="#D88E6A" opacity=".95" />
        <path d="M104 400v-55h75v55" fill="#F7D7A4" />
        <g fill="#F5E5BD">
          <circle cx="75" cy="148" r="4" /><circle cx="124" cy="85" r="5" /><circle cx="210" cy="180" r="4" />
          <circle cx="390" cy="340" r="4" /><circle cx="274" cy="430" r="5" /><circle cx="42" cy="470" r="4" />
          <circle cx="365" cy="610" r="5" /><circle cx="195" cy="760" r="4" />
        </g>
        <g fill="none" stroke="#E9B66D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m115 230 13 25 26 13-26 13-13 25-13-25-26-13 26-13Z" />
          <path d="m316 390 10 19 20 10-20 10-10 20-10-20-20-10 20-10Z" />
          <path d="M267 700c0-26 21-47 47-47m-47 47c0-26-21-47-47-47" />
        </g>
        <path d="M285 740c-16-20-45-8-45 16 0 26 45 51 45 51s45-25 45-51c0-24-29-36-45-16Z" fill="#E78678" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 420 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="420" height="860" fill="#F5EEDF" />
      <circle cx="338" cy="185" r="116" fill="#F2C46D" opacity=".94" />
      <rect x="45" y="260" width="330" height="470" rx="162" fill="#E8B7A0" />
      <rect x="78" y="294" width="264" height="436" rx="132" fill="#F6E7D4" />
      <path d="M81 620c64-105 144-110 206-56 20 18 38 41 54 75v91H81Z" fill="#779475" />
      <path d="M81 674c85-61 172-37 260 30v26H81Z" fill="#4F7868" />
      <path d="M72 110c40-38 88-42 137-10-13 62-59 94-121 85-19-19-25-44-16-75Z" fill="#E98568" />
      <path d="M138 186c6-52 36-96 92-132" fill="none" stroke="#BD7053" strokeWidth="9" strokeLinecap="round" />
      <path d="M265 400c28-39 73-51 120-29-8 55-47 90-102 96-20-16-27-40-18-67Z" fill="#86A186" />
      <path d="M319 464c0-46 24-87 70-119" fill="none" stroke="#527B67" strokeWidth="9" strokeLinecap="round" />
      <g fill="none" stroke="#D88E5B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="64" cy="390" r="22" />
        <path d="M56 390h16m-8-8v16" />
        <path d="m322 95 13 25 27 13-27 13-13 26-13-26-27-13 27-13Z" fill="#F0BE68" />
        <path d="M72 772c27-24 54-24 81 0m-81 23c27-24 54-24 81 0" stroke="#6E9276" />
      </g>
      <g fill="#D68A69">
        <circle cx="210" cy="120" r="6" /><circle cx="226" cy="145" r="4" /><circle cx="372" cy="540" r="6" />
        <circle cx="43" cy="580" r="5" /><circle cx="277" cy="792" r="5" />
      </g>
    </svg>
  );
}
