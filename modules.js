/* Ten discipline modules. Each: controls → run(p, mathCanvas, twinCanvas) → metrics. Optional frame(dt, p, twinCanvas) for animation. */
"use strict";
const MODULES = [];
const status = (v, good, warn, higherIsBetter = false) => higherIsBetter ? (v >= good ? "good" : v >= warn ? "warn" : "bad") : (v <= good ? "good" : v <= warn ? "warn" : "bad");

/* =====================================================================  1. MECHANICAL — PDE */
MODULES.push({
  id: "me", disc: "Mechanical", icon: "⚙️", math: "PDE · Heat equation",
  title: "Cooling an electronics chip with a metal heat-spreader plate",
  question: "How hot does the chip get — and which design change helps most?",
  eq: `k·t·∇²T − 2h(T − T<sub>∞</sub>) + q = 0 &nbsp;&nbsp; with &nbsp; ∇²T = ∂²T/∂x² + ∂²T/∂y²`,
  eqNote: "Steady heat equation (a PDE) on the plate, solved numerically on a 50 × 40 grid (finite differences + SOR iteration).",
  controls: [
    { id: "mat", label: "Plate material", type: "select", value: "205", options: [["385", "Copper (k = 385 W/m·K)"], ["205", "Aluminium (k = 205)"], ["110", "Brass (k = 110)"], ["50", "Steel (k = 50)"]] },
    { id: "P", label: "Chip power", min: 5, max: 60, step: 1, value: 20, unit: "W" },
    { id: "h", label: "Cooling (fan → h)", min: 5, max: 150, step: 1, value: 25, unit: "W/m²K" },
    { id: "t", label: "Plate thickness", min: 1, max: 6, step: 0.5, value: 3, unit: "mm" },
  ],
  connect: [["∇²T (curvature of temperature)", "How strongly heat spreads sideways from the chip"], ["k·t (conductivity × thickness)", "Material & thickness choice of the heat spreader"], ["h (boundary term)", "Fan speed / heat-transfer coefficient"], ["q (source term)", "Chip power dissipation"]],
  tryThis: ["Keep the chip below 85 °C at 40 W — what is the cheapest change?", "Swap aluminium for steel: why does the hot spot sharpen?", "Double the thickness vs double the fan: which wins, and why does the PDE say so?"],
  uses: ["Heat sinks, engine blocks, brake discs", "Weld cooling, casting solidification", "Battery thermal management"],
  run(p, mc, tc) {
    const NX = 50, NY = 40, dx = 0.002, k = +p.mat, t = p.t / 1000, h = p.h, Ta = 25;
    const chip = (i, j) => i >= 20 && i < 30 && j >= 15 && j < 25;
    const q = p.P / (10 * dx * 10 * dx), a = k * t / (dx * dx), den = 4 * a + 2 * h;
    const th = new Float64Array(NX * NY);
    for (let it = 0; it < 6000; it++) {
      let md = 0;
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const id = j * NX + i;
        const e = th[j * NX + Math.min(NX - 1, i + 1)], w = th[j * NX + Math.max(0, i - 1)], n = th[Math.max(0, j - 1) * NX + i], s = th[Math.min(NY - 1, j + 1) * NX + i];
        const nv = (a * (e + w + n + s) + (chip(i, j) ? q : 0)) / den, d = nv - th[id];
        th[id] += 1.92 * d; if (Math.abs(d) > md) md = Math.abs(d);
      }
      if (md < 1e-5 && it > 50) break;
    }
    const T = Array.from(th, v => v + Ta), Tmax = Math.max(...T), Tavg = T.reduce((s, v) => s + v, 0) / T.length;
    // math: centre-line profile
    let { ctx, w, h: H } = setupCanvas(mc);
    const xs = [...Array(NX)].map((_, i) => (i + 0.5) * dx * 100), row = [...Array(NX)].map((_, i) => T[20 * NX + i]);
    const d2 = row.map((v, i) => i && i < NX - 1 ? (row[i + 1] - 2 * v + row[i - 1]) : 0);
    linePlot(ctx, { x: 0, y: 0, w, h: H * 0.62, title: "Temperature along the centre line T(x)", xlabel: "x (cm)", ylabel: "T (°C)", ymin: 20, ymax: Math.max(90, Tmax + 5),
      series: [{ x: xs, y: row, color: COL.orange, width: 3, label: "T(x)", fill: true }], hlines: [{ y: 85, label: "85 °C chip limit" }], vlines: [{ x: 4, label: "chip", color: COL.muted }, { x: 6, label: "", color: COL.muted }] });
    linePlot(ctx, { x: 0, y: H * 0.64, w, h: H * 0.36, title: "∂²T/∂x² (curvature): negative where heat flows out", xlabel: "x (cm)", ylabel: "∂²T/∂x²",
      series: [{ x: xs, y: d2, color: COL.violet, width: 2 }], legend: false });
    // twin: heat map
    ({ ctx, w, h: H } = setupCanvas(tc));
    const cw = Math.min((w - 90) / NX, (H - 40) / NY), ox = 14, oy = 24;
    ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText("Plate temperature (top view, 10 cm × 8 cm)", ox, 15);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { ctx.fillStyle = heatColor((T[j * NX + i] - 25) / 95); ctx.fillRect(ox + i * cw, oy + j * cw, cw + 0.5, cw + 0.5); }
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.strokeRect(ox + 20 * cw, oy + 15 * cw, 10 * cw, 10 * cw); ctx.setLineDash([]);
    ctx.fillStyle = "#fff"; ctx.font = "700 12px system-ui"; ctx.fillText("CHIP", ox + 22.3 * cw, oy + 20.5 * cw);
    // isotherm label at hottest
    ctx.fillStyle = "#fff"; ctx.fillText(`${Tmax.toFixed(0)} °C`, ox + 22.6 * cw, oy + 23.5 * cw);
    const bx = ox + NX * cw + 18, by = oy, bh = NY * cw;
    for (let k2 = 0; k2 < 100; k2++) { ctx.fillStyle = heatColor(1 - k2 / 100); ctx.fillRect(bx, by + k2 * bh / 100, 16, bh / 100 + 1); }
    ctx.fillStyle = COL.ink; ctx.font = "11px system-ui"; [120, 85, 50, 25].forEach(v => ctx.fillText(v + "°", bx + 20, by + (1 - (v - 25) / 95) * bh + 4));
    return [
      { label: "Hot-spot temperature", value: Tmax.toFixed(1), unit: "°C", status: status(Tmax, 70, 85), note: "chip limit 85 °C" },
      { label: "Average plate temperature", value: Tavg.toFixed(1), unit: "°C" },
      { label: "Spreading penalty (T<sub>max</sub> − T<sub>avg</sub>)", value: (Tmax - Tavg).toFixed(1), unit: "K", status: status(Tmax - Tavg, 10, 25), note: "lower = heat spreads well" },
      { label: "Heat removed by cooling", value: p.P, unit: "W", note: "= chip power at steady state" },
    ];
  },
});

