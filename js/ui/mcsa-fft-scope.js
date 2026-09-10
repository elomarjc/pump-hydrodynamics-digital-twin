/**
 * Motor Current Signature Analysis (MCSA) Spectrum Scope
 * Visualizes the 60 FPS stator current FFT spectrum and highlights
 * cavitation sideband harmonics and health status.
 */
export class MCSAFFTScope {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    }

    render(mcsaAnalyzer) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, width, height);

        const padLeft = 40;
        const padRight = 15;
        const padTop = 15;
        const padBottom = 25;
        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        // Coordinates mapping (-70 dB to 0 dB)
        const mapY = (db) => (padTop + plotH) - ((db + 70) / 70.0) * plotH;
        const mapX = (idx) => padLeft + (idx / (mcsaAnalyzer.numBins - 1)) * plotW;

        // Grid lines
        ctx.strokeStyle = '#141d2e';
        ctx.lineWidth = 1;
        ctx.font = '10px Inter, monospace';
        ctx.fillStyle = '#4a5b78';
        ctx.textAlign = 'right';

        for (let db = -60; db <= 0; db += 20) {
            let py = mapY(db);
            ctx.beginPath();
            ctx.moveTo(padLeft, py);
            ctx.lineTo(padLeft + plotW, py);
            ctx.stroke();
            ctx.fillText(`${db}`, padLeft - 6, py + 3);
        }

        // Frequency axis labels (50Hz, 100Hz, 150Hz, 200Hz)
        ctx.textAlign = 'center';
        [50, 100, 150, 200].forEach(f => {
            let bin = Math.floor(mcsaAnalyzer.numBins * (f / 250.0));
            let px = mapX(bin);
            ctx.beginPath();
            ctx.moveTo(px, padTop);
            ctx.lineTo(px, padTop + plotH);
            ctx.stroke();
            ctx.fillText(`${f}Hz`, px, padTop + plotH + 15);
        });

        // Spectrum Trace
        ctx.beginPath();
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = mcsaAnalyzer.cavitationHealthIndex > 20 ? '#ef4444' : '#10b981';

        for (let i = 0; i < mcsaAnalyzer.numBins; i++) {
            let px = mapX(i);
            let py = mapY(Math.max(-70, Math.min(0, mcsaAnalyzer.spectrumDb[i])));
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Header / Cavitation Indicator
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('Stator Current MCSA FFT Spectrum (0 - 250 Hz)', padLeft + 10, padTop + 14);

        let chi = mcsaAnalyzer.cavitationHealthIndex.toFixed(0);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = chi > 30 ? '#ef4444' : '#10b981';
        ctx.fillText(`Cavitation Index: ${chi}% (${chi > 30 ? 'CAVITATION DETECTED' : 'NORMAL INFLOW'})`, padLeft + 10, padTop + 28);
    }
}
