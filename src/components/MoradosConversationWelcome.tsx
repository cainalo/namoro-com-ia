export function MoradosConversationWelcome() {
  return (
    <div className="conversation-first-message">
      <div className="conversation-first-message-art" aria-hidden="true">
        <svg viewBox="0 0 184 132" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M27 28.5C27 20.492 33.492 14 41.5 14H116.5C124.508 14 131 20.492 131 28.5V72.5C131 80.508 124.508 87 116.5 87H72L53 105V87H41.5C33.492 87 27 80.508 27 72.5V28.5Z"
            fill="#FCF9F2"
            stroke="#B96D50"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M45 38H109M45 53H96M45 68H82" stroke="#B8AA94" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M73 57.5C73 49.492 79.492 43 87.5 43H142.5C150.508 43 157 49.492 157 57.5V92.5C157 100.508 150.508 107 142.5 107H130L113 121V107H87.5C79.492 107 73 100.508 73 92.5V57.5Z"
            fill="#4D624A"
            stroke="#F5F0E6"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M91 68H138M91 81H128" stroke="#F5F0E6" strokeWidth="4" strokeLinecap="round" opacity=".9" />
          <circle cx="149" cy="24" r="5" fill="#C69A59" />
          <circle cx="20" cy="91" r="4" fill="#C69A59" />
        </svg>
      </div>
      <span className="conversation-first-message-kicker">UM LUGAR PARA CONVERSAR</span>
      <strong>Um cantinho só de vocês.</strong>
      <p>Mensagens, fotos e áudios para dividir o dia, guardar detalhes e continuar a história de vocês.</p>
    </div>
  );
}
