(function () {
  const el = (id) => document.getElementById(id);

  function clamp(n, min, max) {
    n = Number(n);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function nowLabel() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  // theme
  Chart.defaults.color = "rgba(255,255,255,0.75)";
  Chart.defaults.font.family = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";

  function gridColor(alpha) {
    return `rgba(255,255,255,${alpha})`;
  }

  function baseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    };
  }

  // ====== Gauges ======
  function makeGauge(canvasId) {
    const ctx = el(canvasId).getContext("2d");
    return new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [0, 100],
          borderWidth: 0,
          cutout: "78%",
          backgroundColor: ["rgba(34,197,94,0.95)", "rgba(255,255,255,0.08)"]
        }]
      },
      options: {
        ...baseOptions(),
        rotation: -120 * (Math.PI / 180),
        circumference: 240 * (Math.PI / 180),
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  }

  function levelForPct(p) {
    if (p >= 85) return "bad";
    if (p >= 65) return "warn";
    return "good";
  }

  function setGauge(gauge, pct, level) {
    const p = clamp(pct, 0, 100);
    gauge.data.datasets[0].data = [p, 100 - p];

    let used = "rgba(34,197,94,0.95)"; // green
    if (level === "warn") used = "rgba(249,115,22,0.95)"; // orange
    if (level === "bad") used = "rgba(244,63,94,0.95)"; // red/rose

    gauge.data.datasets[0].backgroundColor = [used, "rgba(255,255,255,0.08)"];
    gauge.update();
  }

  // ====== Lines ======
  function makeLine(canvasId, labelA, labelB) {
    const ctx = el(canvasId).getContext("2d");
    return new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: labelA,
            data: [],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.35,
            borderColor: "rgba(56,189,248,0.95)",
            backgroundColor: "rgba(56,189,248,0.12)",
            fill: true
          },
          {
            label: labelB,
            data: [],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.35,
            borderColor: "rgba(34,197,94,0.95)",
            backgroundColor: "rgba(34,197,94,0.10)",
            fill: true
          }
        ]
      },
      options: {
        ...baseOptions(),
        plugins: { legend: { display: true, labels: { boxWidth: 8, boxHeight: 8 } } },
        scales: {
          x: { grid: { color: gridColor(0.06) }, ticks: { maxTicksLimit: 6 } },
          y: { grid: { color: gridColor(0.06) }, suggestedMin: 0, suggestedMax: 100 }
        }
      }
    });
  }

  function makeSingleLine(canvasId, label) {
    const ctx = el(canvasId).getContext("2d");
    return new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label,
          data: [],
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.35,
          borderColor: "rgba(250,204,21,0.95)",
          backgroundColor: "rgba(250,204,21,0.10)",
          fill: true
        }]
      },
      options: {
        ...baseOptions(),
        plugins: { legend: { display: true, labels: { boxWidth: 8, boxHeight: 8 } } },
        scales: {
          x: { grid: { color: gridColor(0.06) }, ticks: { maxTicksLimit: 6 } },
          y: { grid: { color: gridColor(0.06) }, suggestedMin: 0 }
        }
      }
    });
  }

  // ====== Bar ======
  function makeBar(canvasId) {
    const ctx = el(canvasId).getContext("2d");
    return new Chart(ctx, {
      type: "bar",
      data: { labels: [], datasets: [{
        label: "Hits/min",
        data: [],
        borderWidth: 0,
        backgroundColor: "rgba(99,102,241,0.85)"
      }]},
      options: {
        ...baseOptions(),
        scales: {
          x: { grid: { color: gridColor(0.06) } },
          y: { grid: { color: gridColor(0.06) }, beginAtZero: true }
        }
      }
    });
  }

  function pushPoint(chart, label, values, maxPoints) {
    chart.data.labels.push(label);
    values.forEach((v, i) => chart.data.datasets[i].data.push(v));

    while (chart.data.labels.length > maxPoints) {
      chart.data.labels.shift();
      chart.data.datasets.forEach(ds => ds.data.shift());
    }
    chart.update();
  }

  // Export
  window.ChartKit = {
    el,
    clamp,
    nowLabel,
    makeGauge,
    makeLine,
    makeSingleLine,
    makeBar,
    pushPoint,
    setGauge,
    levelForPct
  };
})();
