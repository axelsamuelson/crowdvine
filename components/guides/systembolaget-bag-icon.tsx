type SystembolagetBagIconProps = {
  className?: string;
};

/** Neutral bag mark. Not Systembolaget's logo, wordmark, or colours. */
export function SystembolagetBagIcon({ className }: SystembolagetBagIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4.2 6.2h7.6l-.7 7.1H4.9L4.2 6.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M6.1 6.2V4.9a1.9 1.9 0 0 1 3.8 0v1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
