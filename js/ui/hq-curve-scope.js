/**
 * Pump H-Q Operating Point & NPSH Scope
 * Renders pump head curve H_pump(Q), system curve H_sys(Q),
 * duty point intersection, and NPSHr vs NPSHa margin.
 */
export class HQCurveScope {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    }

    render(pump) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, width, height);

        const padLeft = 45;
        const padRight = 15;
        const padTop = 15;
        const padBottom = 25;
        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        // Flow: 0 to 40 m^3/h | Head: 0 to 60 m
        const mapX = (q) => padLeft + (q / 40.0) * plotW;
        const mapY = (h) => (padTop + plotH) - (h / 60.0) * plotH;

        // Grid lines
        ctx.strokeStyle = '#141d2e';
        ctx.lineWidth = 1;
        ctx.font = '10px Inter, monospace';
        ctx.fillStyle = '#4a5b78';
        ctx.textAlign = 'right';

        // Head axis (m)
        [0, 20, 40, 60].forEach(h => {
            let py = mapY(h);
            ctx.beginPath();
            ctx.moveTo(padLeft, py);
            ctx.lineTo(padLeft + plotW, py);
            ctx.stroke();
            ctx.fillText(`${h}m`, padLeft - 6, py + 3);
        });

        // Flow axis (m^3/h)
        ctx.textAlign = 'center';
        [0, 10, 20, 30, 40].forEach(q => {
            let px = mapX(q);
            ctx.beginPath();
            ctx.moveTo(px, padTop);
            ctx.lineTo(px, padTop + plotH);
            ctx.stroke();
            ctx.fillText(`${q}`, px, padTop + plotH + 15);
        });

        let speedRatio = pump.speedRpm / pump.nRated;
        let scaledH0 = pump.H0 * (speedRatio * speedRatio);

        // 1. Draw Pump Head Curve: H_pump = scaledH0 - kp * Q^2 (Cyan)
        ctx.beginPath();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        for (let q = 0; q <= 36; q += 0.5) {
            let h = scaledH0 - pump.kp * (q * q);
            if (h < 0) break;
            let px = mapX(q);
            let py = mapY(h);
            if (q === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 2. Draw System Resistance Curve: H_sys = Hstatic + kValve * Q^2 (Amber)
        ctx.beginPath();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.0;
        for (let q = 0; q <= 36; q += 0.5) {
            let h = pump.Hstatic + pump.kValve * (q * q);
            if (h > 60) break;
            let px = mapX(q);
            let py = mapY(h);
            if (q === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 3. Highlight Duty Point Intersection (Green or Red if cavitating)
        let dpX = mapX(pump.flowQ);
        let dpY = mapY(pump.headH);

        ctx.fillStyle = pump.isCavitating ? '#ef4444' : '#10b981';
        ctx.beginPath();
        ctx.arc(dpX, dpY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Labels
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.fillText(`Duty Point: Q = ${pump.flowQ.toFixed(1)} m³/h, H = ${pump.headH.toFixed(1)} m`, padLeft + 10, padTop + 14);

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`NPSHa: ${pump.npshA.toFixed(1)} m | NPSHr: ${pump.npshR.toFixed(1)} m | η = ${(pump.efficiency*100).toFixed(0)}%`, padLeft + 10, padTop + 28);
    }
}
