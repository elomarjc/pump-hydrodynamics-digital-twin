/**
 * Motor Current Signature Analysis (MCSA) Engine
 * Performs non-intrusive spectral analysis of stator current harmonics
 * to detect mechanical torque vibrations caused by cavitation bubble implosions.
 */
export class MCSAAnalyzer {
    constructor() {
        this.numBins = 64;
        this.spectrumDb = new Float32Array(this.numBins);
        this.cavitationHealthIndex = 0.0; // 0% (Healthy) to 100% (Severe)
    }

    /**
     * Compute simulated stator current FFT spectrum (0 to 300 Hz)
     */
    update(speedRpm, isCavitating, severity = 0.0) {
        let fe = (speedRpm / 2900.0) * 50.0; // Fundamental stator electrical frequency (Hz)
        let fr = speedRpm / 60.0; // Mechanical rotor rotational frequency (Hz)

        for (let i = 0; i < this.numBins; i++) {
            let freq = (i / (this.numBins - 1)) * 250.0; // 0 to 250 Hz

            // Baseline electrical noise floor (-65 dB)
            let valDb = -65.0 + Math.random() * 3.0;

            // Fundamental Stator Peak (50 Hz) -> 0 dB
            if (Math.abs(freq - fe) < 6.0) {
                valDb = 0.0 - ((freq - fe) ** 2) * 0.4;
            }

            // Cavitation Sideband Harmonics: fe +/- k * fr
            // Micro-bubble collapse induces torque ripple at blade pass & rotational sidebands
            if (isCavitating) {
                let sideband1 = fe + fr;
                let sideband2 = Math.abs(fe - fr);
                let sidebandBlade = fe + 5 * fr; // 5-vane impeller blade pass

                if (Math.abs(freq - sideband1) < 5.0) {
                    valDb = Math.max(valDb, -24.0 + severity * 12.0 - ((freq - sideband1) ** 2) * 0.5);
                }
                if (Math.abs(freq - sideband2) < 5.0) {
                    valDb = Math.max(valDb, -26.0 + severity * 12.0 - ((freq - sideband2) ** 2) * 0.5);
                }
                if (Math.abs(freq - sidebandBlade) < 8.0) {
                    valDb = Math.max(valDb, -28.0 + severity * 14.0 - ((freq - sidebandBlade) ** 2) * 0.4);
                }
            }

            this.spectrumDb[i] = valDb;
        }

        this.cavitationHealthIndex = isCavitating ? Math.min(100.0, severity * 100.0) : 0.0;
    }
}
