import { MoradosMark } from "@/components/MoradosMark";

type MoradosLoadingScreenProps = {
  message?: string;
  compact?: boolean;
};

export function MoradosLoadingScreen({
  message = "Preparando o espaço de vocês",
  compact = false,
}: MoradosLoadingScreenProps) {
  return (
    <main
      className={"morados-loading-screen" + (compact ? " is-compact" : "")}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <svg className="morados-loading-art" viewBox="0 0 900 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="morados-load-sun" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F3B45F" />
            <stop offset="1" stopColor="#E77F54" />
          </linearGradient>
          <linearGradient id="morados-load-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#82956B" />
            <stop offset="1" stopColor="#3F7161" />
          </linearGradient>
        </defs>
        <rect width="900" height="900" fill="#F7F1E6" />
        <circle cx="125" cy="165" r="118" fill="#F5D9B8" opacity=".7" />
        <circle cx="790" cy="690" r="170" fill="#DCE9DB" opacity=".8" />
        <path d="M-45 650C100 520 220 540 325 660s220 180 365 75 215-85 270-35v250H-45Z" fill="#E7EBD7" />
        <path d="M-60 770c160-105 276-70 404 24s244 72 356-8 205-105 270-57v171H-60Z" fill="#D6E1CE" />
        <rect x="306" y="214" width="288" height="440" rx="142" fill="#E8B7A0" opacity=".82" />
        <rect x="336" y="244" width="228" height="380" rx="114" fill="#F7E8D4" />
        <circle cx="450" cy="395" r="88" fill="url(#morados-load-sun)" />
        <path d="M337 560c65-80 124-91 184-38 24 22 43 48 43 102H337Z" fill="#6C8A63" />
        <path d="M337 589c72-46 133-37 227 20v15H337Z" fill="#4D7665" />
        <path d="M120 565c34-38 77-49 125-31-12 50-51 86-103 90-18-17-25-37-22-59Z" fill="#E58663" />
        <path d="M173 618c-4-47 23-94 74-126" fill="none" stroke="#A95443" strokeWidth="8" strokeLinecap="round" />
        <path d="M710 240c28-40 76-53 123-31-6 55-43 94-96 104-21-14-31-38-27-73Z" fill="#82A18A" />
        <path d="M753 310c2-45 28-84 73-116" fill="none" stroke="#4D7665" strokeWidth="8" strokeLinecap="round" />
        <path d="M672 488c25-31 62-42 98-28-5 43-36 74-78 81-17-12-24-31-20-53Z" fill="#E8A46A" />
        <path d="M710 541c4-35 25-65 59-86" fill="none" stroke="#B96E4C" strokeWidth="7" strokeLinecap="round" />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="178" cy="340" r="28" stroke="#D88E5B" strokeWidth="7" />
          <path d="M170 340h16m-8-8v16" stroke="#D88E5B" strokeWidth="5" />
          <path d="m697 130 15 30 30 15-30 15-15 30-15-30-30-15 30-15Z" fill="#E9B45D" stroke="#D88E5B" strokeWidth="4" />
          <path d="M720 780c-21-27-60-10-60 22 0 35 60 68 60 68s60-33 60-68c0-32-39-49-60-22Z" fill="#E88A72" stroke="#C76F5E" strokeWidth="4" />
          <path d="M110 745c35-26 67-26 100 0m-100 25c35-26 67-26 100 0" stroke="#789174" strokeWidth="7" />
          <path d="M788 410h38m-19-19v38" stroke="#68846B" strokeWidth="7" />
        </g>
        <g fill="#D88E5B">
          <circle cx="260" cy="125" r="7" /><circle cx="285" cy="148" r="4" />
          <circle cx="625" cy="680" r="8" /><circle cx="655" cy="710" r="5" />
          <circle cx="104" cy="445" r="6" /><circle cx="835" cy="330" r="6" />
        </g>
        <g fill="#647D63">
          <circle cx="250" cy="720" r="5" /><circle cx="620" cy="160" r="5" />
          <circle cx="835" cy="560" r="4" /><circle cx="60" cy="270" r="4" />
        </g>
      </svg>

      <div className="morados-loading-content">
        <div className="morados-loading-brand">
          <span className="morados-loading-mark"><MoradosMark size={42} /></span>
          <span className="morados-loading-word">morados</span>
          <span className="morados-loading-tagline">um espaço feito a dois</span>
        </div>
        <div className="morados-loading-status">
          <span className="morados-loading-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="morados-loading-message">{message}</span>
        </div>
      </div>
      <span className="sr-only">{message}</span>
    </main>
  );
}
