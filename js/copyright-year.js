(function () {
  const launchYear = 2025;

  function getDisplayYear() {
    const currentYear = new Date().getFullYear();
    return Number.isFinite(currentYear)
      ? Math.max(launchYear, currentYear)
      : launchYear;
  }

  function updateCopyrightYears() {
    const year = String(getDisplayYear());
    document.querySelectorAll(".copyright-year").forEach((element) => {
      element.textContent = year;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateCopyrightYears, {
      once: true,
    });
  } else {
    updateCopyrightYears();
  }
})();
