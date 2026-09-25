import styles from "./whatsapp-button.module.css";

type WhatsAppFloatingButtonProps = {
  phoneNumber: string;
  side?: "left" | "right";
};

export default function WhatsAppFloatingButton({
  phoneNumber,
  side = "right",
}: WhatsAppFloatingButtonProps) {
  const digits = phoneNumber.replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(digits)) return null;

  return (
    <a
      className={`${styles.button} ${styles[side]}`}
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Scrivici su WhatsApp (si apre in una nuova scheda)"
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M12 2.25a9.75 9.75 0 0 0-8.43 14.65L2.25 21.75l5-1.31A9.75 9.75 0 1 0 12 2.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8.24 7.23c.23-.23.48-.29.73-.2l1.43.58c.25.1.38.32.35.59l-.16 1.4c-.02.18.03.34.16.49l3.16 3.16c.15.13.31.18.49.16l1.4-.16c.27-.03.49.1.59.35l.58 1.43c.09.25.03.5-.2.73-.75.75-1.85 1.02-2.87.65-3.03-1.1-5.41-3.48-6.51-6.51-.37-1.02-.1-2.12.65-2.87Z" fill="currentColor" />
      </svg>
    </a>
  );
}