/* =====================================================================  2. CIVIL — Integration */
MODULES.push({
  id: "civil", disc: "Civil", icon: "🏗️", math: "Integration (repeated)",
  title: "Will this floor beam sag too much?",
  question: "Load → shear → bending moment → slope → deflection: each step is an integral.",
  eq: `V(x) = −∫w dx &nbsp;→&nbsp; M(x) = ∫V dx &nbsp;→&nbsp; θ(x) = ∫ M/EI dx &nbsp;→&nbsp; y(x) = ∫θ dx`,
  eqNote: "Integrated numerically (trapezoidal rule, 400 points); constants fixed by the supports: y(0) = y(L) = 0.",
  controls: [
    { id: "L", label: "Span L", min: 4, max: 12, step: 0.5, value: 8, unit: "m" },
    { id: "P", label: "Point load P", min: 0, max: 200, step: 5, value: 80, unit: "kN" },
    { id: "a", label: "Load position", min: 0.05, max: 0.95, step: 0.05, value: 0.5, unit: "× L" },
    { id: "w", label: "Uniform load w", min: 0, max: 30, step: 1, value: 10, unit: "kN/m" },
    { id: "d", label: "Beam depth d (width 300 mm)", min: 200, max: 900, step: 10, value: 450, unit: "mm" },
    { id: "E", label: "Material", type: "select", value: "30", options: [["200", "Steel (E = 200 GPa)"], ["30", "Concrete (E = 30 GPa)"], ["11", "Timber (E = 11 GPa)"]] },
  ],
  connect: [["∫ of load", "Shear force — what the bolts/stirrups must carry"], ["∫ of shear", "Bending moment — sets the steel reinforcement"], ["∫ of M/EI", "Slope — rotation at the supports"], ["∫ of slope", "Deflection — cracks in plaster, bouncy floors"], ["EI in the denominator", "Depth d enters as d³ — the cheapest stiffness"]],
  tryThis: ["Find the shallowest concrete beam that meets L/250 at 8 m span.", "Move the point load from mid-span to a support: what happens to M and y?", "Double the depth: by how much does deflection drop? (Hint: d³)"],
  uses: ["Floor slabs and bridges", "Building frames and lintels", "Crane girders and footbridges"],
  run(p, mc, tc) {
    const L = p.L, P = p.P, a = p.a * L, w0 = p.w, b = 0.3, d = p.d / 1000, I = b * d ** 3 / 12, EI = +p.E * 1e6 * I, N = 400;
    const x = [...Array(N + 1)].map((_, i) => i * L / N), dx = L / N;
    const RA = w0 * L / 2 + P * (L - a) / L, RB = w0 * L + P - RA;
    const V = x.map(xi => RA - w0 * xi - (xi > a ? P : 0));
    const cum = arr => { const o = [0]; for (let i = 1; i <= N; i++) o.push(o[i - 1] + (arr[i] + arr[i - 1]) / 2 * dx); return o; };
    const M = cum(V), th0 = cum(M.map(m => m / EI)), y0 = cum(th0), C = -y0[N] / L;
    const y = y0.map((v, i) => (v + C * x[i]) * 1000), ymaxAbs = Math.max(...y.map(Math.abs)), lim = L * 1000 / 250, Mmax = Math.max(...M.map(Math.abs));
    let { ctx, w, h } = setupCanvas(mc); const hh = h / 3;
    linePlot(ctx, { x: 0, y: 0, w, h: hh, title: "Shear force V(x) = ∫(−w) dx", ylabel: "kN", series: [{ x, y: V, color: COL.blue, fill: true }], legend: false });
    linePlot(ctx, { x: 0, y: hh, w, h: hh, title: "Bending moment M(x) = ∫V dx", ylabel: "kN·m", series: [{ x, y: M, color: COL.orange, fill: true }], legend: false });
    linePlot(ctx, { x: 0, y: 2 * hh, w, h: hh, title: "Deflection y(x) = ∬ M/EI", ylabel: "mm", xlabel: "x (m)", ymin: Math.min(-lim * 1.2, ...y.map(v => -Math.abs(v))) * 1.05, ymax: 2,
      series: [{ x, y: y.map(v => -Math.abs(v)), color: COL.violet, fill: true }], hlines: [{ y: -lim, label: `limit L/250 = ${lim.toFixed(1)} mm` }], legend: false });
    ({ ctx, w, h } = setupCanvas(tc));
    const X0 = 40, X1 = w - 40, sc = (X1 - X0) / L, by = h * 0.48, amp = Math.min(70, 70 * ymaxAbs / lim);
    ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText("Deflected shape (exaggerated) · red = exceeds L/250", 14, 16);
    // UDL arrows
    if (w0 > 0) for (let xi = 0; xi <= L + 1e-6; xi += L / 16) arrow(ctx, X0 + xi * sc, by - 70, X0 + xi * sc, by - 22, COL.aqua, 1.5, null, 6);
    if (w0 > 0) { ctx.fillStyle = COL.aqua; ctx.font = "700 12px system-ui"; ctx.fillText(`w = ${w0} kN/m`, X0, by - 76); }
    if (P > 0) { const yy = by - 22 - (ymaxAbs ? amp * Math.abs(y[Math.round(a / dx)]) / ymaxAbs : 0) * 0; arrow(ctx, X0 + a * sc, by - 110, X0 + a * sc, yy, COL.red, 4, null, 12); ctx.fillStyle = COL.red; ctx.font = "700 12px system-ui"; ctx.fillText(`P = ${P} kN`, X0 + a * sc + 8, by - 100); }
    // undeformed
    ctx.strokeStyle = "#cfc6de"; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0, by); ctx.lineTo(X1, by); ctx.stroke(); ctx.setLineDash([]);
    // deformed beam (thick)
    const bad = ymaxAbs > lim;
    ctx.strokeStyle = bad ? COL.bad : COL.pur; ctx.lineWidth = 12; ctx.beginPath();
    x.forEach((xi, i) => { const yy = by + (ymaxAbs ? amp * Math.abs(y[i]) / ymaxAbs : 0); i ? ctx.lineTo(X0 + xi * sc, yy) : ctx.moveTo(X0 + xi * sc, yy); }); ctx.stroke();
    // supports
    for (const sx of [X0, X1]) { ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.moveTo(sx, by + 7); ctx.lineTo(sx - 14, by + 32); ctx.lineTo(sx + 14, by + 32); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = COL.ink; ctx.font = "12px system-ui"; ctx.fillText(`R_A = ${RA.toFixed(1)} kN`, X0 - 20, by + 50); ctx.textAlign = "right"; ctx.fillText(`R_B = ${RB.toFixed(1)} kN`, X1 + 20, by + 50); ctx.textAlign = "left";
    // section sketch
    const sx = w / 2 - 40, sy = h - 70, sh = Math.min(60, d * 70), sw = 0.3 * 70;
    ctx.fillStyle = "#cfc6de"; ctx.fillRect(sx, sy + (60 - sh), sw, sh); ctx.fillStyle = COL.ink; ctx.fillText(`section 300 × ${p.d} mm · I = ${(I * 1e8).toFixed(0)} cm⁴`, sx + sw + 10, sy + 40);
    return [
      { label: "Max deflection", value: ymaxAbs.toFixed(1), unit: "mm", status: ymaxAbs <= lim * 0.8 ? "good" : ymaxAbs <= lim ? "warn" : "bad", note: `limit L/250 = ${lim.toFixed(1)} mm` },
      { label: "Max bending moment", value: Mmax.toFixed(1), unit: "kN·m" },
      { label: "Max bending stress σ = M·c/I", value: (Mmax * 1e3 * d / 2 / I / 1e6).toFixed(1), unit: "MPa" },
      { label: "Stiffness EI", value: (EI / 1000).toFixed(0), unit: "MN·m²" },
    ];
  },
});

/* =====================================================================  3. AUTOMOTIVE — 2nd-order ODE */
MODULES.push({
  id: "auto", disc: "Automotive", icon: "🚗", math: "2nd-order ODE",
  title: "Tuning a car suspension for a speed bump",
  question: "Spring stiffness and damper size decide comfort — the ODE predicts it before you build it.",
  eq: `m z̈ + c(ż − ẏ) + k(z − y) = 0 &nbsp;&nbsp; ζ = c / (2√(k m)), &nbsp; f<sub>n</sub> = √(k/m) / 2π`,
  eqNote: "Quarter-car model (m = 300 kg) over a 3 m long half-sine speed hump, solved with the Runge–Kutta (RK4) method, Δt = 1 ms.",
  controls: [
    { id: "k", label: "Spring stiffness k", min: 10, max: 80, step: 1, value: 25, unit: "kN/m" },
    { id: "c", label: "Damper c", min: 0.2, max: 6, step: 0.1, value: 1.2, unit: "kN·s/m" },
    { id: "v", label: "Vehicle speed", min: 10, max: 80, step: 1, value: 30, unit: "km/h" },
    { id: "hb", label: "Hump height", min: 2, max: 15, step: 1, value: 7, unit: "cm" },
  ],
  connect: [["k (stiffness)", "Spring rate — sets the natural frequency f<sub>n</sub>"], ["c (damping)", "Shock absorber — how fast the bouncing dies out"], ["ζ < 1 (underdamped)", "Bouncy, floaty ride"], ["z̈ (2nd derivative)", "Acceleration felt by passengers = comfort"], ["y(t) forcing", "Road profile and speed"]],
  tryThis: ["Find k and c that keep peak acceleration under 3 m/s² at 40 km/h.", "Set ζ ≈ 0.3 (typical cars) — then try ζ ≈ 1. Which feels better, which grips better?", "Increase speed: why does a faster car feel the bump as a sharper jolt?"],
  uses: ["Car & bike suspensions", "Machine vibration isolation", "Building base isolation for earthquakes"],
  run(p, mc, tc) {
    const m = 300, k = p.k * 1000, c = p.c * 1000, v = p.v / 3.6, hb = p.hb / 100, Lb = 3.0, t0 = 0.5, dt = 0.001, Tend = 4;
    const road = t => { const s = (t - t0) * v; return s > 0 && s < Lb ? hb * Math.sin(Math.PI * s / Lb) : 0; };
    const roadV = t => { const s = (t - t0) * v; return s > 0 && s < Lb ? hb * Math.PI * v / Lb * Math.cos(Math.PI * s / Lb) : 0; };
    const f = (t, z, zd) => (k * (road(t) - z) + c * (roadV(t) - zd)) / m;
    let z = 0, zd = 0; const T = [], Z = [], Y = [], A = [];
    for (let i = 0, t = 0; t <= Tend; i++, t = i * dt) {
      if (i % 10 === 0) { T.push(t); Z.push(z * 100); Y.push(road(t) * 100); A.push(f(t, z, zd)); }
      const k1 = zd, l1 = f(t, z, zd), k2 = zd + l1 * dt / 2, l2 = f(t + dt / 2, z + k1 * dt / 2, zd + l1 * dt / 2), k3 = zd + l2 * dt / 2, l3 = f(t + dt / 2, z + k2 * dt / 2, zd + l2 * dt / 2), k4 = zd + l3 * dt, l4 = f(t + dt, z + k3 * dt, zd + l3 * dt);
      z += dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4); zd += dt / 6 * (l1 + 2 * l2 + 2 * l3 + l4);
    }
    const zeta = c / (2 * Math.sqrt(k * m)), fn = Math.sqrt(k / m) / (2 * Math.PI), amax = Math.max(...A.map(Math.abs)), zmax = Math.max(...Z);
    const tEnd = t0 + Lb / v; let settle = 0; for (let i = T.length - 1; i >= 0; i--) if (Math.abs(Z[i]) > 0.05 * p.hb) { settle = Math.max(0, T[i] - tEnd); break; }
    this._s = { T, Z, Y, v, hb: p.hb, t0, Lb };
    let { ctx, w, h } = setupCanvas(mc);
    linePlot(ctx, { x: 0, y: 0, w, h: h * 0.55, title: "Road input y(t) and car body z(t)", ylabel: "cm", xlabel: "", series: [{ x: T, y: Y, color: COL.muted, dash: [5, 4], label: "road y(t)" }, { x: T, y: Z, color: COL.blue, width: 2.5, label: "body z(t)" }] });
    linePlot(ctx, { x: 0, y: h * 0.56, w, h: h * 0.44, title: "Body acceleration z̈(t) — what passengers feel", ylabel: "m/s²", xlabel: "time (s)", series: [{ x: T, y: A, color: COL.orange, width: 2 }], hlines: [{ y: 3, label: "≈ 3 m/s² discomfort", color: COL.bad }, { y: -3, label: "", color: COL.bad }], legend: false });
    return [
      { label: "Damping ratio ζ", value: zeta.toFixed(2), status: zeta >= 0.2 && zeta <= 0.5 ? "good" : zeta < 0.1 || zeta > 1 ? "bad" : "warn", note: "cars ≈ 0.2–0.4" },
      { label: "Natural frequency f<sub>n</sub>", value: fn.toFixed(2), unit: "Hz", status: fn >= 1 && fn <= 1.6 ? "good" : "warn", note: "comfort ≈ 1–1.5 Hz" },
      { label: "Peak body acceleration", value: amax.toFixed(2), unit: "m/s²", status: status(amax, 2, 3.5), note: "lower = more comfortable" },
      { label: "Settling time after bump", value: settle.toFixed(2), unit: "s", status: status(settle, 1, 2) },
    ];
  },
  frame(time, p, tc) {
    const s = this._s; if (!s) return;
    const loop = 4, t = (time * 0.6) % loop, i = Math.min(s.T.length - 1, Math.round(t / 0.01));
    const { ctx, w, h } = setupCanvas(tc);
    const gy = h * 0.78, px = 120, scale = 60, pxPerM = 90;           // 1 m = 90 px horizontally
    const sCar = Math.max(0, (t - s.t0) * s.v);                       // distance past bump start
    ctx.fillStyle = "#e9f2fb"; ctx.fillRect(0, 0, w, gy); ctx.fillStyle = "#6f6a7a"; ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText(`Live twin · t = ${t.toFixed(2)} s (slow motion)`, 12, 18);
    // bump drawn relative to car position
    const bumpX = px - sCar * pxPerM + (s.t0 - t) * 0;   // start of bump in screen coords
    const bx0 = px + (-(t - s.t0) * s.v) * pxPerM;
    ctx.fillStyle = "#6f6a7a"; ctx.beginPath(); ctx.moveTo(bx0, gy);
    for (let k = 0; k <= 30; k++) { const xx = bx0 + k / 30 * s.Lb * pxPerM; ctx.lineTo(xx, gy - Math.sin(Math.PI * k / 30) * s.hb / 100 * scale * 10 / 3); }
    ctx.lineTo(bx0 + s.Lb * pxPerM, gy); ctx.fill();
    const yRoad = s.Y[i] / 100 * scale * 10 / 3, zBody = s.Z[i] / 100 * scale * 10 / 3;
    // wheel
    const wy = gy - 18 - yRoad; ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(px, wy, 18, 0, 7); ctx.fill(); ctx.fillStyle = "#999"; ctx.beginPath(); ctx.arc(px, wy, 7, 0, 7); ctx.fill();
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(px + 170, gy - 18, 18, 0, 7); ctx.fill();
    // spring + damper
    const bodyY = gy - 95 - zBody;
    ctx.strokeStyle = COL.blue; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px - 8, wy - 18);
    for (let k = 1; k <= 10; k++) ctx.lineTo(px - 8 + (k % 2 ? -8 : 8), wy - 18 - k * (wy - 18 - bodyY - 30) / 10);
    ctx.lineTo(px - 8, bodyY + 30); ctx.stroke();
    ctx.fillStyle = COL.orange; ctx.fillRect(px + 8, (wy - 18 + bodyY + 30) / 2 - 12, 9, 24);
    // body
    ctx.fillStyle = COL.pur; rrect(ctx, px - 60, bodyY - 10, 300, 40, 10); ctx.fill();
    ctx.fillStyle = "#c9bde3"; rrect(ctx, px + 10, bodyY - 42, 160, 34, 10); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "700 12px system-ui"; ctx.fillText(`body ${s.Z[i].toFixed(1)} cm`, px + 40, bodyY + 16);
    // mini acceleration bar
    ctx.fillStyle = COL.ink; ctx.font = "12px system-ui"; ctx.fillText("passenger comfort", w - 170, 40);
    const acc = Math.abs(((s.Z[Math.min(i + 1, s.Z.length - 1)] - 2 * s.Z[i] + s.Z[Math.max(i - 1, 0)]) / 100) / (0.01 * 0.01));
    ctx.fillStyle = "#eee"; ctx.fillRect(w - 170, 48, 150, 12); ctx.fillStyle = acc < 2 ? COL.good : acc < 3.5 ? COL.warn : COL.bad; ctx.fillRect(w - 170, 48, Math.min(150, acc / 6 * 150), 12);
  },
});

