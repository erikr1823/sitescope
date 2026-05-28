"use client";

type FeedbackPanelProps = {
  title: string;
  message: string;
  tone?: "error" | "neutral";
  actionLabel?: string;
  onAction?: () => void;
};

export default function FeedbackPanel({
  title,
  message,
  tone = "neutral",
  actionLabel,
  onAction,
}: FeedbackPanelProps) {
  return (
    <section
      className="card feedback-panel"
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <h2 className="feedback-panel__title">{title}</h2>
      <p
        className={
          tone === "error"
            ? "feedback-panel__message feedback-panel__message--error"
            : "feedback-panel__message"
        }
      >
        {message}
      </p>
      {actionLabel && onAction ? (
        <div className="form-actions">
          <button type="button" className="btn-secondary mobile-touch-btn" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}
