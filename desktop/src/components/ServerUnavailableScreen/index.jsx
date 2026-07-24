import { ActionButton } from "../astryx/AstryxControls";
import "./ServerUnavailableScreen.css";

export function ServerUnavailableScreen({ loading, onRetry }) {
  return (
    <main className="server-unavailable">
      <div className="server-unavailable__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 8v5m0 3h.01M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <h1>Something went wrong</h1>
      <p>We couldn't connect to the server. Please try again later.</p>
      <ActionButton type="button" variant="primary" onClick={onRetry} disabled={loading}>
        {loading ? "Trying again…" : "Try again"}
      </ActionButton>
    </main>
  );
}