/* =====================================================================  4. ELECTRICAL — Fourier series */
MODULES.push({
  id: "ee", disc: "Electrical", icon: "⚡", math: "Functions & Fourier series",
  title: "Clean power from an inverter (solar / EV / motor drive)",
  question: "A switched voltage is a sum of sine waves. Which harmonics hurt — and how do we remove them?",
  eq: `v(t) = Σ b<sub>n</sub> sin(nωt), &nbsp; b<sub>n</sub> = (2/T)∫ v(t) sin(nωt) dt = (4V/nπ)·sin(nθ/2) &nbsp; (odd n) &nbsp;·&nbsp; THD = √(Σ<sub>n≥3</sub> b<sub>n</sub>²) / b<sub>1</sub>`,
  eqNote: "Quasi-square inverter wave with conduction angle θ, passed through an LC low-pass filter |H| = 1/√((1−r²)² + (r/Q)²), Q = 0.707.",
  controls: [
    { id: "th", label: "Conduction angle θ", min: 90, max: 180, step: 1, value: 180, unit: "°" },
    { id: "N", label: "Harmonics in the sum", min: 1, max: 49, step: 2, value: 9, unit: "" },
    { id: "fc", label: "LC filter cut-off", min: 1.5, max: 25, step: 0.5, value: 25, unit: "× 50 Hz" },
  ],
  connect: [["Function v(t)", "Inverter output voltage"], ["Fourier coefficients b<sub>n</sub> (integrals)", "Harmonic content measured by a power analyser"], ["sin(nθ/2) = 0", "Choosing θ = 120° cancels the 3rd harmonic"], ["THD", "Motor heating, transformer losses, grid-code compliance"], ["Filter |H(n)|", "LC filter design: smaller cut-off = cleaner but bulkier"]],
  tryThis: ["Set θ = 120°: which harmonic disappears from the spectrum, and why?", "Find the highest filter cut-off that keeps THD below 5%.", "Increase N: see the Gibbs overshoot at the edges of the square wave."],
  uses: ["Solar & UPS inverters", "EV motor drives", "Power quality in grids and data centres"],
  run(p, mc, tc) {
    const th = p.th * Math.PI / 180, Q = 0.707, H = r => 1 / Math.sqrt((1 - r * r) ** 2 + (r / Q) ** 2);
    const bn = n => n % 2 ? 4 / (n * Math.PI) * Math.sin(n * th / 2) : 0;
    const nList = [...Array(99)].map((_, i) => i + 1).filter(n => n % 2);
    const b1 = bn(1), thdRaw = Math.sqrt(nList.filter(n => n > 1).reduce((s, n) => s + bn(n) ** 2, 0)) / Math.abs(b1);
    const bf = n => bn(n) * H(n / p.fc), thdF = Math.sqrt(nList.filter(n => n > 1).reduce((s, n) => s + bf(n) ** 2, 0)) / Math.abs(bf(1));
    const t = [...Array(401)].map((_, i) => i / 400 * 2 * Math.PI);
    const orig = t.map(a => { const x = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return Math.abs(x - Math.PI / 2) < th / 2 ? 1 : Math.abs(x - 3 * Math.PI / 2) < th / 2 ? -1 : 0; });
    const part = t.map(a => nList.filter(n => n <= p.N).reduce((s, n) => s + bn(n) * Math.sin(n * a), 0));
    const filt = t.map(a => nList.reduce((s, n) => s + bf(n) * Math.sin(n * a), 0));
    let { ctx, w, h } = setupCanvas(mc);
    const deg = t.map(a => a * 180 / Math.PI);
    linePlot(ctx, { x: 0, y: 0, w, h: h * 0.55, title: `v(t) and its Fourier sum with ${p.N} term${p.N > 1 ? "s" : ""}`, ylabel: "v / V", xlabel: "ωt (degrees)", ymin: -Math.max(1.35, ...part.map(Math.abs)) * 1.05, ymax: Math.max(1.35, ...part.map(Math.abs)) * 1.05,
      series: [{ x: deg, y: orig, color: COL.muted, width: 2, dash: [5, 4], label: "inverter v(t)" }, { x: deg, y: part, color: COL.blue, width: 2.5, label: "Σ b_n sin(nωt)" }] });
    const ns = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25];
    barPlot(ctx, { x: 0, y: h * 0.57, w, h: h * 0.43, title: "Harmonic spectrum |b_n| (% of fundamental) — grey: before filter, colour: after", labels: ns.map(String), values: ns.map(n => Math.abs(bn(n)) / Math.abs(b1) * 100), colors: ns.map(() => "#d9d3e6"), ymax: 105, xlabel: "harmonic n" });
    // overlay filtered bars
    const X0 = 46, W = w - 56, bw = W / ns.length, Y0 = h * 0.57 + 22, Hh = h * 0.43 - 52;
    ns.forEach((n, i) => { const v = Math.abs(bf(n)) / Math.abs(bf(1)) * 100, bh = Math.min(105, v) / 105 * Hh; ctx.fillStyle = n === 1 ? COL.pur : COL.orange; ctx.fillRect(X0 + i * bw + bw * 0.28, Y0 + Hh - bh, bw * 0.38, bh); });
    // twin
    ({ ctx, w, h } = setupCanvas(tc));
    const blocks = [["DC", "☀ PV / battery"], ["H-bridge", `θ = ${p.th}°`], ["LC filter", `f<sub>c</sub>`], ["Motor / grid", "load"]];
    const bwid = (w - 60) / 4;
    blocks.forEach(([t1, t2], i) => { const x = 14 + i * (bwid + 10); ctx.fillStyle = i === 2 ? "#fde9d9" : "#f1ecf8"; rrect(ctx, x, 12, bwid - 8, 44, 8); ctx.fill(); ctx.fillStyle = COL.pur; ctx.font = "700 12.5px system-ui"; ctx.fillText(t1, x + 10, 30); ctx.fillStyle = COL.muted; ctx.font = "11.5px system-ui"; ctx.fillText(t2.replace(/<[^>]+>/g, "") + (i === 2 ? ` = ${(p.fc * 50).toFixed(0)} Hz` : ""), x + 10, 47); if (i < 3) arrow(ctx, x + bwid - 6, 34, x + bwid + 6, 34, COL.cri, 2, null, 7); });
    linePlot(ctx, { x: 0, y: 66, w, h: h - 66, title: "Voltage delivered to the motor (after the filter)", ylabel: "v / V", xlabel: "ωt (degrees)", ymin: -Math.max(1.5, ...filt.map(Math.abs)) * 1.05, ymax: Math.max(1.5, ...filt.map(Math.abs)) * 1.05,
      series: [{ x: deg, y: t.map(a => bf(1) * Math.sin(a)), color: COL.green, dash: [5, 4], label: "ideal sine" }, { x: deg, y: filt, color: thdF < 0.05 ? COL.good : thdF < 0.08 ? "#c98a12" : COL.bad, width: 2.5, label: "delivered" }] });
    return [
      { label: "THD before filter", value: (thdRaw * 100).toFixed(1), unit: "%", status: status(thdRaw * 100, 5, 8) },
      { label: "THD after filter", value: (thdF * 100).toFixed(1), unit: "%", status: status(thdF * 100, 5, 8), note: "aim below 5%" },
      { label: "Fundamental delivered", value: (Math.abs(bf(1)) / Math.abs(b1) * 100).toFixed(0), unit: "%", status: Math.abs(bf(1) / b1) > 1.15 ? "warn" : "good", note: "filter resonance can boost it" },
      { label: "3rd harmonic", value: (Math.abs(bn(3)) / Math.abs(b1) * 100).toFixed(1), unit: "% of b₁" },
    ];
  },
});

