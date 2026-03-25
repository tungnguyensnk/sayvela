(function () {
  const api = window.__sayvelaChatGPTInject;
  if (!api) return;

  // repeatedly run cleanup and focus prompt until successful or timeout
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    api.cleanup();
    const done = api.focusPrompt();

    if (done || tries > 60) clearInterval(t);
  }, 250);
})();
