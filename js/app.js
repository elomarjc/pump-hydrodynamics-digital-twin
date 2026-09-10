import { PumpHydraulics } from './engine/pump-hydraulics.js';
import { MCSAAnalyzer } from './engine/mcsa-analyzer.js';
import { WaterHammerEngine } from './engine/water-hammer.js';

import { HQCurveScope } from './ui/hq-curve-scope.js';
import { MCSAFFTScope } from './ui/mcsa-fft-scope.js';
import { SurgeScope } from './ui/surge-scope.js';
import { HydraulicSchematic } from './ui/hydraulic-schematic.js';

class PumpDigitalTwinApp {
    constructor() {
        this.pump = new PumpHydraulics();
        this.mcsa = new MCSAAnalyzer();
        this.hammer = new WaterHammerEngine();

        this.hqScope = new HQCurveScope('hqCanvas');
        this.mcsaScope = new MCSAFFTScope('mcsaCanvas');
        this.surgeScope = new SurgeScope('surgeCanvas');
        this.schematic = new HydraulicSchematic('schematicCanvas');

        this.initUI();
        this.startLoop();
    }

    initUI() {
        // Speed Slider
        const speedSlider = document.getElementById('speedSlider');
        const speedVal = document.getElementById('speedVal');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                let rpm = parseFloat(e.target.value);
                this.pump.setSpeed(rpm);
                if (speedVal) speedVal.innerText = `${rpm.toFixed(0)} RPM`;
            });
        }

        // Suction Pressure Slider
        const suctionSlider = document.getElementById('suctionSlider');
        const suctionVal = document.getElementById('suctionVal');
        if (suctionSlider) {
            suctionSlider.addEventListener('input', (e) => {
                let bar = parseFloat(e.target.value);
                this.pump.setSuctionPressure(bar);
                if (suctionVal) suctionVal.innerText = `${bar.toFixed(1)} Bar`;
            });
        }

        // Valve Opening Slider
        const valveSlider = document.getElementById('valveSlider');
        const valveVal = document.getElementById('valveVal');
        if (valveSlider) {
            valveSlider.addEventListener('input', (e) => {
                let percent = parseFloat(e.target.value);
                this.pump.setValveOpening(percent);
                if (valveVal) valveVal.innerText = `${percent.toFixed(0)}%`;
            });
        }

        // Emergency Valve Trip (Unprotected Shockwave)
        const tripBtn = document.getElementById('tripBtn');
        if (tripBtn) {
            tripBtn.addEventListener('click', () => {
                this.hammer.triggerValveClosure(this.pump.flowQ, false);
            });
        }

        // Intelligent VFD Soft Deceleration (Protected)
        const softRampBtn = document.getElementById('softRampBtn');
        if (softRampBtn) {
            softRampBtn.addEventListener('click', () => {
                this.hammer.triggerValveClosure(this.pump.flowQ, true);
            });
        }
    }

    startLoop() {
        let lastTime = performance.now();

        const loop = (time) => {
            let dt = Math.min(0.05, (time - lastTime) / 1000.0);
            lastTime = time;

            // 1. Hydraulic physics update
            this.pump.update();

            // 2. MCSA current spectral analysis
            this.mcsa.update(this.pump.speedRpm, this.pump.isCavitating, this.pump.cavitationSeverity);

            // 3. Water hammer step
            this.hammer.step(dt);

            // 4. Render UI Scopes
            this.hqScope.render(this.pump);
            this.mcsaScope.render(this.mcsa);
            this.surgeScope.render(this.hammer);
            this.schematic.render(this.pump);

            this.updateTelemetryDOM();

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    updateTelemetryDOM() {
        let flowElem = document.getElementById('telemFlow');
        if (flowElem) flowElem.innerText = `${this.pump.flowQ.toFixed(1)} m³/h`;

        let headElem = document.getElementById('telemHead');
        if (headElem) headElem.innerText = `${this.pump.headH.toFixed(1)} m`;

        let powerElem = document.getElementById('telemPower');
        if (powerElem) powerElem.innerText = `${this.pump.electricalPowerKw.toFixed(2)} kW`;

        let cavElem = document.getElementById('telemCav');
        if (cavElem) {
            if (this.pump.isCavitating) {
                cavElem.innerText = 'CAVITATION ACTIVE (NPSHa < NPSHr)';
                cavElem.className = 'status-pill danger';
            } else {
                cavElem.innerText = 'OPTIMAL NPSH MARGIN';
                cavElem.className = 'status-pill success';
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new PumpDigitalTwinApp();
});


// ==========================================
// MOBILE FLOATING HUD & DRAWER CONTROLLER
// ==========================================
(function initMobileFloatingHUD() {
  const drawer = document.getElementById('telemetryDrawer');
  const backdrop = document.getElementById('telemetryBackdrop');
  const btnSettings = document.getElementById('btn-hud-settings');
  const btnTrigger = document.getElementById('btn-trigger-controls-drawer');
  const btnClose = document.getElementById('btn-close-telemetry');
  const btnFullscreen = document.getElementById('btn-hud-fullscreen');
  const btnMenu = document.getElementById('btn-hud-menu');

  function openDrawer() {
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }

  if (btnSettings) btnSettings.addEventListener('click', openDrawer);
  if (btnTrigger) btnTrigger.addEventListener('click', openDrawer);
  if (btnClose) btnClose.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  if (btnMenu) {
    btnMenu.addEventListener('click', () => {
      const guideBtn = document.getElementById('guideBtn') || document.getElementById('btnTourLauncher');
      if (guideBtn) guideBtn.click();
    });
  }

  // Cross-platform Universal Fullscreen
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {
            document.body.classList.toggle('immersive-fullscreen');
          });
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        } else {
          document.body.classList.toggle('immersive-fullscreen');
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
        document.body.classList.remove('immersive-fullscreen');
      }
    });
  }

  // Left Rail: VFD Impeller Speed (1500 to 3400 RPM)
  const vSpeed = document.getElementById('slider-speed-vertical');
  const dSpeed = document.getElementById('speedSlider');
  const valSpeed = document.getElementById('hud-speed-val');
  const fillSpeed = document.getElementById('rail-fill-speed');

  function updateSpeedHUD(val) {
    const num = parseFloat(val);
    if (valSpeed) valSpeed.textContent = Math.round(num) + ' RPM';
    if (fillSpeed) {
      // Range is 1500 to 3400 (span = 1900)
      const pct = Math.max(0, Math.min(100, ((num - 1500) / 1900) * 100));
      fillSpeed.style.height = pct + '%';
    }
    if (vSpeed && Math.abs(parseFloat(vSpeed.value) - num) > 1) {
      vSpeed.value = num;
    }
  }

  if (vSpeed && dSpeed) {
    vSpeed.min = dSpeed.min || '1500';
    vSpeed.max = dSpeed.max || '3400';
    vSpeed.step = dSpeed.step || '50';
    vSpeed.value = dSpeed.value;
    updateSpeedHUD(dSpeed.value);

    vSpeed.addEventListener('input', (e) => {
      dSpeed.value = e.target.value;
      dSpeed.dispatchEvent(new Event('input', { bubbles: true }));
      updateSpeedHUD(e.target.value);
    });

    dSpeed.addEventListener('input', (e) => {
      updateSpeedHUD(e.target.value);
    });
  }

  // Right Rail: Discharge Valve Opening (20 to 100%)
  const vValve = document.getElementById('slider-valve-vertical');
  const dValve = document.getElementById('valveSlider');
  const valValve = document.getElementById('hud-valve-val');
  const fillValve = document.getElementById('rail-fill-valve');

  function updateValveHUD(val) {
    const num = parseFloat(val);
    if (valValve) valValve.textContent = Math.round(num) + '%';
    if (fillValve) {
      // Range is 20 to 100 (span = 80)
      const pct = Math.max(0, Math.min(100, ((num - 20) / 80) * 100));
      fillValve.style.height = pct + '%';
    }
    if (vValve && Math.abs(parseFloat(vValve.value) - num) > 0.5) {
      vValve.value = num;
    }
  }

  if (vValve && dValve) {
    vValve.min = dValve.min || '20';
    vValve.max = dValve.max || '100';
    vValve.step = dValve.step || '5';
    vValve.value = dValve.value;
    updateValveHUD(dValve.value);

    vValve.addEventListener('input', (e) => {
      dValve.value = e.target.value;
      dValve.dispatchEvent(new Event('input', { bubbles: true }));
      updateValveHUD(e.target.value);
    });

    dValve.addEventListener('input', (e) => {
      updateValveHUD(e.target.value);
    });
  }

  // Transport and Play/Pause
  let isSimPaused = false;
  const railPauseBtn = document.getElementById('btn-rail-pause');
  const transPauseBtn = document.getElementById('btn-transport-pause');
  const pauseIcon1 = document.getElementById('rail-pause-icon');
  const pauseIcon2 = document.getElementById('hud-pause-icon');
  const pauseText = document.getElementById('hud-pause-text');

  function toggleSimPause() {
    isSimPaused = !isSimPaused;
    const symbol = isSimPaused ? '▶' : '⏸';
    const text = isSimPaused ? 'RESUME' : 'PAUSE';
    if (pauseIcon1) pauseIcon1.textContent = symbol;
    if (pauseIcon2) pauseIcon2.textContent = symbol;
    if (pauseText) pauseText.textContent = text;
    if (transPauseBtn) transPauseBtn.classList.toggle('active', isSimPaused);
  }

  if (railPauseBtn) railPauseBtn.addEventListener('click', toggleSimPause);
  if (transPauseBtn) transPauseBtn.addEventListener('click', toggleSimPause);

  const stepBack = document.getElementById('btn-transport-step-back');
  const stepFwd = document.getElementById('btn-transport-step-fwd');
  if (stepBack && dSpeed) {
    stepBack.addEventListener('click', () => {
      let v = Math.max(1500, parseFloat(dSpeed.value) - 100);
      dSpeed.value = v;
      dSpeed.dispatchEvent(new Event('input', { bubbles: true }));
      updateSpeedHUD(v);
    });
  }
  if (stepFwd && dSpeed) {
    stepFwd.addEventListener('click', () => {
      let v = Math.min(3400, parseFloat(dSpeed.value) + 100);
      dSpeed.value = v;
      dSpeed.dispatchEvent(new Event('input', { bubbles: true }));
      updateSpeedHUD(v);
    });
  }

  // Mode Cards
  const modeBep = document.getElementById('hud-mode-bep');
  const modeSlam = document.getElementById('hud-mode-slam');
  const modeRamp = document.getElementById('hud-mode-ramp');
  const modeNpsh = document.getElementById('hud-mode-npsh');
  const tripBtn = document.getElementById('tripBtn');
  const softRampBtn = document.getElementById('softRampBtn');
  const dSuction = document.getElementById('suctionSlider');
  const modeIndicator = document.getElementById('hud-mode-indicator');
  const statusSummary = document.getElementById('hud-status-summary');

  function clearActiveModes() {
    [modeBep, modeSlam, modeRamp, modeNpsh].forEach(m => m && m.classList.remove('active'));
  }

  if (modeBep) {
    modeBep.addEventListener('click', () => {
      clearActiveModes();
      modeBep.classList.add('active');
      if (dSpeed) {
        dSpeed.value = '2900';
        dSpeed.dispatchEvent(new Event('input', { bubbles: true }));
        updateSpeedHUD('2900');
      }
      if (dValve) {
        dValve.value = '75';
        dValve.dispatchEvent(new Event('input', { bubbles: true }));
        updateValveHUD('75');
      }
      if (dSuction) {
        dSuction.value = '1.8';
        dSuction.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (modeIndicator) modeIndicator.textContent = 'AFFINITY LAWS';
      if (statusSummary) statusSummary.textContent = '2900 RPM BEP';
    });
  }

  if (modeSlam) {
    modeSlam.addEventListener('click', () => {
      clearActiveModes();
      modeSlam.classList.add('active');
      if (tripBtn) tripBtn.click();
      if (modeIndicator) modeIndicator.textContent = 'VALVE SLAM';
      if (statusSummary) statusSummary.textContent = 'WATER HAMMER';
      setTimeout(() => {
        if (modeSlam.classList.contains('active')) {
          modeBep.classList.add('active');
          modeSlam.classList.remove('active');
        }
      }, 3500);
    });
  }

  if (modeRamp) {
    modeRamp.addEventListener('click', () => {
      clearActiveModes();
      modeRamp.classList.add('active');
      if (softRampBtn) softRampBtn.click();
      if (modeIndicator) modeIndicator.textContent = 'VFD SOFT RAMP';
      if (statusSummary) statusSummary.textContent = 'RAMP ACTIVE';
      setTimeout(() => {
        if (modeRamp.classList.contains('active')) {
          modeBep.classList.add('active');
          modeRamp.classList.remove('active');
        }
      }, 4000);
    });
  }

  if (modeNpsh) {
    modeNpsh.addEventListener('click', () => {
      clearActiveModes();
      modeNpsh.classList.add('active');
      if (dSuction) {
        dSuction.value = '0.4';
        dSuction.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (modeIndicator) modeIndicator.textContent = 'CAVITATION';
      if (statusSummary) statusSummary.textContent = 'NPSHa < NPSHr';
    });
  }
})();