/* =====================================================================  5. ECE — Convolution & Fourier transform */
MODULES.push({
  id: "ece", disc: "Electronics & Comm.", icon: "📡", math: "Convolution & Fourier transform",
  title: "Cleaning a noisy sensor signal (ECG, IoT, audio)",
  question: "Filtering is convolution in time = multiplication in frequency. Too little smoothing leaves noise, too much kills the signal.",
  eq: `y[n] = Σ<sub>k</sub> h[k]·x[n−k] &nbsp; (convolution) &nbsp;&nbsp; ⇔ &nbsp;&nbsp; Y(f) = H(f)·X(f), &nbsp; X(f) = Σ x[n]e<sup>−j2πfn/f<sub>s</sub></sup>`,
  eqNote: "Moving-average filter of length M (h[k] = 1/M) on a 5 Hz signal + random noise + 50 Hz mains hum, sampled at 500 Hz.",
  controls: [
    { id: "f", label: "Signal frequency", min: 1, max: 15, step: 1, value: 5, unit: "Hz" },
    { id: "noise", label: "Random noise level", min: 0, max: 1, step: 0.05, value: 0.35, unit: "" },
    { id: "hum", label: "50 Hz mains hum", min: 0, max: 1, step: 0.05, value: 0.5, unit: "" },
    { id: "M", label: "Filter length M", min: 1, max: 61, step: 1, value: 7, unit: "samples" },
  ],
  connect: [["Convolution with h[k]", "The filter routine running on a microcontroller/DSP"], ["X(f) — Fourier transform", "Spectrum analyser view of the signal"], ["Zeros of H(f) at f<sub>s</sub>/M", "M = 10 at 500 Hz exactly cancels 50 Hz hum"], ["|H(f)| < 1 at the signal frequency", "Over-smoothing: the real signal shrinks"], ["SNR (dB)", "Signal quality: decides bit errors, diagnosis accuracy"]],
  tryThis: ["Find M that removes the 50 Hz hum completely. (Hint: f<sub>s</sub>/M = 50.)", "Raise the signal frequency to 12 Hz with M = 30: why does the signal vanish?", "Maximise SNR while keeping at least 90% of the signal amplitude."],
  uses: ["ECG/EEG monitors", "Wireless receivers, audio, radar", "IoT sensor nodes"],
  run(p, mc, tc) {
    const fs = 500, N = 512, rnd = mulberry(42), M = p.M;
    const tt = [...Array(N)].map((_, n) => n / fs), clean = tt.map(t => Math.sin(2 * Math.PI * p.f * t));
    const noiseArr = tt.map(() => gauss(rnd)), x = tt.map((t, n) => clean[n] + p.noise * noiseArr[n] + p.hum * Math.sin(2 * Math.PI * 50 * t));
    const half = Math.floor(M / 2), y = x.map((_, n) => { let s = 0, c = 0; for (let k = -half; k < M - half; k++) { const i = n + k; if (i >= 0 && i < N) { s += x[i]; c++; } } return s / c; });
    const snr = sig => { let ps = 0, pn = 0; for (let n = 40; n < N - 40; n++) { ps += clean[n] ** 2; pn += (sig[n] - clean[n]) ** 2; } return 10 * Math.log10(ps / Math.max(pn, 1e-12)); };
    const gain = f => f === 0 ? 1 : Math.abs(Math.sin(Math.PI * f * M / fs) / (M * Math.sin(Math.PI * f / fs)));
    const dft = sig => { const out = []; for (let k = 0; k <= 110; k++) { const f = k * fs / N; let re = 0, im = 0; for (let n = 0; n < N; n++) { const a = 2 * Math.PI * k * n / N; re += sig[n] * Math.cos(a); im -= sig[n] * Math.sin(a); } out.push([f, 2 * Math.hypot(re, im) / N]); } return out; };
    const X = dft(x), Y = dft(y);
    let { ctx, w, h } = setupCanvas(mc);
    linePlot(ctx, { x: 0, y: 0, w, h: h * 0.55, title: "Spectrum |X(f)| before and after filtering, and the filter |H(f)|", xlabel: "frequency (Hz)", ylabel: "amplitude", ymin: 0, ymax: 1.15,
      series: [{ x: X.map(v => v[0]), y: X.map(v => v[1]), color: "#b9b2c6", width: 2, label: "input" }, { x: Y.map(v => v[0]), y: Y.map(v => v[1]), color: COL.blue, width: 2.5, label: "output" }, { x: X.map(v => v[0]), y: X.map(v => gain(v[0])), color: COL.orange, dash: [5, 4], width: 2, label: "|H(f)|" }],
      vlines: [{ x: 50, label: "50 Hz hum", color: COL.red }, { x: p.f, label: "", color: COL.green }] });
    barPlot(ctx, { x: 0, y: h * 0.58, w: Math.min(w, 60 + M * 14), h: h * 0.42, title: `Filter kernel h[k] = 1/M (M = ${M})`, labels: [...Array(M)].map((_, i) => String(i)), values: [...Array(M)].map(() => 1 / M), ymax: Math.max(0.3, 1.2 / M), colors: [...Array(M)].map(() => COL.orange) });
    ({ ctx, w, h } = setupCanvas(tc));
    const show = 300, ts = tt.slice(0, show).map(v => v * 1000);
    linePlot(ctx, { x: 0, y: 0, w, h: h * 0.5, title: "Sensor output x[n] (what the ADC sees)", ylabel: "mV", series: [{ x: ts, y: x.slice(0, show), color: "#b9b2c6", width: 1.5, label: "noisy input" }, { x: ts, y: clean.slice(0, show), color: COL.green, dash: [5, 4], label: "true signal" }], ymin: -2.5, ymax: 2.5 });
    linePlot(ctx, { x: 0, y: h * 0.5, w, h: h * 0.5, title: "Filtered output y[n] = (h * x)[n]", xlabel: "time (ms)", ylabel: "mV", series: [{ x: ts, y: y.slice(0, show), color: COL.blue, width: 2.5, label: "filtered" }, { x: ts, y: clean.slice(0, show), color: COL.green, dash: [5, 4], label: "true signal" }], ymin: -2.5, ymax: 2.5 });
    const keep = gain(p.f) * 100, si = snr(x), so = snr(y);
    return [
      { label: "SNR input", value: si.toFixed(1), unit: "dB" },
      { label: "SNR after filter", value: so.toFixed(1), unit: "dB", status: so >= 15 ? "good" : so >= 8 ? "warn" : "bad", note: `improvement ${(so - si).toFixed(1)} dB` },
      { label: "Signal amplitude kept", value: keep.toFixed(0), unit: "%", status: keep >= 90 ? "good" : keep >= 70 ? "warn" : "bad" },
      { label: "50 Hz hum remaining", value: (gain(50) * 100).toFixed(1), unit: "%", status: status(gain(50) * 100, 5, 20) },
    ];
  },
});

