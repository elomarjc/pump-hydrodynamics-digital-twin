/**
 * Centrifugal Pump Hydrodynamics & Affinity Laws Engine
 * Models a multi-stage industrial booster pump (CRE-class booster series):
 * - Rated speed n0 = 2900 RPM
 * - Shutoff head H0 = 50 m
 * - Max flow Qmax = 32 m^3/h
 * - Fluid: Water (rho = 1000 kg/m^3, g = 9.81 m/s^2)
 * - Affinity Laws: Q ~ n, H ~ n^2, P ~ n^3
 */
export class PumpHydraulics {
    constructor() {
        this.nRated = 2900.0; // RPM
        this.speedRpm = 2900.0;
        this.H0 = 52.0; // Max shutoff head (m)
        this.kp = 0.045; // Internal pump loss coefficient
        this.rho = 1000.0; // kg/m^3
        this.g = 9.81; // m/s^2

        // System resistance curve: H_sys = H_static + k_valve * Q^2
        this.Hstatic = 15.0; // Static lift head (m)
        this.kValve = 0.040; // Valve restriction coefficient

        // Suction conditions & Cavitation (NPSH)
        this.pSuctionBar = 1.8; // Bar absolute
        this.pVaporBar = 0.0234; // Water vapor pressure at 20°C (Bar)
        this.npsh0 = 1.2; // Base NPSHr at low flow (m)
        this.knpsh = 0.0035;

        // Dynamic operating states
        this.flowQ = 0.0; // m^3/h
        this.headH = 0.0; // m
        this.efficiency = 0.75;
        this.electricalPowerKw = 0.0;
        this.npshA = 0.0;
        this.npshR = 0.0;
        this.isCavitating = false;
        this.cavitationSeverity = 0.0;
    }

    setSpeed(rpm) {
        this.speedRpm = Math.max(500, Math.min(3500, rpm));
    }

    setValveOpening(percent) {
        // Higher opening = lower resistance kValve
        let frac = Math.max(0.05, Math.min(1.0, percent / 100.0));
        this.kValve = 0.015 / (frac * frac);
    }

    setSuctionPressure(bar) {
        this.pSuctionBar = Math.max(0.1, Math.min(4.0, bar));
    }

    /**
     * Solve operating duty point where H_pump(Q) = H_sys(Q)
     */
    update() {
        let speedRatio = this.speedRpm / this.nRated;
        let scaledH0 = this.H0 * (speedRatio * speedRatio);

        // H_pump = scaledH0 - kp * Q^2
        // H_sys  = Hstatic + kValve * Q^2
        // => Q^2 * (kp + kValve) = scaledH0 - Hstatic
        let deltaH = scaledH0 - this.Hstatic;

        if (deltaH <= 0) {
            this.flowQ = 0.0;
            this.headH = scaledH0;
        } else {
            let qSquared = deltaH / (this.kp + this.kValve);
            this.flowQ = Math.sqrt(qSquared);
            this.headH = this.Hstatic + this.kValve * (this.flowQ * this.flowQ);
        }

        // Hydraulic power P_hyd = rho * g * Q * H (Watts)
        let qM3PerSec = this.flowQ / 3600.0;
        let hydPowerWatts = this.rho * this.g * qM3PerSec * this.headH;

        // Efficiency bell curve around Best Efficiency Point (BEP ~ 20 m^3/h)
        let bep = 20.0 * speedRatio;
        let qDiff = (this.flowQ - bep) / bep;
        this.efficiency = Math.max(0.35, 0.78 * Math.exp(-0.8 * qDiff * qDiff));

        this.electricalPowerKw = (hydPowerWatts / Math.max(0.2, this.efficiency)) / 1000.0;

        // NPSH calculations:
        // NPSHa = (P_suction - P_vapor) * 1e5 / (rho * g)
        let deltaPPa = (this.pSuctionBar - this.pVaporBar) * 1.0e5;
        this.npshA = Math.max(0.0, deltaPPa / (this.rho * this.g));

        // NPSHr = npsh0 * speedRatio^2 + knpsh * Q^2
        this.npshR = this.npsh0 * (speedRatio * speedRatio) + this.knpsh * (this.flowQ * this.flowQ);

        // Cavitation condition: NPSHa < NPSHr
        if (this.npshA < this.npshR) {
            this.isCavitating = true;
            this.cavitationSeverity = Math.min(1.0, (this.npshR - this.npshA) / Math.max(0.5, this.npshR));
        } else {
            this.isCavitating = false;
            this.cavitationSeverity = 0.0;
        }
    }
}
