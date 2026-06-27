(function initializeCustomodoroLogger() {
  "use strict";

  const nativeError = console.error.bind(console);
  const errorCodePattern = /^[A-Z][A-Z0-9_]{2,63}$/;
  const emittedErrors = new Set();

  function error(code, context) {
    if (!errorCodePattern.test(code)) return;

    const status = context?.status;
    const statusSuffix =
      Number.isInteger(status) && status >= 100 && status <= 599
        ? ` status=${status}`
        : "";
    const diagnostic = `${code}${statusSuffix}`;
    if (emittedErrors.has(diagnostic)) return;
    emittedErrors.add(diagnostic);

    nativeError(`[Customodoro] ${diagnostic}`);
  }

  window.customodoroLogger = Object.freeze({ error });
})();
