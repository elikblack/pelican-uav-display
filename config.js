window.DISPLAY_CONFIG = {
  canvas: { width: 1920, height: 1080 },

  theme: {
    background: "#020502",
    panel: "rgba(3, 12, 7, 0.92)",
    panelSoft: "rgba(5, 18, 10, 0.78)",
    green: "#78ff88",
    greenDim: "#2d8f4c",
    cyan: "#61d8e6",
    amber: "#e2b95a",
    red: "#ef5d59",
    text: "#bde8c5",
    muted: "#6f9478"
  },

  labels: {
    title: "MISSION SYSTEM",
    mode: "MISSION SETUP",
    area: "AREA ALPHA",
    system: "SYSTEM READY",
    link: "LINK GOOD",
    gps: "GPS LOCK"
  },

  panels: {
    platform: {
      title: "PLATFORM STATUS",
      rows: [
        ["AIRFRAME", "READY"],
        ["NAV", "ALIGNED"],
        ["COMMS", "GOOD"],
        ["POWER", "NOMINAL"]
      ]
    },
    sensors: {
      title: "SENSORS",
      rows: [
        ["EO/IR", "STANDBY"],
        ["RANGE", "READY"],
        ["RECORDER", "READY"]
      ]
    },
    payload: {
      title: "PAYLOAD",
      rows: [
        ["GIMBAL", "PARKED"],
        ["ZOOM", "1.0×"],
        ["MODE", "IDLE"]
      ]
    },
    datalink: {
      title: "DATALINK",
      rows: [
        ["PRIMARY", "GOOD"],
        ["BACKUP", "STANDBY"]
      ]
    }
  },

  map: {
    image: "assets/terrain.jpg",
    worldWidth: 2700,
    worldHeight: 1650,
    startX: -360,
    startY: -250,
    endX: -690,
    endY: -390,
    followStrength: 0.42
  },

  animation: {
    loopMs: 18000,
    pauseAtEndMs: 1200,
    waypointPulseMs: 650,
    routeLead: 0.06
  },

  route: {
    waypoints: [
      { id: "WP1", label: "STAGING", x: 430, y: 1190 },
      { id: "WP2", label: "RIDGE", x: 780, y: 1040 },
      { id: "WP3", label: "CHECK", x: 1060, y: 830 },
      { id: "WP4", label: "SURVEY", x: 1450, y: 690 },
      { id: "WP5", label: "EXIT", x: 1880, y: 520 }
    ]
  }
};
