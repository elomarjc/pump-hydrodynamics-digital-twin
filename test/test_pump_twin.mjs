import test from 'node:test';
import assert from 'node:assert/strict';

import { PumpHydraulics } from '../js/engine/pump-hydraulics.js';
import { MCSAAnalyzer } from '../js/engine/mcsa-analyzer.js';
import { WaterHammerEngine } from '../js/engine/water-hammer.js';

test('PumpHydraulics: Affinity laws scaling and duty point solution', () => {
    const pump = new PumpHydraulics();
    pump.setSpeed(2900);
    pump.setValveOpening(80);
    pump.update();

    assert.ok(pump.flowQ > 15.0, `Flow rate should be > 15 m^3/h at 2900 RPM, got ${pump.flowQ.toFixed(1)}`);
    assert.ok(pump.headH > 20.0, `Head should be > 20 m at 2900 RPM, got ${pump.headH.toFixed(1)}`);

    // Affinity law test: Half speed should produce ~1/4 head
    const headRated = pump.headH;
    pump.setSpeed(1450);
    pump.update();
    const headHalf = pump.headH;

    assert.ok(headHalf < headRated * 0.6, 'Half speed should significantly reduce head');
});

test('PumpHydraulics: NPSH cavitation threshold detection', () => {
    const pump = new PumpHydraulics();
    pump.setSpeed(2900);
    pump.setValveOpening(100);

    // High suction pressure: No cavitation
    pump.setSuctionPressure(2.5);
    pump.update();
    assert.equal(pump.isCavitating, false, 'Pump should not cavitate at 2.5 Bar suction');

    // Low suction pressure: Cavitation inception
    pump.setSuctionPressure(0.25);
    pump.update();
    assert.equal(pump.isCavitating, true, 'Pump must detect cavitation when NPSHa < NPSHr');
    assert.ok(pump.cavitationSeverity > 0.0, 'Cavitation severity should be > 0');
});

test('MCSAAnalyzer: spectral sidebands and Cavitation Health Index', () => {
    const mcsa = new MCSAAnalyzer();

    // Normal condition
    mcsa.update(2900, false, 0.0);
    assert.equal(mcsa.cavitationHealthIndex, 0.0, 'Health index should be 0% when healthy');

    // Cavitating condition
    mcsa.update(2900, true, 0.8);
    assert.ok(mcsa.cavitationHealthIndex > 50.0, 'Health index should reflect severe cavitation');
});

test('WaterHammerEngine: Joukowsky surge calculation and soft ramp mitigation', () => {
    const hammer = new WaterHammerEngine();

    // Sudden trip from 25 m^3/h
    hammer.triggerValveClosure(25.0, false);
    assert.ok(hammer.peakSurgeBar > hammer.pipeRatingBar, `Sudden trip surge (${hammer.peakSurgeBar.toFixed(1)} Bar) should exceed PN16 (16 Bar)`);

    // Intelligent VFD soft ramp
    hammer.triggerValveClosure(25.0, true);
    assert.ok(hammer.peakSurgeBar < hammer.pipeRatingBar, `Soft ramp surge (${hammer.peakSurgeBar.toFixed(1)} Bar) should remain below PN16 (16 Bar)`);
});