/* =====================================================================  6. CSE — Matrices & eigenvectors (PCA) */
MODULES.push({
  id: "cse", disc: "Computer Science", icon: "💻", math: "Matrices & eigenvectors",
  title: "Compressing data with Principal Component Analysis (machine learning)",
  question: "The eigenvectors of the covariance matrix are the directions where the data really varies.",
  eq: `C = (1/n) XᵀX = [[c<sub>11</sub>, c<sub>12</sub>],[c<sub>12</sub>, c<sub>22</sub>]], &nbsp; C v = λ v, &nbsp; variance kept = λ<sub>1</sub> / (λ<sub>1</sub> + λ<sub>2</sub>)`,
  eqNote: "300 readings from two correlated sensors (e.g. motor current and temperature), centred; eigenvalues of the 2 × 2 covariance matrix solved exactly.",
  controls: [
    { id: "s1", label: "Spread along main trend σ₁", min: 0.5, max: 3, step: 0.1, value: 2, unit: "" },
    { id: "s2", label: "Spread across trend σ₂", min: 0.05, max: 2.5, step: 0.05, value: 0.5, unit: "" },
    { id: "ang", label: "Trend direction", min: 0, max: 180, step: 1, value: 35, unit: "°" },
    { id: "keep", label: "Components kept", type: "select", value: "1", options: [["1", "1 (compress 2 → 1 number)"], ["2", "2 (no compression)"]] },
  ],
  connect: [["Covariance matrix C", "How two features move together"], ["Eigenvector v<sub>1</sub>", "The 'new feature' (principal component) an ML model uses"], ["Eigenvalue λ", "Information (variance) along that direction"], ["Projection onto v<sub>1</sub>", "Compression: store 1 number instead of 2"], ["λ<sub>2</sub> small", "Little is lost: safe to drop that dimension"]],
  tryThis: ["Make σ₂ almost equal to σ₁: why does compression stop working?", "Rotate the trend: do the eigenvalues change? Do the eigenvectors?", "Find settings where 1 component keeps over 95% of the information."],
  uses: ["Face recognition (eigenfaces), image compression", "Recommendation systems, Google PageRank (eigenvector)", "Sensor fusion and anomaly detection"],
  run(p, mc, tc) {
    if (!this._z) { const r = mulberry(7); this._z = [...Array(300)].map(() => [gauss(r), gauss(r)]); }
    const a = p.ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    let pts = this._z.map(([u, v]) => [p.s1 * u * ca - p.s2 * v * sa, p.s1 * u * sa + p.s2 * v * ca]);
    const mx = pts.reduce((s, q) => s + q[0], 0) / pts.length, my = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    pts = pts.map(([x, y]) => [x - mx, y - my]);
    const n = pts.length, c11 = pts.reduce((s, q) => s + q[0] * q[0], 0) / n, c22 = pts.reduce((s, q) => s + q[1] * q[1], 0) / n, c12 = pts.reduce((s, q) => s + q[0] * q[1], 0) / n;
    const tr = (c11 + c22) / 2, dd = Math.sqrt(((c11 - c22) / 2) ** 2 + c12 ** 2), l1 = tr + dd, l2 = tr - dd;
    let v1 = Math.abs(c12) > 1e-9 ? [c12, l1 - c11] : (c11 >= c22 ? [1, 0] : [0, 1]); const nn = Math.hypot(...v1); v1 = [v1[0] / nn, v1[1] / nn]; const v2 = [-v1[1], v1[0]];
    const proj = pts.map(q => { const s = q[0] * v1[0] + q[1] * v1[1]; return [s * v1[0], s * v1[1]]; });
    const rmse = Math.sqrt(pts.reduce((s, q, i) => s + (q[0] - proj[i][0]) ** 2 + (q[1] - proj[i][1]) ** 2, 0) / n);
    const keep2 = p.keep === "2";
    const drawScatter = (ctx, w, h, title, recon) => {
      const R = 7.5, cx = w / 2, cy = h / 2 + 8, sc = Math.min(w, h - 30) / (2 * R);
      ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText(title, 10, 16);
      ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; for (let g = -7; g <= 7; g++) { ctx.beginPath(); ctx.moveTo(cx + g * sc, cy - R * sc); ctx.lineTo(cx + g * sc, cy + R * sc); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - R * sc, cy + g * sc); ctx.lineTo(cx + R * sc, cy + g * sc); ctx.stroke(); }
      ctx.strokeStyle = "#bdb5cc"; ctx.beginPath(); ctx.moveTo(cx - R * sc, cy); ctx.lineTo(cx + R * sc, cy); ctx.moveTo(cx, cy - R * sc); ctx.lineTo(cx, cy + R * sc); ctx.stroke();
      ctx.fillStyle = COL.muted; ctx.font = "11px system-ui"; ctx.fillText("sensor 1 →", cx + R * sc - 64, cy - 6); ctx.fillText("sensor 2 ↑", cx + 6, cy - R * sc + 12);
      if (recon) { ctx.strokeStyle = "rgba(208,59,59,.35)"; ctx.lineWidth = 1; pts.forEach((q, i) => { ctx.beginPath(); ctx.moveTo(cx + q[0] * sc, cy - q[1] * sc); ctx.lineTo(cx + recon[i][0] * sc, cy - recon[i][1] * sc); ctx.stroke(); }); }
      pts.forEach(q => { ctx.fillStyle = recon ? "rgba(122,115,136,.35)" : "rgba(42,120,214,.55)"; ctx.beginPath(); ctx.arc(cx + q[0] * sc, cy - q[1] * sc, 2.6, 0, 7); ctx.fill(); });
      if (recon) recon.forEach(q => { ctx.fillStyle = COL.blue; ctx.beginPath(); ctx.arc(cx + q[0] * sc, cy - q[1] * sc, 2.6, 0, 7); ctx.fill(); });
      return { cx, cy, sc };
    };
    let { ctx, w, h } = setupCanvas(mc);
    const g = drawScatter(ctx, w, h, "Data and eigenvectors of C (arrow length = 2√λ)");
    arrow(ctx, g.cx, g.cy, g.cx + v1[0] * 2 * Math.sqrt(l1) * g.sc, g.cy - v1[1] * 2 * Math.sqrt(l1) * g.sc, COL.cri, 4, `v₁ (λ₁ = ${l1.toFixed(2)})`);
    arrow(ctx, g.cx, g.cy, g.cx + v2[0] * 2 * Math.sqrt(Math.max(l2, 0.001)) * g.sc, g.cy - v2[1] * 2 * Math.sqrt(Math.max(l2, 0.001)) * g.sc, COL.orange, 4, `v₂ (λ₂ = ${l2.toFixed(2)})`);
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(8, h - 58, 190, 50); ctx.fillStyle = COL.ink; ctx.font = "12px ui-monospace, monospace";
    ctx.fillText("C = ⎡" + c11.toFixed(2).padStart(6) + " " + c12.toFixed(2).padStart(6) + "⎤", 14, h - 38); ctx.fillText("    ⎣" + c12.toFixed(2).padStart(6) + " " + c22.toFixed(2).padStart(6) + "⎦", 14, h - 20);
    ({ ctx, w, h } = setupCanvas(tc));
    drawScatter(ctx, w, h, keep2 ? "Stored data (2 numbers per reading — nothing lost)" : "Compressed: each reading stored as 1 number on v₁ (red = error)", keep2 ? null : proj);
    const kept = keep2 ? 100 : l1 / (l1 + l2) * 100;
    return [
      { label: "Information (variance) kept", value: kept.toFixed(1), unit: "%", status: kept >= 95 ? "good" : kept >= 80 ? "warn" : "bad" },
      { label: "Storage needed", value: keep2 ? "100" : "50", unit: "%", status: keep2 ? "warn" : "good" },
      { label: "Reconstruction error (RMSE)", value: keep2 ? "0.00" : rmse.toFixed(2), status: keep2 ? "good" : rmse < 0.4 ? "good" : rmse < 0.9 ? "warn" : "bad" },
      { label: "Eigenvalues λ₁, λ₂", value: `${l1.toFixed(2)}, ${l2.toFixed(2)}` },
    ];
  },
});

