window.DISPLAY_CONFIG = {
  canvas: { width: 1920, height: 1080 },

  theme: {
    background: "#010301",
    panel: "rgba(2, 8, 4, 0.97)",
    panelSoft: "rgba(4, 13, 7, 0.88)",
    green: "#77c95b",
    greenDim: "#345f30",
    cyan: "#63d2d8",
    amber: "#d7aa35",
    red: "#d95750",
    text: "#b3caaa",
    muted: "#70866a"
  },

  labels: {
    title: "GROUND CONTROL",
    subtitle: "MISSION PLANNING",
    system: "READY",
    link: "GOOD",
    gps: "LOCK",
    mode: "SETUP",
    area: "ALPHA",
    operator: "OPERATOR 01"
  },

  mission: {
    plan: "ALPHA_01",
    type: "RECONNAISSANCE",
    launch: "MANUAL",
    start: "STAGING AREA",
    duration: "--:--",
    state: "NOT STARTED"
  },

  panels: {
    platform: {
      title: "PLATFORM STATUS",
      rows: [
        ["AIRFRAME", "READY"],
        ["PROPULSION", "NOMINAL"],
        ["POWER", "NOMINAL"],
        ["NAVIGATION", "READY"],
        ["COMMS", "READY"],
        ["PAYLOAD SYS", "STANDBY"],
        ["DATA RECORDER", "READY"]
      ]
    },
    sensors: {
      title: "SENSORS",
      rows: [
        ["EO / IR", "STANDBY"],
        ["SAR", "STANDBY"],
        ["MTI", "STANDBY"],
        ["SIGINT", "OFFLINE", "muted"],
        ["LIDAR", "N/A", "muted"]
      ]
    },
    payload: {
      title: "PAYLOAD",
      rows: [
        ["GIMBAL", "PARKED"],
        ["ZOOM", "1.0×", "muted"],
        ["RECORDER", "READY"],
        ["MODE", "IDLE"]
      ]
    },
    datalink: { title: "DATALINK / TELEMETRY", rows: [] }
  },

  map: {
    image: "assets/terrain.svg",
    worldWidth: 1700,
    worldHeight: 1342,
    startX: -250,
    startY: -100,
    endX: -430,
    endY: -225
  },

  animation: {
    loopMs: 18000,
    pauseAtEndMs: 1400,
    waypointPulseMs: 650
  },

  route: {
    waypoints: [
      { id: "STG", label: "STAGING", x: 316, y: 254 },
      { id: "WPT 1", label: "", x: 738, y: 254 },
      { id: "WPT 2", label: "", x: 931, y: 477 },
      { id: "WPT 3", label: "", x: 803, y: 719 },
      { id: "WPT 4", label: "", x: 727, y: 951 }
    ]
  }
};
