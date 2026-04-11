// login panel — opens system browser for authentication via deep link callback
import "./LoginPanel.css";

export function LoginPanel({ onLogin, loading, error }) {
  return (
    <div className="login-panel">
      <div className="login-panel-inner">
        <img src="/sayvela-mark.svg" alt="Sayvela" className="login-logo" />
        <h2 className="login-title">Sign in to Sayvela</h2>
        <p className="login-sub">
          Sign in to sync sessions and track usage. Your browser will open for secure authentication.
        </p>
        {error && <p className="login-error">{error}</p>}
        <button
          type="button"
          className="btn btn-primary login-btn"
          onClick={onLogin}
          disabled={loading}
        >
          {loading ? "Opening browser…" : "Sign in with browser"}
        </button>
        <p className="login-hint">
          Don't have an account?{" "}
          <a
            href="http://localhost:80/auth?mode=register"
            target="_blank"
            rel="noreferrer"
            className="login-link"
          >
            Register at sayvela.com
          </a>
        </p>
      </div>
    </div>
  );
}
