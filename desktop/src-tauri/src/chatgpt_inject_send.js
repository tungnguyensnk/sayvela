(function () {
  const api = window.__virexChatGPTInject;
  if (!api) return;

  const msg = __TEXT_JSON__;

  let tries = 0;
  const tick = () => {
    tries++;
    api.cleanup();

    const ta = api.getPromptTextarea();
    if (ta) {
      ta.focus();
      ta.value = msg;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      const form = ta.closest("form");
      const btn =
        (form && form.querySelector('button[type="submit"]')) ||
        document.querySelector('button[data-testid="send-button"]');
      if (btn) {
        btn.click();
        api.focusPrompt();
        return true;
      }
    }

    const ce = document.querySelector('[contenteditable="true"]');
    if (ce) {
      ce.focus();
      ce.textContent = msg;
      ce.dispatchEvent(new InputEvent("input", { bubbles: true }));
      const btn =
        document.querySelector('button[type="submit"]') ||
        document.querySelector('button[data-testid="send-button"]');
      if (btn) {
        btn.click();
        api.focusPrompt();
        return true;
      }
    }

    return false;
  };

  if (tick()) return;

  const t = setInterval(() => {
    if (tick() || tries > 60) {
      clearInterval(t);
      api.focusPrompt();
    }
  }, 250);
})();
