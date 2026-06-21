(function () {
  const blockedPattern =
    /(GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|anthropic-ai|PerplexityBot|Google-Extended|CCBot|Bytespider|Amazonbot|Meta-ExternalAgent|meta-externalagent|Diffbot|PetalBot|YouBot|YandexBot|SemrushBot|AhrefsBot|MJ12bot)/i;

  const userAgent = navigator.userAgent || "";
  const isAutomated =
    navigator.webdriver ||
    blockedPattern.test(userAgent) ||
    /HeadlessChrome|PhantomJS|SlimerJS/i.test(userAgent);

  if (!isAutomated) return;

  document.documentElement.classList.add("is-crawler-guarded");

  const block = () => {
    document.title = "Access unavailable";
    document.body.replaceChildren();
    const message = document.createElement("main");
    message.setAttribute("aria-label", "Access unavailable");
    message.style.cssText =
      "min-height:100vh;display:grid;place-items:center;background:#000;color:#f5f5f7;font:600 17px/1.4 Helvetica,Arial,sans-serif;text-align:center;padding:24px;";
    message.textContent = "Automated scraping and AI training access are not permitted.";
    document.body.append(message);
  };

  if (document.body) {
    block();
  } else {
    document.addEventListener("DOMContentLoaded", block, { once: true });
  }
})();
