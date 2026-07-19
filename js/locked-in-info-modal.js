// Inline info disclosure for settings.
// The ⓘ icons expand a short explainer panel directly under their setting
// (id `${iconId}-panel`) instead of opening a modal on top of the settings
// modal. Only one panel is open at a time; toggling is keyboard-accessible.
document.addEventListener("DOMContentLoaded", function () {
  const iconIds = [
    "lockedin-mode-info",
    "auto-break-info",
    "auto-pomodoro-info",
    "burnup-tracker-info",
    "tracker-design-info",
  ];

  const pairs = [];
  iconIds.forEach((id) => {
    const icon = document.getElementById(id);
    const panel = document.getElementById(id + "-panel");
    if (!icon || !panel) return;

    // Promote the decorative span to a real toggle button (a11y)
    icon.setAttribute("role", "button");
    icon.setAttribute("tabindex", "0");
    icon.setAttribute("aria-expanded", "false");
    icon.setAttribute("aria-controls", id + "-panel");

    pairs.push({ icon, panel });
  });

  function closeAll() {
    pairs.forEach(({ icon, panel }) => {
      panel.classList.remove("show");
      icon.setAttribute("aria-expanded", "false");
    });
  }

  pairs.forEach(({ icon, panel }) => {
    const toggle = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const willOpen = !panel.classList.contains("show");
      closeAll();
      if (willOpen) {
        panel.classList.add("show");
        icon.setAttribute("aria-expanded", "true");
      }
    };

    icon.addEventListener("click", toggle);
    icon.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        toggle(event);
      }
    });
  });
});
