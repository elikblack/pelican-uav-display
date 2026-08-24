(() => {
  const cfg = window.DISPLAY_CONFIG;
  const mapPanel = document.querySelector('.map-panel');
  const mapWorld = document.getElementById('map-world');
  const aircraft = document.getElementById('aircraft');
  if (!cfg || !mapPanel || !mapWorld || !aircraft) return;

  const NS = 'http://www.w3.org/2000/svg';
  const w = cfg.map.worldWidth;
  const h = cfg.map.worldHeight;
  const spacingX = 110;
  const spacingY = 110;
  const startX = 60;
  const startY = 38;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'grid.css';
  link.dataset.gridCss = 'true';
  document.head.appendChild(link);

  const overlay = document.createElement('div');
  overlay.className = 'coord-grid-overlay';

  const world = document.createElement('div');
  world.className = 'coord-grid-world';
  world.style.width = `${w}px`;
  world.style.height = `${h}px`;

  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('coord-grid-svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);

  const lineLayer = document.createElementNS(NS, 'g');
  const labelLayer = document.createElementNS(NS, 'g');
  const verticalLines = [];
  const horizontalLines = [];

  function addLine(x1, y1, x2, y2, major = false, axis = '', index = -1) {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', `coord-grid-line${major ? ' major' : ''}`);
    if (axis) line.dataset.axis = axis;
    if (index >= 0) line.dataset.gridIndex = String(index);
    lineLayer.appendChild(line);
    return line;
  }

  function addLabel(text, x, y, secondary = false, anchor = 'start') {
    const label = document.createElementNS(NS, 'text');
    label.textContent = text;
    label.setAttribute('x', x);
    label.setAttribute('y', y);
    label.setAttribute('text-anchor', anchor);
    label.setAttribute('class', `coord-grid-ref${secondary ? ' secondary' : ''}`);
    labelLayer.appendChild(label);
  }

  let col = 0;
  for (let x = startX; x <= w; x += spacingX, col++) {
    verticalLines.push(addLine(x, 0, x, h, col % 5 === 0, 'x', col));
    const ref = String((88 + col) % 100).padStart(2, '0');
    [112, 500, 888].forEach((y, i) => {
      if (y < h - 12) addLabel(ref, x + 4, y, i !== 1);
    });
  }

  let row = 0;
  for (let y = startY; y <= h; y += spacingY, row++) {
    horizontalLines.push(addLine(0, y, w, y, row % 5 === 0, 'y', row));
    const ref = String((95 + row) % 100).padStart(2, '0');
    [145, 820, 1495, 2170].forEach((x, i) => {
      if (x < w - 10) addLabel(ref, x, y - 4, i !== 1, 'middle');
    });
  }

  svg.appendChild(lineLayer);
  svg.appendChild(labelLayer);
  world.appendChild(svg);
  overlay.appendChild(world);

  const firstUiOverlay = mapPanel.querySelector('.map-overlay, .route-progress-readout');
  mapPanel.insertBefore(overlay, firstUiOverlay || null);

  let lastMapTransform = '';
  function syncTransform() {
    const nextTransform = mapWorld.style.transform || 'translate3d(0,0,0)';
    if (nextTransform === lastMapTransform) return;
    lastMapTransform = nextTransform;
    world.style.transform = nextTransform;
  }

  let activeCellKey = '';

  function clearTracking() {
    verticalLines.forEach(line => line.classList.remove('tracking'));
    horizontalLines.forEach(line => line.classList.remove('tracking'));
  }

  function aircraftPosition() {
    const transformList = aircraft.transform && aircraft.transform.baseVal;
    if (transformList && transformList.numberOfItems > 0) {
      const firstTransform = transformList.getItem(0);
      return { x: firstTransform.matrix.e, y: firstTransform.matrix.f };
    }

    // Fallback for browsers that do not expose the SVG transform list as expected.
    const transform = aircraft.getAttribute('transform') || '';
    const match = transform.match(/translate\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(-?\d+(?:\.\d+)?)\s*\)/);
    if (!match) return null;
    return { x: Number(match[1]), y: Number(match[2]) };
  }

  function updateTrackingCell() {
    const position = aircraftPosition();
    if (!position) return;

    const colIndex = Math.floor((position.x - startX) / spacingX);
    const rowIndex = Math.floor((position.y - startY) / spacingY);

    if (colIndex < 0 || rowIndex < 0 || colIndex + 1 >= verticalLines.length || rowIndex + 1 >= horizontalLines.length) {
      if (activeCellKey) {
        activeCellKey = '';
        clearTracking();
      }
      return;
    }

    const nextKey = `${colIndex}:${rowIndex}`;
    if (nextKey === activeCellKey) return;
    activeCellKey = nextKey;

    clearTracking();
    verticalLines[colIndex].classList.add('tracking');
    verticalLines[colIndex + 1].classList.add('tracking');
    horizontalLines[rowIndex].classList.add('tracking');
    horizontalLines[rowIndex + 1].classList.add('tracking');
  }

  function frameSync() {
    syncTransform();
    updateTrackingCell();
    requestAnimationFrame(frameSync);
  }

  frameSync();
})();
