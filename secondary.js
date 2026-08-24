(() => {
  const display = document.getElementById('secondary-display');
  const tabs = [...document.querySelectorAll('.secondary-tab')];

  function fitDisplay() {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 480);
    display.style.width = '1920px';
    display.style.height = '480px';
    display.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function curveWeatherHeadingScale() {
    const scale = document.querySelector('.wx-heading-scale');
    if (!scale) return;

    scale.innerHTML = `
      <path d="M54 55 Q310 1 566 55" />

      <path d="M77 48l-2 11M143 34l-1 11M209 24v11M276 18v15M344 18v15M411 24v11M477 34l1 11M543 48l2 11" />

      <text x="77" y="40">30</text>
      <text x="143" y="26">31</text>
      <text x="209" y="16">32</text>
      <text x="276" y="10">33</text>
      <text x="344" y="10">34</text>
      <text x="411" y="16">35</text>
      <text x="477" y="26">36</text>
      <text x="543" y="40">37</text>

      <path class="wx-heading-bug" d="M310 4v30M301 12h18" />
    `;
  }

  function startWeatherFrameAnimation() {
    const weatherBody = document.querySelector('.weather-sector-body');
    const weatherSvg = weatherBody && weatherBody.querySelector('.weather-sector');
    if (!weatherBody || !weatherSvg) return;

    const frames = Array.from({ length: 10 }, (_, index) =>
      `assets/weather-radar-frame-${String(index + 1).padStart(2, '0')}.png`
    );

    frames.forEach(src => {
      const preload = new Image();
      preload.src = src;
    });

    const frame = document.createElement('img');
    frame.className = 'weather-frame-layer';
    frame.alt = '';
    frame.setAttribute('aria-hidden', 'true');
    frame.src = frames[0];
    weatherBody.insertBefore(frame, weatherSvg);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frameIndex = 0;
    setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      frame.src = frames[frameIndex];
    }, 1320);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  const fields = {
    tx: document.getElementById('tx-power'),
    consumption: document.getElementById('power-consumption'),
    voltage: document.getElementById('system-voltage'),
    thermal: document.getElementById('thermal'),
    margin: document.getElementById('link-margin'),
    battery: document.getElementById('battery'),
    rate: document.getElementById('data-rate'),
    quality: document.getElementById('link-quality'),
    trend: document.getElementById('trend-value'),
    uptime: document.getElementById('uptime'),
    txMeter: document.getElementById('tx-meter'),
    powerMeter: document.getElementById('power-meter'),
    thermalMeter: document.getElementById('thermal-meter'),
    linkMeter: document.getElementById('link-meter'),
    trace: document.getElementById('power-trace')
  };

  let uptimeSeconds = 12 * 3600 + 47 * 60 + 11;
  let battery = 92;
  let traceValues = Array.from({ length: 26 }, (_, i) => 224 + Math.sin(i * .7) * 7 + Math.random() * 5);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function jitter(base, amount) {
    return base + (Math.random() - .5) * amount;
  }

  function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  function updateTrace(latest) {
    traceValues.push(latest);
    traceValues.shift();
    const min = 210;
    const max = 250;
    const width = 300;
    const height = 74;
    const points = traceValues.map((value, i) => {
      const x = (i / (traceValues.length - 1)) * width;
      const y = height - ((clamp(value, min, max) - min) / (max - min)) * (height - 10) - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    fields.trace.setAttribute('points', points);
  }

  function updateTelemetry() {
    const tx = jitter(25, 1.7);
    const consumption = jitter(232, 8);
    const voltage = jitter(27.6, .35);
    const thermal = jitter(38, 1.8);
    const margin = jitter(18.2, 1.4);
    const rate = jitter(8.2, .7);
    const quality = clamp(Math.round(jitter(92, 5)), 84, 98);

    fields.tx.textContent = `${tx.toFixed(1)} W`;
    fields.consumption.textContent = `${Math.round(consumption)} W`;
    fields.voltage.textContent = `${voltage.toFixed(1)} V`;
    fields.thermal.textContent = `${Math.round(thermal)}°C`;
    fields.margin.textContent = `+${margin.toFixed(1)} dB`;
    fields.battery.textContent = `${battery}%`;
    fields.rate.textContent = `${rate.toFixed(1)} Mbps`;
    fields.quality.textContent = `${quality}%`;
    fields.trend.textContent = `${Math.round(consumption)} W`;

    fields.txMeter.style.width = `${clamp(tx / 40 * 100, 35, 90)}%`;
    fields.powerMeter.style.width = `${clamp(consumption / 340 * 100, 40, 90)}%`;
    fields.thermalMeter.style.width = `${clamp(thermal / 70 * 100, 35, 80)}%`;
    fields.linkMeter.style.width = `${clamp((margin + 5) / 30 * 100, 35, 96)}%`;

    updateTrace(consumption);
  }

  function tickUptime() {
    uptimeSeconds += 1;
    fields.uptime.textContent = formatUptime(uptimeSeconds);
  }

  curveWeatherHeadingScale();
  startWeatherFrameAnimation();
  fitDisplay();
  updateTelemetry();
  tickUptime();

  setInterval(updateTelemetry, 1100);
  setInterval(tickUptime, 1000);
  window.addEventListener('resize', fitDisplay);
})();
