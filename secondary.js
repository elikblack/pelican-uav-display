(() => {
  const display = document.getElementById("secondary-display");
  const clock = document.getElementById("secondary-clock");

  function fitDisplay() {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 480);
    display.style.width = "1920px";
    display.style.height = "480px";
    display.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], {
      hour12:false, hour:"2-digit", minute:"2-digit", second:"2-digit"
    });
  }

  fitDisplay();
  updateClock();
  setInterval(updateClock, 1000);
  window.addEventListener("resize", fitDisplay);
})();
