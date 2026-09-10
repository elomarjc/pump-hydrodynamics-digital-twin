/**
 * Hydraulic Flow Schematic Canvas
 * Visualizes the piping network, centrifugal pump impeller rotation,
 * animated fluid flow particles, and cavitation bubbles.
 */
export class HydraulicSchematic {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.impellerAngle = 0;
        this.particles = [];
        this.cavitationBubbles = [];

        // Init flow particles
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * 400,
                y: 140 + (Math.random() * 12 - 6),
                speed: 2 + Math.random() * 2
            });
        }
    }

    render(pump) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        // Dark background
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, width, height);

        // Flow speed factor
        let flowFactor = Math.max(0.1, pump.flowQ / 25.0);
        this.impellerAngle += 0.08 * (pump.speedRpm / 2900.0);

        // 1. Suction Tank / Reservoir (Left)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(20, 80, 70, 130);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.3)';
        ctx.fillRect(22, 100, 66, 108); // Water level

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Suction Well', 55, 72);
        ctx.fillText(`${pump.pSuctionBar.toFixed(1)} Bar`, 55, 140);

        // 2. Piping Loop (Suction & Discharge)
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(90, 140); // From tank
        ctx.lineTo(170, 140); // Into pump suction eye
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(215, 120); // Out of pump discharge nozzle
        ctx.lineTo(215, 80);
        ctx.lineTo(380, 80); // Discharge line
        ctx.stroke();

        // 3. Flow Particles
        ctx.fillStyle = '#38bdf8';
        this.particles.forEach(p => {
            p.x += p.speed * flowFactor;
            if (p.x > 380) p.x = 90;
            ctx.beginPath();
            ctx.arc(p.x, p.x < 170 ? 140 : 80, 2.5, 0, 2 * Math.PI);
            ctx.fill();
        });

        // 4. Centrifugal Pump Volute Casing (Center)
        const pcx = 195;
        const pcy = 140;

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(pcx, pcy, 36, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = pump.isCavitating ? '#ef4444' : '#0ea5e9';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Spinning Impeller Blades
        ctx.save();
        ctx.translate(pcx, pcy);
        ctx.rotate(this.impellerAngle);
        for (let i = 0; i < 5; i++) {
            let rad = i * (2 * Math.PI / 5);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(15 * Math.cos(rad + 0.4), 15 * Math.sin(rad + 0.4), 28 * Math.cos(rad), 28 * Math.sin(rad));
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
        ctx.restore();

        // Pump Motor Block behind
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(pcx - 14, pcy + 36, 28, 30);
        ctx.fillStyle = '#64748b';
        ctx.font = '9px Inter, sans-serif';
        ctx.fillText('IE5 Motor', pcx, pcy + 54);

        // 5. Cavitation Bubbles inside Impeller Eye
        if (pump.isCavitating) {
            // Spawn micro bubbles
            if (Math.random() < 0.7) {
                this.cavitationBubbles.push({
                    x: pcx + (Math.random() * 20 - 10),
                    y: pcy + (Math.random() * 20 - 10),
                    r: 2 + Math.random() * 4,
                    life: 1.0
                });
            }

            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            this.cavitationBubbles.forEach(b => {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
                ctx.fill();
                b.life -= 0.08;
            });
            this.cavitationBubbles = this.cavitationBubbles.filter(b => b.life > 0);

            // Warning Banner
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText('⚡ CAVITATION BUBBLE IMPLOSION DETECTED', pcx, pcy - 44);
        }

        // 6. Discharge Throttling Valve
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(310, 70); ctx.lineTo(330, 90); ctx.lineTo(310, 90); ctx.lineTo(330, 70);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('Control Valve', 320, 62);
    }
}
