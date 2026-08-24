(() => {
  const cfg = window.DISPLAY_CONFIG;
  if (!cfg) throw new Error("DISPLAY_CONFIG is missing");

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
      aoiLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
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

  function ensureThroughputGradient() {
    if (!sparkPath) return;
    let gradient = document.getElementById("throughput-gradient");
    if (!gradient) {
      gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
      gradient.id = "throughput-gradient";
      gradient.setAttribute("x1", "0%");
      gradient.setAttribute("y1", "0%");
      gradient.setAttribute("x2", "100%");
      gradient.setAttribute("y2", "0%");
      const stops = [
        ["0%", cfg.theme.throughputOrange ?? "#ed8b2f"],
        ["58%", "#f0ad39"],
        ["100%", cfg.theme.throughputYellow ?? "#f2d35e"]
      ];
      stops.forEach(([offset, color]) => {
        const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop.setAttribute("offset", offset);
        stop.style.stopColor = color;
        gradient.appendChild(stop);
      });
      const sparkSvg = sparkPath.ownerSVGElement;
      let sparkDefs = sparkSvg.querySelector("defs");
      if (!sparkDefs) {
        sparkDefs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        sparkSvg.insertBefore(sparkDefs, sparkSvg.firstChild);
      }
      sparkDefs.appendChild(gradient);
    }
    sparkPath.style.stroke = "url(#throughput-gradient)";
  }

  function installEffectsStylesheet() {
    if (document.querySelector('link[data-effects-css]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "effects.css";
    link.dataset.effectsCss = "true";
    document.head.appendChild(link);
  }

  function buildAOIMarkup(point, index) {
    const half = (cfg.animation.aoiSize ?? 120) / 2;
    const cx = point.x;
    const cy = point.y;
    const left = cx - half;
    const right = cx + half;
    const top = cy - half;
    const bottom = cy + half;

    return `
      <g class="aoi-box" data-aoi="${index}">
        <path class="aoi-quadrant" data-quadrant="UR" d="M ${cx} ${top} H ${right} V ${cy}"></path>
        <path class="aoi-quadrant" data-quadrant="BR" d="M ${right} ${cy} V ${bottom} H ${cx}"></path>
        <path class="aoi-quadrant" data-quadrant="BL" d="M ${cx} ${bottom} H ${left} V ${cy}"></path>
        <path class="aoi-quadrant" data-quadrant="UL" d="M ${left} ${cy} V ${top} H ${cx}"></path>
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

  function buildTimeline() {
    const radius = cfg.animation.orbitRadius ?? 36;
    const travelMs = cfg.animation.aircraftTravelMs ?? 72000;
    const scanMs = cfg.animation.scanMs ?? 3200;
    const endPauseMs = cfg.animation.endPauseMs ?? 2600;

    timeline = [];
    let cursor = 0;
    let currentAircraftLength = 0;
    let currentProgressLength = 0;

    for (let index = 1; index < waypointMeta.length; index++) {
      const wp = waypointMeta[index];
      const approachLength = Math.max(currentAircraftLength, wp.length - radius);
      const travelDistance = Math.max(0, approachLength - currentAircraftLength);
      const travelDuration = Math.max(1, travelMs * travelDistance / routeLength);

      timeline.push({
        type: "travel",
        start: cursor,
        end: cursor + travelDuration,
        fromAircraftLength: currentAircraftLength,
        toAircraftLength: approachLength,
        fromProgressLength: currentProgressLength,
        toProgressLength: wp.length,
        targetIndex: index,
        completedThrough: index - 1
      });
      cursor += travelDuration;

      const entry = routeBase.getPointAtLength(approachLength);
      const startAngle = Math.atan2(entry.y - wp.y, entry.x - wp.x);

      timeline.push({
        type: "scan",
        start: cursor,
        end: cursor + scanMs,
        routeProgressLength: wp.length,
        targetIndex: index,
        completedThrough: index - 1,
        center: { x: wp.x, y: wp.y },
        startAngle,
        entry: { x: entry.x, y: entry.y }
      });
      cursor += scanMs;
      currentProgressLength = wp.length;

      if (index < waypointMeta.length - 1) {
        const nextWp = waypointMeta[index + 1];
        const exitLength = Math.min(nextWp.length, wp.length + radius);
        const exit = routeBase.getPointAtLength(exitLength);
        const outgoing = normalize(exit.x - wp.x, exit.y - wp.y);
        const tangent = { x: -Math.sin(startAngle), y: Math.cos(startAngle) };
        const c1 = {
          x: entry.x + tangent.x * radius * 0.95,
          y: entry.y + tangent.y * radius * 0.95
        };
        const c2 = {
          x: exit.x - outgoing.x * radius * 0.72,
          y: exit.y - outgoing.y * radius * 0.72
        };
        const rejoinDistance = Math.max(1, exitLength - approachLength);
        const rejoinDuration = Math.max(1500, travelMs * rejoinDistance / routeLength);

        timeline.push({
          type: "rejoin",
          start: cursor,
          end: cursor + rejoinDuration,
          fromProgressLength: wp.length,
          toProgressLength: exitLength,
          targetIndex: index + 1,
          completedThrough: index,
          p0: { x: entry.x, y: entry.y },
          p1: c1,
          p2: c2,
          p3: { x: exit.x, y: exit.y }
        });
        cursor += rejoinDuration;
        currentAircraftLength = exitLength;
        currentProgressLength = exitLength;
      } else {
        currentAircraftLength = approachLength;
      }
    }

    motionEndMs = cursor;
    totalLoopMs = motionEndMs + endPauseMs;
  }

  function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function easeInOut(value) {
    const t = clamp01(value);
    return .5 - .5 * Math.cos(Math.PI * t);
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

  function setAircraft(point, vector) {
    const angle = Math.atan2(vector.y, vector.x) * 180 / Math.PI + 90;
    aircraft.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
  }

  function setAircraftOnRoute(length) {
    const p = routeBase.getPointAtLength(Math.max(0, Math.min(routeLength, length)));
    const delta = 4;
    const before = routeBase.getPointAtLength(Math.max(0, length - delta));
    const after = routeBase.getPointAtLength(Math.min(routeLength, length + delta));
    setAircraft(p, { x: after.x - before.x, y: after.y - before.y });
  }

  function setRouteProgress(length) {
    const clamped = Math.max(0, Math.min(routeLength, length));
    routeProgress.style.strokeDashoffset = `${routeLength - clamped}`;
    const progress = clamped / routeLength;

    const ease = progress * progress * (3 - 2 * progress);
    const x = cfg.map.startX + (cfg.map.endX - cfg.map.startX) * ease;
    const y = cfg.map.startY + (cfg.map.endY - cfg.map.startY) * ease;
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
    const normalizedAngle = ((angle % tau) + tau) % tau;
    if (normalizedAngle < Math.PI / 2) return "BR";
    if (normalizedAngle < Math.PI) return "BL";
    if (normalizedAngle < Math.PI * 1.5) return "UL";
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
        quadrants.forEach(q => q.classList.remove("revealed"));
        return;
      }
      if (!active) {
        quadrants.forEach(q => q.classList.remove("revealed"));
        return;
      }

      const startQuadrant = quadrantForAngle(startAngle + 0.0001);
      const startPosition = order.indexOf(startQuadrant);
      const delayed = clamp01((orbitProgress - 0.035) / 0.965);
      const revealCount = orbitProgress <= 0.035 ? 0 : Math.min(4, 1 + Math.floor(delayed * 4));
      const revealedNames = new Set();
      for (let n = 0; n < revealCount; n++) {
        revealedNames.add(order[(startPosition + n) % 4]);
      }
      quadrants.forEach(q => q.classList.toggle("revealed", revealedNames.has(q.dataset.quadrant)));
    });
  }

  function renderTravel(phase, localT) {
    const eased = easeInOut(localT);
    const aircraftLength = phase.fromAircraftLength + (phase.toAircraftLength - phase.fromAircraftLength) * eased;
    const progressLength = phase.fromProgressLength + (phase.toProgressLength - phase.fromProgressLength) * eased;
    setAircraftOnRoute(aircraftLength);
    setRouteProgress(progressLength);
    updateWaypointState(phase.targetIndex, phase.completedThrough);
    updateAOIs(phase.completedThrough);
  }

  function renderScan(phase, localT) {
    const orbitT = easeInOut(localT);
    const angle = phase.startAngle + Math.PI * 2 * orbitT;
    const radius = cfg.animation.orbitRadius ?? 36;
    const point = {
      x: phase.center.x + Math.cos(angle) * radius,
      y: phase.center.y + Math.sin(angle) * radius
    };
    const tangent = { x: -Math.sin(angle), y: Math.cos(angle) };

    setAircraft(point, tangent);
    setRouteProgress(phase.routeProgressLength);
    updateWaypointState(phase.targetIndex, phase.completedThrough);
    updateAOIs(phase.completedThrough, phase.targetIndex, orbitT, phase.startAngle);
  }

  function renderRejoin(phase, localT) {
    const eased = easeInOut(localT);
    const point = cubicPoint(phase, eased);
    const vector = cubicDerivative(phase, eased);
    const progressLength = phase.fromProgressLength + (phase.toProgressLength - phase.fromProgressLength) * eased;

    setAircraft(point, vector);
    setRouteProgress(progressLength);
    updateWaypointState(phase.targetIndex, phase.completedThrough);
    updateAOIs(phase.completedThrough);
  }

  function renderEnd() {
    const lastIndex = waypointMeta.length - 1;
    const lastWp = waypointMeta[lastIndex];
    const radius = cfg.animation.orbitRadius ?? 36;
    const previousWp = waypointMeta[lastIndex - 1] || lastWp;
    const approach = normalize(previousWp.x - lastWp.x, previousWp.y - lastWp.y);
    const point = { x: lastWp.x + approach.x * radius, y: lastWp.y + approach.y * radius };
    const angle = Math.atan2(point.y - lastWp.y, point.x - lastWp.x);
    const tangent = { x: -Math.sin(angle), y: Math.cos(angle) };

    setAircraft(point, tangent);
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
    const ripple = 2.7 * Math.sin(t * 3.15 + 0.8);
    const fine = 1.3 * Math.sin(t * 7.2 + 2.1);
    const burst = 3.0 * Math.pow(Math.max(0, Math.sin(t * 0.38 + 1.4)), 7);
    return Math.max(7, Math.min(41, 24 + carrier + ripple + fine - burst));
  }

  function animateSparkline(now) {
    if (!sparkPath) return;

    if (!sparkSamples.length) {
      for (let i = sparkCount - 1; i >= 0; i--) {
        sparkSamples.push(throughputSample(now - i * sparkStepMs));
      }
      sparkLastStep = now;
    }

    while (now - sparkLastStep >= sparkStepMs) {
      sparkLastStep += sparkStepMs;
      sparkSamples.push(throughputSample(sparkLastStep));
      if (sparkSamples.length > sparkCount) sparkSamples.shift();
    }

    const fractionalScroll = Math.max(0, Math.min(1, (now - sparkLastStep) / sparkStepMs));
    const dx = 170 / (sparkCount - 2);
    const points = sparkSamples.map((value, i) => {
      const x = i * dx - dx * fractionalScroll;
      return `${x.toFixed(2)},${value.toFixed(2)}`;
    });

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
