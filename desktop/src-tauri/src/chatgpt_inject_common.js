(function () {
  const STYLE_ID = "virex-chatgpt-style";
  const STATE_KEY = "__virexChatGPTInject";

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .text-page-header, #page-header { display: none !important; }
      .user-message-bubble-color { display: none !important; }
      aside.text-token-text-primary { display: none !important; }
      article[data-turn="user"] { display: none !important; }
    `;
    document.head.appendChild(style);
  };

  // set a cookie with standard attributes
  const setCookie = (name, value) => {
    try {
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax; secure`;
    } catch {}
  };

  // set an item in local storage
  const setLocalStorage = (key, value) => {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  };

  // find and return the chat input textarea element
  const getPromptTextarea = () =>
    document.querySelector("textarea#prompt-textarea") || document.querySelector("textarea");

  // click and focus the chat input textarea
  const focusPrompt = () => {
    const ta = getPromptTextarea();
    if (ta) ta.click();
    return Boolean(ta);
  };

  // apply ui styles and set necessary cookies/storage for injection
  const cleanup = () => {
    ensureStyle();
    setCookie("oai_consent_analytics", "true");
    setCookie("oai_consent_marketing", "true");
    setCookie("oai-allow-ne", "true");
    setLocalStorage("oai/apps/noAuthUserMessageCount", "1");
    setLocalStorage("oai/apps/noAuthHasAcceptedFooterDisclaimer", "true");
  };

  window[STATE_KEY] = {
    cleanup,
    focusPrompt,
    getPromptTextarea,
  };
})();
