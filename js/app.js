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
