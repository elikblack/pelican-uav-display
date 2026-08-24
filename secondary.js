(() => {
  const display = document.getElementById('secondary-display');
  const tabs = [...document.querySelectorAll('.secondary-tab')];

  function fitDisplay() {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 480);
    display.style.width = '1920px';
    display.style.height = '480px';
    display.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function buildAirspacePlot() {
    const radarModule = document.querySelector('.air-module');
    const radarBody = radarModule && radarModule.querySelector('.radar-module-body');
    const radarLegend = radarModule && radarModule.querySelector('.radar-legend');
    if (!radarModule || !radarBody || !radarLegend) return;

    if (!document.querySelector('link[href="secondary-air.css"]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'secondary-air.css';
      document.head.appendChild(stylesheet);
    }

    radarBody.innerHTML = `
      <svg class="airspace-plot" viewBox="0 0 390 320" role="img" aria-label="Local tactical airspace surveillance plot">
        <g class="airspace-geometry" aria-hidden="true">
          <path class="air-geo-line strong" d="M15 286A250 250 0 0 1 377 39"/>
          <path class="air-geo-line" d="M42 264A210 210 0 0 1 353 58"/>
          <path class="air-geo-line" d="M76 238A163 163 0 0 1 326 84"/>
          <path class="air-geo-zone" d="M48 80L151 43L246 69L337 55L365 145L313 246L187 279L73 231Z"/>
          <path class="air-geo-zone" d="M111 112L177 87L247 103L281 158L247 211L168 225L103 190Z"/>
          <path class="air-geo-dash" d="M16 271L356 68"/>
          <path class="air-geo-dash" d="M70 25L347 292"/>
          <path class="air-geo-dash" d="M8 173L380 173"/>
          <path class="air-geo-line" d="M201 4L188 63M388 202L328 184M29 112L91 131"/>

          <g transform="translate(87 90)">
            <circle class="air-geo-circle" r="19"/>
            <text class="air-geo-label" x="0" y="3" text-anchor="middle">21</text>
          </g>
          <g transform="translate(305 82)">
            <circle class="air-geo-circle" r="17"/>
            <text class="air-geo-label" x="0" y="3" text-anchor="middle">23</text>
          </g>
          <g transform="translate(300 237)">
            <circle class="air-geo-circle" r="21"/>
            <text class="air-geo-label" x="0" y="3" text-anchor="middle">24</text>
          </g>
          <g transform="translate(112 248)">
            <circle class="air-geo-circle" r="14"/>
            <text class="air-geo-label" x="0" y="3" text-anchor="middle">19</text>
          </g>

          <path class="air-waypoint" d="M188 151h16M196 143v16M54 205h12M60 199v12M332 135h12M338 129v12"/>
          <text class="air-zone-label" x="55" y="68">SECTOR 4A</text>
          <text class="air-zone-label" x="251" y="47">R-2307</text>
          <text class="air-zone-label" x="119" y="214">TAC CORRIDOR</text>
          <text class="air-zone-label" x="286" y="269">HOLD 24</text>
        </g>

        <g class="airspace-live-layer">
          <g class="air-contact-wrap drift-a" transform="translate(125 197)">
            <g class="air-contact contact-a">
              <path class="air-track" d="M-34 19L-8 4"/>
              <path class="air-symbol" d="M0 -5L5 4H-5Z"/>
              <circle class="air-dot" cx="0" cy="0" r="1.4"/>
              <text class="air-readout" x="9" y="-2">A17  176</text>
              <text class="air-readout dim" x="9" y="10">FL120  312KT</text>
            </g>
          </g>

          <g class="air-contact-wrap" transform="translate(169 225)">
            <g class="air-contact contact-b coast">
              <path class="air-track" d="M-17 -13L-5 -4"/>
              <rect class="air-symbol" x="-4" y="-4" width="8" height="8"/>
              <text class="air-readout" x="9" y="-1">N42</text>
              <text class="air-readout dim" x="9" y="10">095</text>
            </g>
          </g>

          <g class="air-contact-wrap drift-b" transform="translate(211 205)">
            <g class="air-contact contact-c tracked">
              <path class="air-track" d="M-39 27L-7 5"/>
              <path class="air-symbol" d="M0 -6L6 0L0 6L-6 0Z"/>
              <rect class="track-box" x="-11" y="-11" width="22" height="22"/>
              <text class="air-readout" x="15" y="-3">T03  144</text>
              <text class="air-readout dim" x="15" y="9">FL080  268KT</text>
              <text class="air-readout dim" x="15" y="20">TRK 247</text>
            </g>
          </g>

          <g class="air-contact-wrap" transform="translate(250 104)">
            <g class="air-contact contact-d">
              <path class="air-track" d="M-25 18L-6 4"/>
              <path class="air-symbol" d="M0 -5L5 4H-5Z"/>
              <text class="air-readout" x="9" y="-2">A08  312</text>
              <text class="air-readout dim" x="9" y="10">FL260</text>
            </g>
          </g>

          <g class="air-contact-wrap" transform="translate(187 78)">
            <g class="air-contact contact-e coast">
              <path class="air-track" d="M8 15L2 5"/>
              <rect class="air-symbol" x="-4" y="-4" width="8" height="8"/>
              <text class="air-readout" x="9" y="-1">N31</text>
              <text class="air-readout dim" x="9" y="10">223</text>
            </g>
          </g>

          <g class="air-contact-wrap" transform="translate(318 164)">
            <g class="air-contact contact-f tracked">
              <path class="air-track" d="M-30 -6L-8 -2"/>
              <path class="air-symbol" d="M0 -6L6 0L0 6L-6 0Z"/>
              <rect class="track-box" x="-10" y="-10" width="20" height="20"/>
              <text class="air-readout" x="14" y="-2">T11  091</text>
              <text class="air-readout dim" x="14" y="10">FL055  191KT</text>
            </g>
          </g>

          <g class="air-contact-wrap" transform="translate(74 279)">
            <g class="air-contact contact-g coast">
              <path class="air-track" d="M20 -13L5 -3"/>
              <circle class="air-dot" r="2.2"/>
              <text class="air-readout" x="8" y="-1">U06</text>
              <text class="air-readout dim" x="8" y="10">067</text>
            </g>
          </g>
        </g>
      </svg>

      <div class="radar-side-data">
        <div><span>MODE</span><strong>AIRSPACE</strong></div>
        <div><span>RANGE</span><strong>120 NM</strong></div>
        <div><span>FILTER</span><strong>FL025+</strong></div>
        <div><span>TRACKS</span><strong>07 ACTIVE</strong></div>
        <div class="air-alert"><span>ALERTS</span><strong>01 CORRIDOR</strong></div>
      </div>
    `;

    radarLegend.innerHTML = `
      <span class="tracked-key">◇ TRACKED</span>
      <span class="friendly">▲ CORRELATED</span>
      <span class="neutral">□ COAST</span>
      <span class="unknown">● UNCORR</span>
    `;
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

  buildAirspacePlot();
  curveWeatherHeadingScale();
  startWeatherFrameAnimation();
  fitDisplay();
  updateTelemetry();
  tickUptime();

  setInterval(updateTelemetry, 1100);
  setInterval(tickUptime, 1000);
  window.addEventListener('resize', fitDisplay);
})();
