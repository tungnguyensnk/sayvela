// quota exceeded modal shown when user has used all their minutes
import "./QuotaExceededModal.css";

export function QuotaExceededModal({ entitlement, onDismiss }) {
  const plan = entitlement?.plan ?? "free";
  const used = entitlement?.minutesUsed ?? 0;
  const limit = entitlement?.minutesPerMonth ?? 300;

  return (
    <div className="quota-overlay">
      <div className="quota-modal">
        <div className="quota-icon">⏱️</div>
        <h3 className="quota-title">Usage limit reached</h3>
        <p className="quota-body">
          You've used <strong>{used}</strong> of <strong>{limit}</strong> minutes on the{" "}
          <strong>{plan}</strong> plan this month.
        </p>
        <p className="quota-body">
          Upgrade your plan at{" "}
          <a
            href="https://sayvela.com/pricing"
            target="_blank"
            rel="noreferrer"
            className="login-link"
          >
            sayvela.com/pricing
          </a>{" "}
          to continue.
        </p>
        <button className="btn btn-secondary" onClick={onDismiss}>
          Continue anyway
        </button>
      </div>
    </div>
  );
}
