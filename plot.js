/* Small canvas plotting helpers (no external libraries) */
"use strict";
const COL = { blue: "#2a78d6", orange: "#eb6834", aqua: "#1baf7a", yellow: "#eda100", magenta: "#e87ba4", green: "#008300", violet: "#6250d6", red: "#e34948",
  pur: "#331a6a", cri: "#9d1d59", ink: "#2b2b3a", muted: "#7a7388", grid: "#ece8f2", good: "#0ca30c", warn: "#fab219", bad: "#d03b3b" };

function setupCanvas(c) {
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  ctx.font = "12px system-ui, sans-serif"; ctx.lineJoin = "round"; ctx.lineCap = "round";
  return { ctx, w, h };
}
function niceStep(range, n = 5) {
  const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}
function fmt(v) { const a = Math.abs(v); return a >= 1000 ? (v / 1000).toFixed(a >= 10000 ? 0 : 1) + "k" : a >= 10 ? v.toFixed(0) : a >= 1 ? v.toFixed(1).replace(/\.0$/, "") : a === 0 ? "0" : v.toPrecision(2); }

/* Line plot inside a rectangle of an existing context.
   opts: {x,y,w,h, xmin,xmax,ymin,ymax, xlabel,ylabel,title, series:[{x,y,color,width,dash,label,fill}], hlines:[{y,label,color}], vlines:[{x,label,color}], legend:true} */
function linePlot(ctx, o) {
  const m = { l: 46, r: 12, t: o.title ? 22 : 10, b: o.xlabel ? 34 : 20 };
  const X0 = o.x + m.l, Y0 = o.y + m.t, W = o.w - m.l - m.r, H = o.h - m.t - m.b;
  let xmin = o.xmin, xmax = o.xmax, ymin = o.ymin, ymax = o.ymax;
  const allX = o.series.flatMap(s => s.x), allY = o.series.flatMap(s => s.y).filter(v => isFinite(v));
  if (xmin == null) xmin = Math.min(...allX); if (xmax == null) xmax = Math.max(...allX);
  if (ymin == null) ymin = Math.min(0, ...allY); if (ymax == null) ymax = Math.max(...allY) * 1.08 || 1;
  if (ymax === ymin) ymax = ymin + 1;
  const X = v => X0 + (v - xmin) / (xmax - xmin) * W, Y = v => Y0 + (1 - (v - ymin) / (ymax - ymin)) * H;
  if (o.title) { ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText(o.title, X0, o.y + 14); ctx.font = "12px system-ui"; }
  // grid + ticks
  const ys = niceStep(ymax - ymin, Math.max(2, Math.round(H / 45))), xs = niceStep(xmax - xmin, Math.max(2, Math.round(W / 80)));
  ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; ctx.fillStyle = COL.muted; ctx.font = "11px system-ui";
  ctx.textAlign = "right";
  for (let v = Math.ceil(ymin / ys) * ys; v <= ymax + 1e-9; v += ys) { ctx.beginPath(); ctx.moveTo(X0, Y(v)); ctx.lineTo(X0 + W, Y(v)); ctx.stroke(); ctx.fillText(fmt(v), X0 - 6, Y(v) + 4); }
  ctx.textAlign = "center";
  for (let v = Math.ceil(xmin / xs) * xs; v <= xmax + 1e-9; v += xs) ctx.fillText(fmt(v), X(v), Y0 + H + 14);
  if (ymin < 0 && ymax > 0) { ctx.strokeStyle = "#bdb5cc"; ctx.beginPath(); ctx.moveTo(X0, Y(0)); ctx.lineTo(X0 + W, Y(0)); ctx.stroke(); }
  if (o.xlabel) { ctx.fillStyle = COL.ink; ctx.font = "600 11.5px system-ui"; ctx.fillText(o.xlabel, X0 + W / 2, Y0 + H + 29); }
  if (o.ylabel) { ctx.save(); ctx.translate(o.x + 11, Y0 + H / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = COL.ink; ctx.font = "600 11.5px system-ui"; ctx.fillText(o.ylabel, 0, 0); ctx.restore(); }
  ctx.textAlign = "left"; ctx.font = "12px system-ui";
  // reference lines
  for (const hl of o.hlines || []) { ctx.strokeStyle = hl.color || COL.bad; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X0, Y(hl.y)); ctx.lineTo(X0 + W, Y(hl.y)); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = hl.color || COL.bad; ctx.font = "700 11px system-ui"; ctx.textAlign = "right"; ctx.fillText(hl.label || "", X0 + W - 2, Y(hl.y) - 4); ctx.textAlign = "left"; ctx.font = "12px system-ui"; }
  for (const vl of o.vlines || []) { ctx.strokeStyle = vl.color || COL.cri; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(vl.x), Y0); ctx.lineTo(X(vl.x), Y0 + H); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = vl.color || COL.cri; ctx.font = "700 11px system-ui"; ctx.fillText(vl.label || "", X(vl.x) + 4, Y0 + 11); ctx.font = "12px system-ui"; }
  // series
  ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0 - 2, W, H + 4); ctx.clip();
  for (const s of o.series) {
    if (s.fill) { ctx.globalAlpha = 0.15; ctx.fillStyle = s.color; ctx.beginPath(); ctx.moveTo(X(s.x[0]), Y(Math.max(ymin, 0))); s.x.forEach((xv, i) => ctx.lineTo(X(xv), Y(s.y[i]))); ctx.lineTo(X(s.x[s.x.length - 1]), Y(Math.max(ymin, 0))); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []); ctx.beginPath();
    s.x.forEach((xv, i) => { const yv = s.y[i]; if (!isFinite(yv)) return; i ? ctx.lineTo(X(xv), Y(yv)) : ctx.moveTo(X(xv), Y(yv)); });
    ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
  // legend
  if (o.legend !== false && o.series.some(s => s.label)) {
    let lx = X0 + 6, ly = Y0 + 6; ctx.font = "11.5px system-ui";
    for (const s of o.series.filter(s => s.label)) {
      const tw = ctx.measureText(s.label).width;
      if (lx + tw + 30 > X0 + W) { lx = X0 + 6; ly += 15; }
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(lx - 3, ly - 2, tw + 28, 14);
      ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.setLineDash(s.dash || []); ctx.beginPath(); ctx.moveTo(lx, ly + 5); ctx.lineTo(lx + 16, ly + 5); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COL.ink; ctx.fillText(s.label, lx + 21, ly + 9); lx += tw + 36;
    }
  }
  return { X, Y, X0, Y0, W, H };
}

