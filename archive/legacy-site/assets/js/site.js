(() => {
  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = new Date().getFullYear();

  const banner = document.querySelector("[data-consent]");
  if (!banner) return;

  const preference = localStorage.getItem("analytics-consent");
  const loadAnalytics = () => {
    if (document.querySelector('script[data-domain="thetechshed.dev"]')) return;
    const script = document.createElement("script");
    script.src = "https://plausible.io/js/script.js";
    script.defer = true;
    script.dataset.domain = "thetechshed.dev";
    document.head.appendChild(script);
  };

  if (preference === "yes") loadAnalytics();
  if (preference === null) banner.classList.add("is-visible");

  banner.querySelector("[data-accept]")?.addEventListener("click", () => {
    localStorage.setItem("analytics-consent", "yes");
    loadAnalytics();
    banner.classList.remove("is-visible");
  });
  banner.querySelector("[data-decline]")?.addEventListener("click", () => {
    localStorage.setItem("analytics-consent", "no");
    banner.classList.remove("is-visible");
  });
})();