/* =====================================================================  7. AEROSPACE — Vectors */
MODULES.push({
  id: "aero", disc: "Aerospace", icon: "✈️", math: "Vectors",
  title: "Will the aircraft climb, cruise or stall?",
  question: "Four force vectors act on an aircraft. Their vector sum decides what happens next.",
  eq: `F⃗ = L⃗ + D⃗ + T⃗ + W⃗, &nbsp; L = ½ρV²S·C<sub>L</sub>(α), &nbsp; D = ½ρV²S·C<sub>D</sub>, &nbsp; climb rate ≈ (T − D)·V / W`,
  eqNote: "Light aircraft: S = 16.2 m², aspect ratio 7.4, C<sub>L</sub> = 0.25 + 5α (stall above 15°), C<sub>D</sub> = 0.027 + C<sub>L</sub>²/(π·0.8·7.4), ISA air density.",
  controls: [
    { id: "V", label: "Airspeed V", min: 25, max: 90, step: 1, value: 50, unit: "m/s" },
    { id: "al", label: "Angle of attack α", min: -4, max: 20, step: 0.5, value: 2.5, unit: "°" },
    { id: "T", label: "Engine thrust T", min: 0, max: 4, step: 0.1, value: 2.2, unit: "kN" },
    { id: "alt", label: "Altitude", min: 0, max: 6000, step: 100, value: 1000, unit: "m" },
    { id: "m", label: "Mass (payload + fuel)", min: 800, max: 1400, step: 10, value: 1100, unit: "kg" },
  ],
  connect: [["Vector sum F⃗", "Net force: decides climb, descent or acceleration"], ["Components (resolving)", "Lift ⟂ flight path, drag ∥ flight path"], ["V² in L and D", "Doubling speed gives 4× lift — why take-off needs runway"], ["ρ(altitude)", "Thin air at height: less lift and less thrust"], ["α beyond 15°", "Flow separates → lift collapses = stall"]],
  tryThis: ["Find the slowest speed for level flight at 1100 kg (L = W) without stalling.", "Climb to 6000 m: what must change to keep L = W?", "Add 300 kg: how much faster must you fly for the same α?"],
  uses: ["Aircraft & drone performance", "Rocket trajectory, satellite orbits", "Wind loads on buildings and bridges"],
  run(p, mc, tc) {
    const S = 16.2, AR = 7.4, e = 0.8, g = 9.81, rho = 1.225 * Math.pow(1 - 2.2558e-5 * p.alt, 4.2559);
    const ar = p.al * Math.PI / 180, aStall = 15 * Math.PI / 180;
    const CL = ar <= aStall ? 0.25 + 5 * ar : Math.max(0.4, 0.25 + 5 * aStall - 4 * (ar - aStall));
    const CD = 0.027 + CL * CL / (Math.PI * e * AR) + (ar > aStall ? 0.15 : 0);
    const q = 0.5 * rho * p.V ** 2, L = q * S * CL / 1000, D = q * S * CD / 1000, W = p.m * g / 1000, T = p.T;
    const Fx = T - D, Fy = L - W, rc = (T - D) * p.V / W, stalled = p.al > 15;
    let { ctx, w, h } = setupCanvas(mc);
    // vector diagram (head-to-tail)
    const sc = (h * 0.62) / Math.max(W, L, 4), ox = w * 0.12, oy = h * 0.8;
    ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText("Head-to-tail vector sum (kN) · horizontal parts drawn ×4", 10, 16);
    let cx = ox, cy = oy; const hx = 4;
    const seq = [["T", T, 0, COL.green], ["L", 0, L, COL.blue], ["D", -D, 0, COL.orange], ["W", 0, -W, COL.violet]];
    for (const [nm, vx, vy, c] of seq) { const nx = cx + vx * sc * hx, ny = cy - vy * sc; arrow(ctx, cx, cy, nx, ny, c, 3, `${nm} = ${Math.hypot(vx, vy).toFixed(1)}`); cx = nx; cy = ny; }
    arrow(ctx, ox, oy, cx, cy, COL.cri, 4.5, null);
    ctx.fillStyle = COL.cri; ctx.font = "700 12.5px system-ui"; ctx.fillText(`Net force F = (${Fx.toFixed(2)}, ${Fy.toFixed(2)}) kN`, 10, h - 14);
    ctx.fillStyle = COL.cri; ctx.beginPath(); ctx.arc(ox, oy, 4, 0, 7); ctx.fill();
    // CL-alpha function
    const al = [...Array(49)].map((_, i) => -4 + i * 0.5), cl = al.map(a => { const r = a * Math.PI / 180; return r <= aStall ? 0.25 + 5 * r : Math.max(0.4, 0.25 + 5 * aStall - 4 * (r - aStall)); });
    const pw = Math.min(260, w * 0.42), ph = Math.min(170, h * 0.42);
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fillRect(w - pw - 6, h - ph - 6, pw + 4, ph + 4);
    linePlot(ctx, { x: w - pw - 4, y: h - ph - 4, w: pw, h: ph, title: "Function C_L(α)", xlabel: "α (°)", ymin: -0.2, ymax: 1.8, series: [{ x: al, y: cl, color: COL.blue }], vlines: [{ x: p.al, label: "α", color: stalled ? COL.bad : COL.cri }, { x: 15, label: "stall", color: COL.bad }], legend: false });
    // twin: aircraft
    ({ ctx, w, h } = setupCanvas(tc));
    const sky = Math.min(1, p.alt / 6000); ctx.fillStyle = `rgb(${Math.round(220 - 120 * sky)},${Math.round(236 - 110 * sky)},${Math.round(250 - 40 * sky)})`; ctx.fillRect(0, 0, w, h);
    const ax = w / 2, ay = h / 2, pitch = -ar, ks = Math.min(w, h) / 3.2 / Math.max(W, 1);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(pitch);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = COL.pur; ctx.lineWidth = 2; rrect(ctx, -90, -12, 180, 24, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.pur; ctx.beginPath(); ctx.moveTo(-80, -10); ctx.lineTo(-100, -40); ctx.lineTo(-70, -10); ctx.fill();
    ctx.fillStyle = "#c9bde3"; rrect(ctx, -25, -4, 70, 8, 3); ctx.fill(); ctx.restore();
    arrow(ctx, ax, ay, ax, ay - L * ks, COL.blue, 4, `Lift ${L.toFixed(1)} kN`);
    arrow(ctx, ax, ay, ax, ay + W * ks, COL.violet, 4, `Weight ${W.toFixed(1)} kN`);
    arrow(ctx, ax, ay, ax + T * ks * 3, ay, COL.green, 4, `Thrust ×3`);
    arrow(ctx, ax, ay, ax - D * ks * 3, ay, COL.orange, 4, `Drag ×3`);
    ctx.font = "700 15px system-ui"; ctx.fillStyle = stalled ? COL.bad : COL.ink;
    const verdict = stalled ? "⚠ STALL — lift collapses" : Fy > 0.05 * W ? (rc > 0 ? `Climbing ≈ ${rc.toFixed(1)} m/s` : "Pulling up, losing speed") : Fy < -0.05 * W ? "Sinking — lift < weight" : (rc > 0.3 ? `Level, can climb ${rc.toFixed(1)} m/s` : rc < -0.3 ? "Level but decelerating" : "Steady level flight");
    ctx.fillText(verdict, 14, h - 16); ctx.font = "12px system-ui"; ctx.fillStyle = COL.ink; ctx.fillText(`ρ = ${rho.toFixed(3)} kg/m³ at ${p.alt} m`, 14, 20);
    return [
      { label: "Lift / Weight", value: (L / W).toFixed(2), status: Math.abs(L / W - 1) <= 0.05 ? "good" : Math.abs(L / W - 1) <= 0.15 ? "warn" : "bad", note: "1.00 = level flight" },
      { label: "Rate of climb (excess power)", value: rc.toFixed(1), unit: "m/s", status: rc >= 2 ? "good" : rc >= 0 ? "warn" : "bad" },
      { label: "Aerodynamic efficiency L/D", value: (L / D).toFixed(1), status: L / D >= 10 ? "good" : L / D >= 7 ? "warn" : "bad" },
      { label: "Stall margin", value: (15 - p.al).toFixed(1), unit: "°", status: 15 - p.al >= 4 ? "good" : 15 - p.al >= 0 ? "warn" : "bad" },
    ];
  },
});

/* =====================================================================  8. CHEMISTRY — ODE system + optimisation */
MODULES.push({
  id: "chem", disc: "Chemical", icon: "⚗️", math: "ODE system & derivative = 0",
  title: "When to stop the reactor to get the most product",
  question: "A → B (product) → C (waste). Stop too early: unreacted A. Too late: B turns into waste.",
  eq: `dA/dt = −k₁A, &nbsp; dB/dt = k₁A − k₂B, &nbsp; dC/dt = k₂B &nbsp;·&nbsp; best time: dB/dt = 0 ⇒ t* = ln(k₂/k₁)/(k₂ − k₁) &nbsp;·&nbsp; k = k<sub>ref</sub>·e<sup>−(E<sub>a</sub>/R)(1/T − 1/T<sub>ref</sub>)</sup>`,
  eqNote: "Exact solution of the linear ODE system; Arrhenius temperature dependence with E<sub>a1</sub> = 60 kJ/mol, E<sub>a2</sub> = 90 kJ/mol (k₁ = 0.10, k₂ = 0.02 min⁻¹ at 350 K).",
  controls: [
    { id: "T", label: "Reactor temperature", min: 310, max: 390, step: 1, value: 340, unit: "K" },
    { id: "tb", label: "Batch time (when you stop)", min: 1, max: 180, step: 1, value: 30, unit: "min" },
  ],
  connect: [["System of ODEs", "Mass balance inside a batch reactor"], ["dB/dt = 0 (derivative)", "Optimal moment to stop and drain the reactor"], ["exp(−E<sub>a</sub>/RT) (function)", "Heating speeds both reactions — the waste one more (higher E<sub>a</sub>)"], ["B<sub>max</sub>", "Maximum yield → profit per batch"]],
  tryThis: ["Find the batch time that gives the maximum yield of B at 340 K.", "Heat to 380 K: faster, but what happens to the best possible yield?", "Which temperature gives at least 60% yield in under 30 minutes?"],
  uses: ["Pharmaceutical and fine-chemical batch reactors", "Fermentation (beer, antibiotics, vaccines)", "Drug concentration in the body (pharmacokinetics)"],
  run(p, mc, tc) {
    const R = 8.314, Tref = 350, k1 = 0.10 * Math.exp(-60000 / R * (1 / p.T - 1 / Tref)), k2 = 0.02 * Math.exp(-90000 / R * (1 / p.T - 1 / Tref));
    const A = t => Math.exp(-k1 * t), B = t => Math.abs(k2 - k1) < 1e-9 ? k1 * t * Math.exp(-k1 * t) : k1 / (k2 - k1) * (Math.exp(-k1 * t) - Math.exp(-k2 * t)), C = t => 1 - A(t) - B(t);
    const ts = Math.abs(k2 - k1) < 1e-9 ? 1 / k1 : Math.log(k2 / k1) / (k2 - k1), Bmax = B(ts);
    const tmax = Math.max(180, Math.min(400, ts * 3)), t = [...Array(301)].map((_, i) => i / 300 * tmax);
    let { ctx, w, h } = setupCanvas(mc);
    linePlot(ctx, { x: 0, y: 0, w, h: h * 0.62, title: `A(t), B(t), C(t) · red line: best time t* = ${ts.toFixed(0)} min · orange: you stop`, ylabel: "fraction", xlabel: "time (min)", ymin: 0, ymax: 1.05,
      series: [{ x: t, y: t.map(A), color: COL.blue, label: "A (reactant)" }, { x: t, y: t.map(B), color: COL.green, width: 3, label: "B (product)" }, { x: t, y: t.map(C), color: COL.muted, label: "C (waste)" }],
      vlines: [{ x: ts, label: "", color: COL.cri }, { x: p.tb, label: "", color: COL.orange }] });
    linePlot(ctx, { x: 0, y: h * 0.64, w, h: h * 0.36, title: "dB/dt — crosses zero at the best stopping time", ylabel: "per min", xlabel: "time (min)", series: [{ x: t, y: t.map(v => k1 * A(v) - k2 * B(v)), color: COL.violet }], vlines: [{ x: ts, label: "", color: COL.cri }], legend: false });
    this._s = { a: A(p.tb), b: B(p.tb), c: C(p.tb), T: p.T };
    const yb = B(p.tb);
    return [
      { label: "Yield of B when you stop", value: (yb * 100).toFixed(1), unit: "%", status: yb >= 0.95 * Bmax ? "good" : yb >= 0.8 * Bmax ? "warn" : "bad", note: `best possible ${(Bmax * 100).toFixed(1)}%` },
      { label: "Optimal batch time t*", value: ts.toFixed(1), unit: "min" },
      { label: "Waste C formed", value: (C(p.tb) * 100).toFixed(1), unit: "%", status: status(C(p.tb) * 100, 15, 30) },
      { label: "Rate constants k₁, k₂", value: `${k1.toFixed(3)}, ${k2.toFixed(3)}`, unit: "min⁻¹" },
    ];
  },
  frame(time, p, tc) {
    const s = this._s; if (!s) return;
    const { ctx, w, h } = setupCanvas(tc);
    const vx = w / 2 - 90, vy = 40, vw = 180, vh = h - 90;
    ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText("Batch reactor at the moment you stop", 12, 18);
    // liquid layers
    const lh = vh * 0.85, base = vy + vh;
    [[s.c, "#9a96a6", "C waste"], [s.b, "#1baf7a", "B product"], [s.a, "#2a78d6", "A reactant"]].reduce((y, [f, c, lab]) => { const hh = f * lh; ctx.fillStyle = c; ctx.fillRect(vx + 4, y - hh, vw - 8, hh); if (hh > 16) { ctx.fillStyle = "#fff"; ctx.font = "700 12px system-ui"; ctx.fillText(`${lab} ${(f * 100).toFixed(0)}%`, vx + 14, y - hh / 2 + 4); } return y - hh; }, base - 4);
    ctx.strokeStyle = COL.pur; ctx.lineWidth = 4; rrect(ctx, vx, vy, vw, vh, 16); ctx.stroke();
    // stirrer
    const a = time * 4; ctx.strokeStyle = "#555"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w / 2, vy - 20); ctx.lineTo(w / 2, base - 40); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(w / 2 - 40 * Math.cos(a), base - 40 - 6 * Math.sin(a)); ctx.lineTo(w / 2 + 40 * Math.cos(a), base - 40 + 6 * Math.sin(a)); ctx.stroke();
    // thermometer
    const tx = vx + vw + 40, frac = (s.T - 300) / 100; ctx.fillStyle = "#eee"; rrect(ctx, tx, vy, 14, vh - 20, 7); ctx.fill();
    ctx.fillStyle = heatColor(frac); rrect(ctx, tx, vy + (vh - 20) * (1 - frac), 14, (vh - 20) * frac, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + 7, vy + vh - 12, 12, 0, 7); ctx.fill(); ctx.fillStyle = COL.ink; ctx.font = "700 12px system-ui"; ctx.fillText(`${s.T} K`, tx + 22, vy + 14);
  },
});

