(() => {
  const cfg = window.DISPLAY_CONFIG;
  if (!cfg) throw new Error("DISPLAY_CONFIG is missing");

  const NS = "http://www.w3.org/2000/svg";
  const root = document.documentElement;
  const display = document.getElementById("primary-display");
  const workspace = document.querySelector(".workspace");
  const mapWorld = document.getElementById("map-world");
  const mapSvg = document.getElementById("map-svg");
  const terrain = document.getElementById("terrain-image");
  const routeBase = document.getElementById("route-base");
  const routeProgress = document.getElementById("route-progress-path");
  let aoiLayer = document.getElementById("aoi-layer");
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
  let timeline = [];
  let motionEndMs = 1;
  let totalLoopMs = 1;

  const sparkCount = 58;
  const sparkStepMs = cfg.throughput?.stepMs ?? 185;
  const sparkSamples = [];
  let sparkLastStep = 0;

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

  function installEffectsStylesheet() {
    if (document.querySelector('link[data-effects-css]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "effects.css";
    link.dataset.effectsCss = "true";
    document.head.appendChild(link);
  }

  function ensureThroughputGradient() {
    if (!sparkPath || document.getElementById("throughput-gradient")) return;
    const gradient = document.createElementNS(NS, "linearGradient");
    gradient.id = "throughput-gradient";
    gradient.setAttribute("x1", "0%");
    gradient.setAttribute("y1", "0%");
    gradient.setAttribute("x2", "100%");
    gradient.setAttribute("y2", "0%");
    [
      ["0%", cfg.theme.throughputOrange ?? "#ed8b2f"],
      ["58%", "#f0ad39"],
      ["100%", cfg.theme.throughputYellow ?? "#f2d35e"]
    ].forEach(([offset, color]) => {
      const stop = document.createElementNS(NS, "stop");
      stop.setAttribute("offset", offset);
      stop.style.stopColor = color;
      gradient.appendChild(stop);
    });
    const sparkSvg = sparkPath.ownerSVGElement;
    let defs = sparkSvg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(NS, "defs");
      sparkSvg.insertBefore(defs, sparkSvg.firstChild);
    }
    defs.appendChild(gradient);
    sparkPath.style.stroke = "url(#throughput-gradient)";
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

    if (workspace) {
      workspace.style.setProperty("--map-image", `url("${cfg.map.image}")`);
      workspace.style.setProperty("--map-width", `${w}px`);
      workspace.style.setProperty("--map-height", `${h}px`);
      workspace.style.setProperty("--map-x", `${cfg.map.startX}px`);
      workspace.style.setProperty("--map-y", `${cfg.map.startY}px`);
    }

    if (!aoiLayer) {
      aoiLayer = document.createElementNS(NS, "g");
      aoiLayer.id = "aoi-layer";
      mapSvg.insertBefore(aoiLayer, waypointLayer);
    }

    ensureThroughputGradient();

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

    aoiLayer.innerHTML = points.map((p, index) => index === 0 ? "" : buildAOIMarkup(p, index)).join("");

    requestAnimationFrame(() => {
      routeLength = Math.max(1, routeBase.getTotalLength());
      routeProgress.style.strokeDasharray = `${routeLength}`;
      routeProgress.style.strokeDashoffset = `${routeLength}`;
      waypointMeta = points.map(p => {
        const length = nearestLengthOnPath(p);
        return { ...p, length, progress: length / routeLength };
      });
      buildTimeline();
      renderAtElapsed(0);
    });
  }

  function buildAOIMarkup(point, index) {
    const size = cfg.animation.aoiSize ?? 126;
    const half = size / 2;
    const cx = point.x;
    const cy = point.y;
    const left = cx - half;
    const right = cx + half;
    const top = cy - half;
    const bottom = cy + half;
    const ring = Math.min(31, half * .48);
    const bracket = Math.min(14, half * .22);

    const quadrant = (name, edge, arc, corner) => `
      <g class="aoi-quadrant" data-quadrant="${name}">
        <path class="aoi-edge" d="${edge}"></path>
        <path class="aoi-ring" d="${arc}"></path>
        <path class="aoi-corner" d="${corner}"></path>
      </g>`;

    return `
      <g class="aoi-box" data-aoi="${index}">
        ${quadrant("UR", `M ${cx} ${top} H ${right} V ${cy}`, `M ${cx} ${cy-ring} A ${ring} ${ring} 0 0 1 ${cx+ring} ${cy}`, `M ${right-bracket} ${top} H ${right} V ${top+bracket}`)}
        ${quadrant("BR", `M ${right} ${cy} V ${bottom} H ${cx}`, `M ${cx+ring} ${cy} A ${ring} ${ring} 0 0 1 ${cx} ${cy+ring}`, `M ${right} ${bottom-bracket} V ${bottom} H ${right-bracket}`)}
        ${quadrant("BL", `M ${cx} ${bottom} H ${left} V ${cy}`, `M ${cx} ${cy+ring} A ${ring} ${ring} 0 0 1 ${cx-ring} ${cy}`, `M ${left+bracket} ${bottom} H ${left} V ${bottom-bracket}`)}
        ${quadrant("UL", `M ${left} ${cy} V ${top} H ${cx}`, `M ${cx-ring} ${cy} A ${ring} ${ring} 0 0 1 ${cx} ${cy-ring}`, `M ${left} ${top+bracket} V ${top} H ${left+bracket}`)}
        <path class="aoi-crosshair" d="M ${cx-9} ${cy} H ${cx+9} M ${cx} ${cy-9} V ${cy+9}"></path>
        <text class="aoi-label aoi-label-main" x="${cx}" y="${cy+47}">AOI</text>
        <text class="aoi-label aoi-label-sub" x="${cx}" y="${cy+59}">SURVEY AREA</text>
      </g>`;
  }

  function nearestLengthOnPath(point) {
    let bestLength = 0;
    let bestDistance = Infinity;
    const samples = 700;
    for (let i = 0; i <= samples; i++) {
      const length = routeLength * i / samples;
      const p = routeBase.getPointAtLength(length);
      const d = Math.hypot(p.x - point.x, p.y - point.y);
      if (d < bestDistance) {
        bestDistance = d;
        bestLength = length;
      }
    }
    return bestLength;
  }

  function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function cubicPoint(phase, t) {
    const u = 1 - t;
    return {
      x: u*u*u*phase.p0.x + 3*u*u*t*phase.p1.x + 3*u*t*t*phase.p2.x + t*t*t*phase.p3.x,
      y: u*u*u*phase.p0.y + 3*u*u*t*phase.p1.y + 3*u*t*t*phase.p2.y + t*t*t*phase.p3.y
    };
  }

  function cubicDerivative(phase, t) {
    const u = 1 - t;
    return {
      x: 3*u*u*(phase.p1.x-phase.p0.x) + 6*u*t*(phase.p2.x-phase.p1.x) + 3*t*t*(phase.p3.x-phase.p2.x),
      y: 3*u*u*(phase.p1.y-phase.p0.y) + 6*u*t*(phase.p2.y-phase.p1.y) + 3*t*t*(phase.p3.y-phase.p2.y)
    };
  }

  function buildCurveLookup(phase, samples = 72) {
    const lookup = [{ t: 0, distance: 0, point: phase.p0 }];
    let total = 0;
    let previous = phase.p0;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const point = cubicPoint(phase, t);
      total += Math.hypot(point.x - previous.x, point.y - previous.y);
      lookup.push({ t, distance: total, point });
      previous = point;
    }
    phase.curveLookup = lookup;
    phase.curveLength = total;
    return total;
  }

  function curveTAtDistance(phase, distance) {
    const target = Math.max(0, Math.min(phase.curveLength, distance));
    const lookup = phase.curveLookup;
    for (let i = 1; i < lookup.length; i++) {
      if (lookup[i].distance >= target) {
        const a = lookup[i - 1];
        const b = lookup[i];
        const span = Math.max(.0001, b.distance - a.distance);
        const mix = (target - a.distance) / span;
        return a.t + (b.t - a.t) * mix;
      }
    }
    return 1;
  }

  function buildTimeline() {
    const radius = cfg.animation.orbitRadius ?? 36;
    const speed = Math.max(1, cfg.animation.aircraftSpeedPxPerSec ?? 20);
    const orbitTurns = cfg.animation.orbitTurns ?? 1;
    const endPauseMs = cfg.animation.endPauseMs ?? 2600;
    const msPerPx = 1000 / speed;

    timeline = [];
    let cursor = 0;
    let currentAircraftLength = 0;

    for (let index = 1; index < waypointMeta.length; index++) {
      const wp = waypointMeta[index];
      const approachLength = Math.max(currentAircraftLength, wp.length - radius);
      const travelDistance = Math.max(0, approachLength - currentAircraftLength);
      const travelDuration = Math.max(1, travelDistance * msPerPx);

      timeline.push({
        type: "travel",
        start: cursor,
        end: cursor + travelDuration,
        fromAircraftLength: currentAircraftLength,
        toAircraftLength: approachLength,
        targetIndex: index,
        completedThrough: index - 1
      });
      cursor += travelDuration;

      const entry = routeBase.getPointAtLength(approachLength);
      const startAngle = Math.atan2(entry.y - wp.y, entry.x - wp.x);
      const orbitDistance = Math.PI * 2 * radius * orbitTurns;
      const orbitDuration = Math.max(1, orbitDistance * msPerPx);

      timeline.push({
        type: "scan",
        start: cursor,
        end: cursor + orbitDuration,
        routeProgressLength: approachLength,
        targetIndex: index,
        completedThrough: index - 1,
        center: { x: wp.x, y: wp.y },
        startAngle,
        orbitTurns
      });
      cursor += orbitDuration;

      if (index < waypointMeta.length - 1) {
        const nextWp = waypointMeta[index + 1];
        const exitLength = Math.min(nextWp.length, wp.length + radius);
        const exit = routeBase.getPointAtLength(exitLength);
        const outgoing = normalize(exit.x - wp.x, exit.y - wp.y);
        const tangent = { x: -Math.sin(startAngle), y: Math.cos(startAngle) };
        const phase = {
          type: "rejoin",
          start: cursor,
          fromRouteLength: approachLength,
          toRouteLength: exitLength,
          targetIndex: index + 1,
          completedThrough: index,
          p0: { x: entry.x, y: entry.y },
          p1: { x: entry.x + tangent.x * radius * .95, y: entry.y + tangent.y * radius * .95 },
          p2: { x: exit.x - outgoing.x * radius * .72, y: exit.y - outgoing.y * radius * .72 },
          p3: { x: exit.x, y: exit.y }
        };
        const curveLength = buildCurveLookup(phase);
        phase.end = cursor + Math.max(1, curveLength * msPerPx);
        timeline.push(phase);
        cursor = phase.end;
        currentAircraftLength = exitLength;
      } else {
        const finalDistance = Math.max(0, wp.length - approachLength);
        const finalDuration = Math.max(1, finalDistance * msPerPx);
        timeline.push({
          type: "travel",
          start: cursor,
          end: cursor + finalDuration,
          fromAircraftLength: approachLength,
          toAircraftLength: wp.length,
          targetIndex: -1,
          completedThrough: index
        });
        cursor += finalDuration;
        currentAircraftLength = wp.length;
      }
    }

    motionEndMs = cursor;
    totalLoopMs = motionEndMs + endPauseMs;
  }

  function setAircraft(point, vector) {
    const angle = Math.atan2(vector.y, vector.x) * 180 / Math.PI + 90;
    aircraft.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
  }

  function setAircraftOnRoute(length) {
    const clamped = Math.max(0, Math.min(routeLength, length));
    const p = routeBase.getPointAtLength(clamped);
    const delta = 4;
    const before = routeBase.getPointAtLength(Math.max(0, clamped - delta));
    const after = routeBase.getPointAtLength(Math.min(routeLength, clamped + delta));
    setAircraft(p, { x: after.x - before.x, y: after.y - before.y });
  }

  function setRouteProgress(length) {
    const clamped = Math.max(0, Math.min(routeLength, length));
    routeProgress.style.strokeDashoffset = `${routeLength - clamped}`;
    const progress = clamped / routeLength;
    const cameraEase = progress * progress * (3 - 2 * progress);
    const x = cfg.map.startX + (cfg.map.endX - cfg.map.startX) * cameraEase;
    const y = cfg.map.startY + (cfg.map.endY - cfg.map.startY) * cameraEase;
    mapWorld.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (workspace) {
      workspace.style.setProperty("--map-x", `${x}px`);
      workspace.style.setProperty("--map-y", `${y}px`);
    }
    progressText.textContent = `${String(Math.round(progress * 100)).padStart(2, "0")}%`;
  }

  function updateWaypointState(activeIndex, completedThrough) {
    const listItems = [...document.querySelectorAll("[data-waypoint-list]")];
    const mapItems = [...document.querySelectorAll("#waypoint-layer .waypoint")];
    listItems.forEach((item, index) => {
      item.classList.toggle("active", index === activeIndex);
      item.classList.toggle("completed", index <= completedThrough && index !== activeIndex);
    });
    mapItems.forEach((item, index) => {
      item.classList.toggle("active", index === activeIndex);
      item.classList.toggle("completed", index <= completedThrough && index !== activeIndex);
    });
  }

  function quadrantForAngle(angle) {
    const tau = Math.PI * 2;
    const a = ((angle % tau) + tau) % tau;
    if (a < Math.PI / 2) return "BR";
    if (a < Math.PI) return "BL";
    if (a < Math.PI * 1.5) return "UL";
    return "UR";
  }

  function updateAOIs(completedThrough, activeIndex = -1, orbitProgress = 0, startAngle = 0) {
    const boxes = [...document.querySelectorAll("[data-aoi]")];
    const order = ["BR", "BL", "UL", "UR"];

    boxes.forEach(box => {
      const index = Number(box.dataset.aoi);
      const complete = index <= completedThrough;
      const active = index === activeIndex;
      box.classList.toggle("completed", complete);
      box.classList.toggle("active", active && !complete);

      const quadrants = [...box.querySelectorAll(".aoi-quadrant")];
      if (complete) {
        box.classList.add("started");
        quadrants.forEach(q => q.classList.remove("revealed"));
        return;
      }
      if (!active) {
        box.classList.remove("started");
        quadrants.forEach(q => q.classList.remove("revealed"));
        return;
      }

      const startQuadrant = quadrantForAngle(startAngle + .0001);
      const startPosition = order.indexOf(startQuadrant);
      const revealCount = orbitProgress <= .02 ? 0 : Math.min(4, 1 + Math.floor(clamp01((orbitProgress - .02) / .98) * 4));
      box.classList.toggle("started", revealCount > 0);
      const revealed = new Set();
      for (let n = 0; n < revealCount; n++) revealed.add(order[(startPosition + n) % 4]);
      quadrants.forEach(q => q.classList.toggle("revealed", revealed.has(q.dataset.quadrant)));
    });
  }

  function renderTravel(phase, localT) {
    const aircraftLength = phase.fromAircraftLength + (phase.toAircraftLength - phase.fromAircraftLength) * localT;
    setAircraftOnRoute(aircraftLength);
    setRouteProgress(aircraftLength);
    updateWaypointState(phase.targetIndex, phase.completedThrough);
    updateAOIs(phase.completedThrough);
  }

  function renderScan(phase, localT) {
    const orbitProgress = clamp01(localT);
    const angle = phase.startAngle + Math.PI * 2 * phase.orbitTurns * orbitProgress;
    const radius = cfg.animation.orbitRadius ?? 36;
    const point = {
      x: phase.center.x + Math.cos(angle) * radius,
      y: phase.center.y + Math.sin(angle) * radius
    };
    const tangent = { x: -Math.sin(angle), y: Math.cos(angle) };
    setAircraft(point, tangent);
    setRouteProgress(phase.routeProgressLength);
    updateWaypointState(phase.targetIndex, phase.completedThrough);
    updateAOIs(phase.completedThrough, phase.targetIndex, orbitProgress, phase.startAngle);
  }

  function renderRejoin(phase, localT) {
    const traveled = phase.curveLength * clamp01(localT);
    const t = curveTAtDistance(phase, traveled);
    const point = cubicPoint(phase, t);
    const vector = cubicDerivative(phase, t);
    const routeFraction = phase.curveLength ? traveled / phase.curveLength : 1;
    const progressLength = phase.fromRouteLength + (phase.toRouteLength - phase.fromRouteLength) * routeFraction;
    setAircraft(point, vector);
    setRouteProgress(progressLength);
    updateWaypointState(phase.targetIndex, phase.completedThrough);
    updateAOIs(phase.completedThrough);
  }

  function renderEnd() {
    const lastIndex = waypointMeta.length - 1;
    setAircraftOnRoute(routeLength);
    setRouteProgress(routeLength);
    updateWaypointState(-1, lastIndex);
    updateAOIs(lastIndex);
  }

  function renderAtElapsed(elapsed) {
    if (!timeline.length) return;
    if (elapsed >= motionEndMs) {
      renderEnd();
      return;
    }
    const phase = timeline.find(item => elapsed >= item.start && elapsed < item.end) || timeline[0];
    const localT = clamp01((elapsed - phase.start) / Math.max(1, phase.end - phase.start));
    if (phase.type === "travel") renderTravel(phase, localT);
    else if (phase.type === "scan") renderScan(phase, localT);
    else if (phase.type === "rejoin") renderRejoin(phase, localT);
  }

  function animationFrame(now) {
    if (running && totalLoopMs > 1) {
      const elapsed = (now - loopStarted) % totalLoopMs;
      renderAtElapsed(elapsed);
    }
    requestAnimationFrame(animationFrame);
  }

  function throughputSample(timeMs) {
    const t = timeMs / 1000;
    const carrier = 5.3 * Math.sin(t * 1.12);
    const ripple = 2.7 * Math.sin(t * 3.15 + .8);
    const fine = 1.3 * Math.sin(t * 7.2 + 2.1);
    const burst = 3.0 * Math.pow(Math.max(0, Math.sin(t * .38 + 1.4)), 7);
    return Math.max(7, Math.min(41, 24 + carrier + ripple + fine - burst));
  }

  function animateSparkline(now) {
    if (!sparkPath) return;
    if (!sparkSamples.length) {
      for (let i = sparkCount - 1; i >= 0; i--) sparkSamples.push(throughputSample(now - i * sparkStepMs));
      sparkLastStep = now;
    }
    while (now - sparkLastStep >= sparkStepMs) {
      sparkLastStep += sparkStepMs;
      sparkSamples.push(throughputSample(sparkLastStep));
      if (sparkSamples.length > sparkCount) sparkSamples.shift();
    }
    const fractionalScroll = Math.max(0, Math.min(1, (now - sparkLastStep) / sparkStepMs));
    const dx = 170 / (sparkCount - 2);
    const points = sparkSamples.map((value, i) => `${(i * dx - dx * fractionalScroll).toFixed(2)},${value.toFixed(2)}`);
    sparkPath.setAttribute("d", `M ${points.join(" L ")}`);
    requestAnimationFrame(animateSparkline);
  }

  function restart() {
    loopStarted = performance.now();
    renderAtElapsed(0);
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
    installEffectsStylesheet();
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
