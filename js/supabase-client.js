// Shared Supabase client
// One client instance for the whole app (auth + sync + leaderboard).
// Environment is picked by hostname: the production domain talks to the
// production project; localhost and Vercel preview URLs talk to staging,
// so nothing you do during development can touch real user data.
// The anon keys below are public by design — Row Level Security and
// Supabase Auth are what actually protect the data.
(function () {
  const ENVIRONMENTS = {
    production: {
      url: "https://tmsmykzvwuyankvlzsif.supabase.co",
      anonKey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtc215a3p2d3V5YW5rdmx6c2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzY2MzUsImV4cCI6MjA3MDQxMjYzNX0.-PTqdJ3jsx7E2lghELJPo5Yo7zgjLzb0Mbaa5tLrUPg",
    },
    staging: {
      url: "https://wkyewllxbprwrukuqkvn.supabase.co",
      anonKey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWV3bGx4YnByd3J1a3Vxa3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTUzOTUsImV4cCI6MjA5OTk3MTM5NX0.Fpla8wbUXGkJcLUhQjjqSBxJCSMtJLRmTX70R4W7BU4",
    },
  };

  const PRODUCTION_HOSTNAMES = [
    "www.customodoro.app",
    "customodoro.app",
    "customodoro.vercel.app",
  ];

  function resolveEnvironment() {
    const override = localStorage.getItem("customodoro-supabase-env");
    if (override && ENVIRONMENTS[override]) return override;
    return PRODUCTION_HOSTNAMES.includes(window.location.hostname)
      ? "production"
      : "staging";
  }

  if (typeof supabase === "undefined" || !supabase.createClient) {
    window.customodoroLogger?.error("SUPABASE_CLIENT_LIBRARY_NOT_LOADED");
    return;
  }

  const envName = resolveEnvironment();
  const env = ENVIRONMENTS[envName];

  window.supabaseEnv = envName;
  window.supabaseClient = supabase.createClient(env.url, env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
})();