function barPlot(ctx, o) {   // o: {x,y,w,h, labels[], values[], colors[], title, ylabel, ymax}
  const m = { l: 46, r: 10, t: o.title ? 22 : 10, b: 30 };
  const X0 = o.x + m.l, Y0 = o.y + m.t, W = o.w - m.l - m.r, H = o.h - m.t - m.b;
  const ymax = o.ymax || Math.max(...o.values) * 1.12 || 1;
  if (o.title) { ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText(o.title, X0, o.y + 14); }
  const ys = niceStep(ymax, 4); ctx.font = "11px system-ui"; ctx.textAlign = "right";
  for (let v = 0; v <= ymax + 1e-9; v += ys) { const yy = Y0 + H - v / ymax * H; ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X0, yy); ctx.lineTo(X0 + W, yy); ctx.stroke(); ctx.fillStyle = COL.muted; ctx.fillText(fmt(v), X0 - 6, yy + 4); }
  const n = o.values.length, bw = W / n;
  ctx.textAlign = "center";
  o.values.forEach((v, i) => {
    const bh = Math.max(0, v) / ymax * H, x = X0 + i * bw + 2, y = Y0 + H - bh;
    ctx.fillStyle = (o.colors && o.colors[i]) || COL.pur;
    const r = Math.min(4, bh / 2, (bw - 4) / 2); ctx.beginPath(); ctx.moveTo(x, Y0 + H); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.lineTo(x + bw - 4 - r, y); ctx.quadraticCurveTo(x + bw - 4, y, x + bw - 4, y + r); ctx.lineTo(x + bw - 4, Y0 + H); ctx.fill();
    if (o.labels && (n <= 16 || i % 2 === 0)) { ctx.fillStyle = COL.muted; ctx.fillText(o.labels[i], x + (bw - 4) / 2, Y0 + H + 14); }
  });
  if (o.ylabel) { ctx.save(); ctx.translate(o.x + 11, Y0 + H / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = COL.ink; ctx.font = "600 11.5px system-ui"; ctx.fillText(o.ylabel, 0, 0); ctx.restore(); }
  if (o.xlabel) { ctx.fillStyle = COL.ink; ctx.font = "600 11.5px system-ui"; ctx.fillText(o.xlabel, X0 + W / 2, Y0 + H + 28); }
  ctx.textAlign = "left";
}

function arrow(ctx, x1, y1, x2, y2, color, width = 3, label, head = 10) {
  const a = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  if (len < 2) return;
  const hx = x2 - Math.cos(a) * head * 0.8, hy = y2 - Math.sin(a) * head * 0.8;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4)); ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
  if (label) { ctx.font = "700 12px system-ui"; ctx.fillText(label, x2 + 6 * Math.cos(a) + (Math.cos(a) < 0 ? -ctx.measureText(label).width : 0), y2 + 6 * Math.sin(a) + 4); }
}
function heatColor(t) {   // 0..1 → blue→yellow→red
  const stops = [[0, [43, 90, 200]], [0.35, [27, 175, 122]], [0.6, [237, 200, 40]], [0.8, [235, 104, 52]], [1, [200, 30, 40]]];
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
    const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], f = (t - t0) / (t1 - t0);
    return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * f)).join(",")})`;
  }
  return "rgb(200,30,40)";
}
function wavelengthToRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else if (nm <= 780) { r = 1; }
  let f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (780 - nm) / 80 : 1;
  if (nm < 380 || nm > 780) f = 0.15;
  return `rgb(${Math.round(255 * Math.pow(r * f, 0.8))},${Math.round(255 * Math.pow(g * f, 0.8))},${Math.round(255 * Math.pow(b * f, 0.8))})`;
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(rnd) { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
