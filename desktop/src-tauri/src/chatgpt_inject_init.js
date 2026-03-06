(function () {
  const api = window.__virexChatGPTInject;
  if (!api) return;

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    api.cleanup();
    const done = api.focusPrompt();

    if (done || tries > 60) clearInterval(t);
  }, 250);
})();
