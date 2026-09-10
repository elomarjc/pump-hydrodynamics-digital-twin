/**
 * Joukowsky Water Hammer Pressure Surge Scope
 * Plots transient pressure waves against the PN16 pipeline limit.
 */
export class SurgeScope {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
    }

    render(hammer) {
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

        // Pressure mapping: 0 to 30 Bar
        const mapY = (bar) => (padTop + plotH) - (bar / 30.0) * plotH;
        const mapX = (idx) => padLeft + (idx / (hammer.historyLength - 1)) * plotW;

        // Grid lines
        ctx.strokeStyle = '#141d2e';
        ctx.lineWidth = 1;
        ctx.font = '10px Inter, monospace';
        ctx.fillStyle = '#4a5b78';
        ctx.textAlign = 'right';

        [0, 10, 16, 25].forEach(bar => {
            let py = mapY(bar);
            ctx.beginPath();
            ctx.moveTo(padLeft, py);
            ctx.lineTo(padLeft + plotW, py);
            ctx.stroke();
            ctx.fillText(`${bar} bar`, padLeft - 6, py + 3);
        });

        // PN16 Pipe Limit Line (Dashed Red)
        let pn16Y = mapY(hammer.pipeRatingBar);
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.moveTo(padLeft, pn16Y);
        ctx.lineTo(padLeft + plotW, pn16Y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pressure Waveform Trace (Cyan or Red if exceeding PN16)
        let maxP = Math.max(...hammer.pressureTrace);
        ctx.beginPath();
        ctx.strokeStyle = maxP > 16.0 ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 2.0;

        for (let i = 0; i < hammer.historyLength; i++) {
            let px = mapX(i);
            let py = mapY(Math.max(0, hammer.pressureTrace[i]));
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Labels
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.fillText(`Pipeline Pressure Wave (Peak: ${maxP.toFixed(1)} Bar | Limit: 16.0 Bar)`, padLeft + 10, padTop + 14);

        if (maxP > 16.0) {
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.fillStyle = '#ef4444';
            ctx.fillText('CRITICAL PIPE RUPTURE RISK EXCEEDED', padLeft + 10, padTop + 28);
        } else {
            ctx.font = '10px Inter, sans-serif';
            ctx.fillStyle = '#10b981';
            ctx.fillText('Operating Safely Within PN16 Class', padLeft + 10, padTop + 28);
        }
    }
}