/* =====================================================================  9. BIOLOGY — nonlinear ODE (SIR) */
MODULES.push({
  id: "bio", disc: "Biology & Health", icon: "🧬", math: "Nonlinear ODE system",
  title: "Will the hospitals cope with an epidemic?",
  question: "The SIR equations predict the peak of infections — and how vaccination and distancing flatten it.",
  eq: `dS/dt = −β S I / N, &nbsp; dI/dt = β S I / N − γ I, &nbsp; dR/dt = γ I &nbsp;·&nbsp; R<sub>e</sub> = (β/γ)·S/N`,
  eqNote: "City of 10 lakh people, 10 initial cases, RK4 with Δt = 0.25 day. Assumes 3% of active cases need a hospital bed; 2,500 beds available.",
  controls: [
    { id: "R0", label: "Basic reproduction number R₀", min: 1, max: 6, step: 0.1, value: 3, unit: "" },
    { id: "days", label: "Infectious period", min: 3, max: 14, step: 1, value: 7, unit: "days" },
    { id: "vac", label: "Vaccinated before outbreak", min: 0, max: 90, step: 1, value: 0, unit: "%" },
    { id: "dist", label: "Contact reduction (masks, distancing)", min: 0, max: 70, step: 1, value: 0, unit: "%" },
  ],
  connect: [["β S I (nonlinear term)", "Infection needs contact between infected and susceptible people"], ["γ = 1/infectious period", "Recovery rate"], ["R<sub>e</sub> < 1", "Outbreak dies out — herd immunity"], ["Peak of I(t) (dI/dt = 0)", "Maximum hospital load"], ["Area under I(t)", "Total sick-days — economic cost"]],
  tryThis: ["What vaccination level stops the outbreak for R₀ = 3? Compare with 1 − 1/R₀.", "Keep hospital load under capacity using the least distancing.", "Why does a longer infectious period make things worse even with the same R₀?"],
  uses: ["Epidemic planning (COVID-19, dengue, flu)", "Spread of information/rumours on networks", "Computer-virus propagation, ecology (predator–prey)"],
  run(p, mc, tc) {
    const N = 1e6, gamma = 1 / p.days, beta = p.R0 * gamma * (1 - p.dist / 100), dt = 0.25, D = 300, cap = 2500 / 0.03;
    let S = N * (1 - p.vac / 100) - 10, I = 10, R = N * p.vac / 100;
    const T = [], SS = [], II = [], RR = [];
    const f = (S, I) => [-beta * S * I / N, beta * S * I / N - gamma * I];
    for (let i = 0; i <= D / dt; i++) {
      if (i % 4 === 0) { T.push(i * dt); SS.push(S / N * 100); II.push(I / N * 100); RR.push(R / N * 100); }
      const [a1, b1] = f(S, I), [a2, b2] = f(S + a1 * dt / 2, I + b1 * dt / 2), [a3, b3] = f(S + a2 * dt / 2, I + b2 * dt / 2), [a4, b4] = f(S + a3 * dt, I + b3 * dt);
      const dS = dt / 6 * (a1 + 2 * a2 + 2 * a3 + a4), dI = dt / 6 * (b1 + 2 * b2 + 2 * b3 + b4); S += dS; I += dI; R -= dS + dI;
    }
    const peak = Math.max(...II), peakDay = T[II.indexOf(peak)], over = II.filter(v => v / 100 * N > cap).length, total = RR[RR.length - 1] - p.vac + II[II.length - 1];
    const Re = p.R0 * (1 - p.dist / 100) * (1 - p.vac / 100);
    this._s = { T, SS, II, RR, cap: cap / N * 100 };
    const { ctx, w, h } = setupCanvas(mc);
    linePlot(ctx, { x: 0, y: 0, w, h: h * 0.6, title: "S(t), I(t), R(t) — share of the city (%)", ylabel: "%", xlabel: "day", ymin: 0, ymax: 100,
      series: [{ x: T, y: SS, color: COL.blue, label: "Susceptible" }, { x: T, y: II, color: COL.red, width: 3, label: "Infected" }, { x: T, y: RR, color: COL.green, label: "Recovered / immune" }] });
    linePlot(ctx, { x: 0, y: h * 0.62, w, h: h * 0.38, title: "Active cases vs hospital capacity (zoom)", ylabel: "% infected", xlabel: "day", ymin: 0, ymax: Math.max(this._s.cap * 1.6, peak * 1.1),
      series: [{ x: T, y: II, color: COL.red, width: 2.5, fill: true }], hlines: [{ y: this._s.cap, label: "hospital capacity" }], vlines: [{ x: peakDay, label: `peak day ${peakDay.toFixed(0)}`, color: COL.cri }], legend: false });
    return [
      { label: "Effective R<sub>e</sub>", value: Re.toFixed(2), status: Re < 1 ? "good" : Re < 1.5 ? "warn" : "bad", note: `herd immunity at ${(100 * (1 - 1 / p.R0)).toFixed(0)}% immune` },
      { label: "Peak active cases", value: peak.toFixed(1), unit: "% of city", status: peak / 100 * N <= cap ? "good" : peak / 100 * N <= 2 * cap ? "warn" : "bad", note: peak > 0.05 ? `on day ${peakDay.toFixed(0)}` : "no real outbreak" },
      { label: "Days hospitals overloaded", value: over, unit: "days", status: over === 0 ? "good" : over < 20 ? "warn" : "bad" },
      { label: "Total ever infected", value: Math.max(0, total).toFixed(0), unit: "%", status: status(total, 10, 40) },
    ];
  },
  frame(time, p, tc) {
    const s = this._s; if (!s) return;
    const { ctx, w, h } = setupCanvas(tc);
    const idx = Math.floor((time * 18) % s.T.length), day = s.T[idx];
    const cols = 25, rows = 16, cell = Math.min((w - 30) / cols, (h - 132) / rows), ox = 14, oy = 34;
    ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText(`City twin — day ${day.toFixed(0)} (each dot ≈ 2,500 people)`, 12, 18);
    if (!this._ord) { const r = mulberry(3); this._ord = [...Array(cols * rows)].map((_, i) => [r(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]); }
    const nI = Math.round(s.II[idx] / 100 * cols * rows), nR = Math.round(s.RR[idx] / 100 * cols * rows);
    const state = new Array(cols * rows).fill(0); this._ord.forEach((id, k) => { state[id] = k < nR ? 2 : k < nR + nI ? 1 : 0; });
    for (let i = 0; i < cols * rows; i++) { const x = ox + (i % cols) * cell + cell / 2, y = oy + Math.floor(i / cols) * cell + cell / 2; ctx.fillStyle = [COL.blue, COL.red, COL.green][state[i]]; ctx.beginPath(); ctx.arc(x, y, cell * 0.36, 0, 7); ctx.fill(); }
    const by = oy + rows * cell + 16, beds = s.II[idx] / s.cap;
    ctx.fillStyle = COL.ink; ctx.font = "12px system-ui"; ctx.fillText(`🏥 Hospital beds in use: ${Math.round(Math.min(beds, 9.99) * 100)}% of capacity`, 14, by + 12);
    ctx.fillStyle = "#eee"; ctx.fillRect(14, by + 20, w - 40, 14); ctx.fillStyle = beds <= 0.8 ? COL.good : beds <= 1 ? COL.warn : COL.bad; ctx.fillRect(14, by + 20, Math.min(1, beds / 2) * (w - 40), 14);
    ctx.strokeStyle = COL.ink; ctx.beginPath(); ctx.moveTo(14 + (w - 40) / 2, by + 16); ctx.lineTo(14 + (w - 40) / 2, by + 38); ctx.stroke(); ctx.fillStyle = COL.ink; ctx.fillText("100%", 14 + (w - 40) / 2 - 14, by + 52);
    ctx.font = "11.5px system-ui"; let lx = 14; [[COL.blue, "susceptible"], [COL.red, "infected"], [COL.green, "recovered / immune"]].forEach(([c, l]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(lx + 5, by + 68, 5, 0, 7); ctx.fill(); ctx.fillStyle = COL.ink; ctx.fillText(l, lx + 14, by + 72); lx += ctx.measureText(l).width + 34; });
  },
});

/* =====================================================================  10. QUANTUM — Eigenvalues */
MODULES.push({
  id: "quantum", disc: "Quantum & Materials", icon: "⚛️", math: "Eigenvalues & matrices",
  title: "Quantum dots: the size of a crystal sets its colour (QLED displays)",
  question: "Energy levels are eigenvalues of the Schrödinger equation. Shrink the box → levels spread → bluer light.",
  eq: `Ĥψ = Eψ, &nbsp; Ĥ = −(ħ²/2m) d²/dx² &nbsp;⇒&nbsp; E<sub>n</sub> = n²h²/(8mL²) &nbsp;·&nbsp; on a grid Ĥ ≈ (ħ²/2mΔx²)·tridiag(−1, 2, −1) &nbsp;·&nbsp; λ = hc / E<sub>gap</sub>`,
  eqNote: "Particle-in-a-box model: E<sub>gap</sub> = E<sub>g,bulk</sub> + (h²/8L²)(1/m<sub>e</sub> + 1/m<sub>h</sub>). A simple teaching model — real dots also need Coulomb and shape corrections.",
  controls: [
    { id: "L", label: "Quantum-dot size L", min: 1.5, max: 9, step: 0.1, value: 4, unit: "nm" },
    { id: "mat", label: "Material", type: "select", value: "CdSe", options: [["CdSe", "CdSe (visible)"], ["InP", "InP (cadmium-free)"], ["PbS", "PbS (infrared)"]] },
    { id: "N", label: "Matrix size N (numerical eigenvalues)", min: 3, max: 60, step: 1, value: 8, unit: "" },
  ],
  connect: [["Eigenvalue E<sub>n</sub>", "Allowed electron energy levels in the crystal"], ["Eigenvector ψ<sub>n</sub>", "Where the electron is likely to be"], ["E ∝ 1/L²", "Smaller dots emit bluer light"], ["N × N matrix eigenvalues", "How simulation software computes levels for any shape"], ["E<sub>gap</sub> → λ = 1240/E", "Colour of a QLED pixel, absorption of a solar cell"]],
  tryThis: ["Pick the CdSe size that gives pure green (≈ 530 nm) for a display.", "Increase N: how quickly do the matrix eigenvalues approach the exact n² values?", "Why is PbS used for infrared night-vision cameras rather than TV screens?"],
  uses: ["QLED TVs, biomedical imaging dyes", "Solar cells and photodetectors", "Semiconductor & nano-device design"],
  run(p, mc, tc) {
    const MAT = { CdSe: [1.74, 0.13, 0.45], InP: [1.34, 0.08, 0.6], PbS: [0.41, 0.085, 0.085] }[p.mat];
    const conf = 0.376 / (p.L * p.L) * (1 / MAT[1] + 1 / MAT[2]), Eg = MAT[0] + conf, lam = 1239.84 / Eg;
    const Ee = n => 0.376 * n * n / (p.L * p.L * MAT[1]);
    const num = n => Ee(1) * ((p.N + 1) ** 2 / (Math.PI ** 2)) * (2 - 2 * Math.cos(n * Math.PI / (p.N + 1)));
    let { ctx, w, h } = setupCanvas(mc);
    // well with levels & wavefunctions
    const pw = w * 0.58, X0 = 50, X1 = pw - 10, top = 30, bot = h - 40, Emax = Ee(4) * 1.05, Y = e => bot - e / Emax * (bot - top);
    ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText("Energy levels E₁–E₃ and wavefunctions ψₙ(x)", 10, 16);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X0, top); ctx.lineTo(X0, bot); ctx.lineTo(X1, bot); ctx.lineTo(X1, top); ctx.stroke();
    [COL.blue, COL.orange, COL.aqua].forEach((c, k) => {
      const n = k + 1, e = Ee(n), yy = Y(e);
      ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X0, yy); ctx.lineTo(X1, yy); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 100; i++) { const xx = X0 + i / 100 * (X1 - X0), ps = Math.sin(n * Math.PI * i / 100); i ? ctx.lineTo(xx, yy - ps * 26) : ctx.moveTo(xx, yy); } ctx.stroke();
      ctx.fillStyle = c; ctx.font = "700 12px system-ui"; ctx.fillText(`E${n} = ${e.toFixed(2)} eV`, X1 + 6 - 100, yy - 30 + (n === 1 ? 0 : 0));
    });
    ctx.fillStyle = COL.muted; ctx.font = "11px system-ui"; ctx.fillText(`width L = ${p.L} nm`, (X0 + X1) / 2 - 40, bot + 16);
    // matrix sparsity + eigenvalue comparison
    const mx = pw + 20, mw = w - mx - 10, cs = Math.min(mw / p.N, (h * 0.45) / p.N);
    ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText(`Hamiltonian matrix (${p.N} × ${p.N})`, mx, 16);
    for (let i = 0; i < p.N; i++) for (let j = 0; j < p.N; j++) { ctx.fillStyle = i === j ? COL.pur : Math.abs(i - j) === 1 ? "#c9bde3" : "#f4f0fa"; ctx.fillRect(mx + j * cs, 26 + i * cs, cs - (cs > 4 ? 1 : 0), cs - (cs > 4 ? 1 : 0)); }
    const ty = 26 + p.N * cs + 22; ctx.fillStyle = COL.ink; ctx.font = "600 12px system-ui"; ctx.fillText("Matrix eigenvalue vs exact", mx, ty);
    ctx.font = "12px system-ui";
    [1, 2, 3].forEach((n, k) => { const err = (num(n) - Ee(n)) / Ee(n) * 100; ctx.fillStyle = [COL.blue, COL.orange, COL.aqua][k]; ctx.fillText(`E${n}: ${num(n).toFixed(3)} vs ${Ee(n).toFixed(3)} eV (${err.toFixed(1)}%)`, mx, ty + 18 + k * 17); });
    ({ ctx, w, h } = setupCanvas(tc));
    const col = wavelengthToRGB(lam), visible = lam >= 380 && lam <= 780;
    ctx.fillStyle = "#16121f"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff"; ctx.font = "600 12.5px system-ui"; ctx.fillText("QLED pixel glowing (UV/blue backlight excites the dots)", 12, 18);
    const cx = w * 0.3, cy = h * 0.45, R = 18 + p.L * 7;
    const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, R * 2.4); grd.addColorStop(0, visible ? col : "#333"); grd.addColorStop(0.45, visible ? col : "#222"); grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, R * 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = visible ? col : "#555"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "12px system-ui"; ctx.fillText(`dot ≈ ${p.L} nm`, cx - 30, cy + R * 2.4 + 6);
    if (!visible) { ctx.fillStyle = "#f3c6da"; ctx.font = "700 13px system-ui"; ctx.fillText("invisible: infrared light", cx - 70, cy + 4); }
    // spectrum bar
    const sx = w * 0.56, sw = w * 0.4, sy = h * 0.3;
    for (let i = 0; i < sw; i++) { ctx.fillStyle = wavelengthToRGB(380 + i / sw * 400); ctx.fillRect(sx + i, sy, 1.2, 26); }
    ctx.fillStyle = "#fff"; ctx.font = "11px system-ui"; ctx.fillText("380 nm", sx, sy + 42); ctx.fillText("780 nm", sx + sw - 40, sy + 42);
    const mxp = sx + Math.max(0, Math.min(1, (lam - 380) / 400)) * sw; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(mxp, sy - 4); ctx.lineTo(mxp - 7, sy - 16); ctx.lineTo(mxp + 7, sy - 16); ctx.fill();
    ctx.font = "700 14px system-ui"; ctx.fillText(`${lam.toFixed(0)} nm`, mxp - 24, sy - 22);
    const name = lam < 450 ? "violet/blue" : lam < 495 ? "blue" : lam < 570 ? "green" : lam < 590 ? "yellow" : lam < 620 ? "orange" : lam <= 780 ? "red" : "infrared";
    ctx.font = "13px system-ui"; ctx.fillText(`Colour: ${name}`, sx, sy + 72); ctx.fillText(`Band gap: ${Eg.toFixed(2)} eV (bulk ${MAT[0]} eV)`, sx, sy + 92);
    return [
      { label: "Band gap E<sub>gap</sub>", value: Eg.toFixed(2), unit: "eV" },
      { label: "Emission wavelength", value: lam.toFixed(0), unit: "nm", status: visible ? "good" : "warn", note: name },
      { label: "Confinement energy (∝ 1/L²)", value: conf.toFixed(2), unit: "eV" },
      { label: "Matrix eigenvalue error (E₁)", value: Math.abs((num(1) - Ee(1)) / Ee(1) * 100).toFixed(2), unit: "%", status: status(Math.abs((num(1) - Ee(1)) / Ee(1) * 100), 1, 5), note: `N = ${p.N}` },
    ];
  },
});
