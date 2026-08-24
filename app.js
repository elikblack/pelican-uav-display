(() => {
  const cfg = window.DISPLAY_CONFIG;
  if (!cfg) throw new Error("DISPLAY_CONFIG is missing");

  const root = document.documentElement;
  const display = document.getElementById("primary-display");
  const mapWorld = document.getElementById("map-world");
  const mapSvg = document.getElementById("map-svg");
  const terrain = document.getElementById("terrain-image");
  const routeBase = document.getElementById("route-base");
  const routeProgress = document.getElementById("route-progress-path");
  const waypointLayer = document.getElementById("waypoint-layer");
  const aircraft = document.getElementById("aircraft");
  const waypointList = document.getElementById("waypoint-list");
  const progressText = document.getElementById("route-progress");
  const sparkPath = document.getElementById("spark-path");

  let running = true;
  let loopStarted = performance.now();
  let pausedAt = 0;
  let routeLength = 1;
  let waypointMeta = [];

  function applyTheme() {
    Object.entries(cfg.theme).forEach(([key, value]) => {
      const cssName = `--${key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}`;
      root.style.setProperty(cssName, value);
    });
  }

  function bindText() {
    document.querySelectorAll("[data-bind]").forEach(node => {
      const value = node.dataset.bind.split(".").reduce((obj, key) => obj?.[key], cfg);
      if (value != null) node.textContent = value;
    });
  }

  function buildPanel(key) {
    const panel = cfg.panels[key];
    if (!panel) return;
    const title = document.querySelector(`[data-panel-title="${key}"]`);
    const rows = document.querySelector(`[data-panel-rows="${key}"]`);
    if (title) title.textContent = panel.title;
    if (!rows) return;
    rows.innerHTML = panel.rows.map(([name, state, tone = ""]) => `
      <div class="status-row">
        <span class="row-symbol" aria-hidden="true"></span>
        <span class="row-name">${name}</span>
        <span class="row-state ${tone}">${state}</span>
      </div>`).join("");
  }

  function fitDisplay() {
    const scale = Math.min(window.innerWidth / cfg.canvas.width, window.innerHeight / cfg.canvas.height);
    display.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function buildMap() {
    const { worldWidth:w, worldHeight:h } = cfg.map;
    mapWorld.style.width = `${w}px`;
    mapWorld.style.height = `${h}px`;
    terrain.src = cfg.map.image;
    terrain.style.width = `${w}px`;
    terrain.style.height = `${h}px`;
    mapSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    mapSvg.setAttribute("width", w);
    mapSvg.setAttribute("height", h);

    const points = cfg.route.waypoints;
    const pathData = points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
    routeBase.setAttribute("d", pathData);
    routeProgress.setAttribute("d", pathData);

    waypointLayer.innerHTML = points.map((p, index) => `
      <g class="waypoint" data-waypoint="${index}" transform="translate(${p.x} ${p.y})">
        <circle r="12"></circle>
        <text x="20" y="-17">${p.id}</text>
      </g>`).join("");

    waypointList.innerHTML = points.map((p, index) => `
      <div class="waypoint-item" data-waypoint-list="${index}">
        <span class="wp-dot"></span>
        <span class="wp-id">${p.id}</span>
        <span class="wp-label">${p.label || ""}</span>
      </div>`).join("");

    requestAnimationFrame(() => {
      routeLength = Math.max(1, routeBase.getTotalLength());
      routeProgress.style.strokeDasharray = `${routeLength}`;
      routeProgress.style.strokeDashoffset = `${routeLength}`;
      waypointMeta = points.map(p => ({ ...p, progress: nearestProgressOnPath(p) }));
      updateRoute(0);
    });
  }

  function nearestProgressOnPath(point) {
    let bestLength = 0;
    let bestDistance = Infinity;
    const samples = 400;
    for (let i = 0; i <= samples; i++) {
      const length = routeLength * i / samples;
      const p = routeBase.getPointAtLength(length);
      const d = Math.hypot(p.x - point.x, p.y - point.y);
      if (d < bestDistance) {
        bestDistance = d;
        bestLength = length;
      }
    }
    return bestLength / routeLength;
  }

  function updateWaypointState(progress) {
    const listItems = [...document.querySelectorAll("[data-waypoint-list]")];
    const mapItems = [...document.querySelectorAll("#waypoint-layer .waypoint")];
    const nextIndex = waypointMeta.findIndex(wp => progress <= wp.progress + 0.012);
    const activeIndex = nextIndex === -1 ? waypointMeta.length - 1 : nextIndex;

    listItems.forEach((item, index) => {
      item.classList.toggle("active", index === activeIndex);
      item.classList.toggle("completed", index < activeIndex);
    });
    mapItems.forEach((item, index) => {
      item.classList.toggle("active", index === activeIndex);
      item.classList.toggle("completed", index < activeIndex);
    });
  }

  function updateRoute(progress) {
    const length = Math.max(0, Math.min(routeLength, routeLength * progress));
    routeProgress.style.strokeDashoffset = `${routeLength - length}`;

    const p = routeBase.getPointAtLength(length);
    const p2 = routeBase.getPointAtLength(Math.min(routeLength, length + 4));
    const angle = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI + 90;
    aircraft.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${angle})`);

    const ease = progress * progress * (3 - 2 * progress);
    const x = cfg.map.startX + (cfg.map.endX - cfg.map.startX) * ease;
    const y = cfg.map.startY + (cfg.map.endY - cfg.map.startY) * ease;
    mapWorld.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    progressText.textContent = `${String(Math.round(progress * 100)).padStart(2, "0")}%`;
    updateWaypointState(progress);
  }

  function animationFrame(now) {
    const total = cfg.animation.loopMs;
    const pause = Math.min(cfg.animation.pauseAtEndMs, total - 500);
    const travel = total - pause;
    const elapsed = (now - loopStarted) % total;
    const progress = Math.min(1, elapsed / travel);
    if (running) updateRoute(progress);
    requestAnimationFrame(animationFrame);
  }

  function animateSparkline(now) {
    if (!sparkPath) return;
    const points = [];
    const count = 28;
    const t = now / 650;
    for (let i = 0; i < count; i++) {
      const x = i * 170 / (count - 1);
      const wave = 24 + 6 * Math.sin(t + i * .7) + 4 * Math.sin(t * .43 + i * 1.8);
      points.push(`${x.toFixed(1)},${Math.max(6, Math.min(42, wave)).toFixed(1)}`);
    }
    sparkPath.setAttribute("d", `M ${points.join(" L ")}`);
    requestAnimationFrame(animateSparkline);
  }

  function restart() {
    loopStarted = performance.now();
    updateRoute(0);
  }

  function togglePause() {
    if (running) {
      pausedAt = performance.now();
      running = false;
    } else {
      loopStarted += performance.now() - pausedAt;
      running = true;
    }
  }

  function init() {
    applyTheme();
    bindText();
    ["platform", "sensors", "payload"].forEach(buildPanel);
    buildMap();
    fitDisplay();
    window.addEventListener("resize", fitDisplay);
    window.addEventListener("keydown", event => {
      if (event.code === "Space") { event.preventDefault(); togglePause(); }
      if (event.key.toLowerCase() === "r") restart();
    });
    requestAnimationFrame(animationFrame);
    requestAnimationFrame(animateSparkline);
  }

  init();
})();
