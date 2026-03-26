(function () {
  const { clamp } = window.ChartKit;

  let cpu = 25;
  let ram = 45;
  let logins = 10;

  function rndWalk(v, step, min, max) {
    return clamp(v + (Math.random() * step * 2 - step), min, max);
  }

  function makeDemoPayload() {
    cpu = rndWalk(cpu, 4, 2, 95);
    ram = rndWalk(ram, 3, 10, 92);
    logins = Math.max(0, Math.round(rndWalk(logins, 3, 0, 120)));

    const rpm = Math.round(70 + cpu * 2 + Math.random() * 10);

    return {
      backend_up: true,
      db_up: true,
      host: "demo-local",
      version: "demo",
      uptime_human: "DEMO MODE",

      cpu_percent: Math.round(cpu),
      ram_percent: Math.round(ram),
      ram_used_gb: Number((ram / 100 * 8).toFixed(1)),
      ram_total_gb: 8,

      disk_percent: 56,
      disk_used_gb: 120,
      disk_total_gb: 220,

      requests_per_min: rpm,
      logins_per_min: logins,

      signups_24h: 275,
      logins_24h: 193,
      signouts_24h: 276,
      errors_24h: 3,
      error_rate: 0.6,

      signups_trend_pct: 8,
      logins_trend_pct: -3,
      signouts_trend_pct: 2,

      top_endpoints: [
        { path: "/api/messages", hits_per_min: Math.round(30 + cpu) },
        { path: "/api/login", hits_per_min: Math.round(10 + logins) },
        { path: "/api/metrics-summary", hits_per_min: Math.round(5 + cpu / 3) }
      ]
    };
  }

  window.DemoData = { makeDemoPayload };
})();
