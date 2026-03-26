(function () {
  const {
    el, clamp, nowLabel,
    makeGauge, makeLine, makeSingleLine, makeBar,
    pushPoint, setGauge, levelForPct
  } = window.ChartKit;

  const DEMO_MODE = !!window.DEMO_MODE;
  const METRICS_URL = window.METRICS_URL;
  const REFRESH_MS = window.REFRESH_MS;
  const MAX_POINTS = window.MAX_POINTS;
  const RPM_MAX = window.RPM_MAX;

  el("endpointView").textContent = METRICS_URL;

  // Charts
  const cpuGauge = makeGauge("cpuGauge");
  const ramGauge = makeGauge("ramGauge");
  const diskGauge = makeGauge("diskGauge");
  const rpmGauge = makeGauge("rpmGauge");

  const cpuRamLine = makeLine("cpuRamLine", "CPU %", "RAM %");
  const loginsLine = makeSingleLine("loginsLine", "Logins/min");
  const endpointsBar = makeBar("endpointsBar");

  function fmtTrend(v) {
    if (v === null || v === undefined) return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    const sign = n > 0 ? "+" : "";
    return `${sign}${n}%`;
  }

  function setStatus(mode, ok, latencyMs) {
    el("dataMode").textContent = mode;
    el("dataMode").className = mode === "DEMO"
      ? "font-semibold text-amber-300"
      : "font-semibold text-emerald-300";

    el("apiStatus").textContent = ok ? "Online" : "Offline";
    el("apiStatus").className = ok
      ? "font-semibold text-emerald-300"
      : "font-semibold text-rose-300";

    el("lastUpdated").textContent = nowLabel();
    el("latency").textContent = ok ? String(latencyMs) : "—";
  }

  function setRpmGauge(rpm) {
    const p = clamp((Number(rpm) / RPM_MAX) * 100, 0, 100);
    const level = p >= 80 ? "bad" : p >= 50 ? "warn" : "good";
    setGauge(rpmGauge, p, level);
  }

  function applyData(d) {
    // KPIs
    el("kpiSignups").textContent = d.signups_24h ?? "—";
    el("kpiLogins").textContent = d.logins_24h ?? "—";
    el("kpiSignouts").textContent = d.signouts_24h ?? "—";
    el("kpiErrors").textContent = d.errors_24h ?? "—";
    el("kpiErrorRate").textContent = (d.error_rate ?? "—") + "%";

    el("kpiSignupsTrend").textContent = fmtTrend(d.signups_trend_pct);
    el("kpiLoginsTrend").textContent = fmtTrend(d.logins_trend_pct);
    el("kpiSignoutsTrend").textContent = fmtTrend(d.signouts_trend_pct);

    // Values
    const cpu = clamp(d.cpu_percent, 0, 100);
    const ram = clamp(d.ram_percent, 0, 100);
    const disk = clamp(d.disk_percent, 0, 100);

    el("cpuPct").textContent = cpu;
    el("ramPct").textContent = ram;
    el("diskPct").textContent = disk;

    setGauge(cpuGauge, cpu, levelForPct(cpu));
    setGauge(ramGauge, ram, levelForPct(ram));
    setGauge(diskGauge, disk, levelForPct(disk));

    el("ramText").textContent = `${d.ram_used_gb ?? "—"} / ${d.ram_total_gb ?? "—"} GB`;
    el("diskText").textContent = `${d.disk_used_gb ?? "—"} / ${d.disk_total_gb ?? "—"} GB`;

    // RPM gauge
    el("rpmNow").textContent = d.requests_per_min ?? "—";
    setRpmGauge(d.requests_per_min ?? 0);

    // Services
    el("backendUp").textContent = d.backend_up ? "Online ✅" : "Offline ❌";
    el("dbUp").textContent = d.db_up ? "Connected ✅" : "Disconnected ❌";

    // System info
    el("uptime").textContent = d.uptime_human ?? "—";
    el("host").textContent = d.host ?? "—";
    el("version").textContent = d.version ?? "—";

    // Live lines
    const label = nowLabel();
    pushPoint(cpuRamLine, label, [cpu, ram], MAX_POINTS);
    pushPoint(loginsLine, label, [Number(d.logins_per_min ?? 0)], MAX_POINTS);

    // Bar
    const endpoints = Array.isArray(d.top_endpoints) ? d.top_endpoints : [];
    endpointsBar.data.labels = endpoints.map(x => x.path);
    endpointsBar.data.datasets[0].data = endpoints.map(x => Number(x.hits_per_min || 0));
    endpointsBar.update();
  }

  async function fetchReal() {
    const t0 = performance.now();
    const res = await fetch(METRICS_URL, { cache: "no-store" });
    const latency = Math.round(performance.now() - t0);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    return { data, latency };
  }

  async function tick() {
    try {
      if (DEMO_MODE) {
        setStatus("DEMO", true, 0);
        applyData(window.DemoData.makeDemoPayload());
        return;
      }

      const { data, latency } = await fetchReal();
      setStatus("LIVE", true, latency);
      applyData(data);

    } catch (err) {
      // if LIVE fails, show offline + still keep chart moving with demo (optional)
      setStatus(DEMO_MODE ? "DEMO" : "LIVE", false, 0);

      // optional fallback demo so charts are not empty:
      const fallback = window.DemoData.makeDemoPayload();
      applyData(fallback);
    }
  }

  // Start
  tick();
  setInterval(tick, REFRESH_MS);
})();
