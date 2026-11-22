/* AI & LLM section: eight modules showing the maths inside modern AI. Toy models, clearly labelled. */
"use strict";

/* ---------- shared helpers ---------- */
const AI_IMG = {};
function aiImage(kind) {               // 128×128 RGB picture drawn procedurally → Float32Array (r,g,b in 0..1)
  if (AI_IMG[kind]) return AI_IMG[kind];
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  if (kind === "digit") {
    g.fillStyle = "#000"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#fff"; g.lineWidth = 14; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(30, 28); g.lineTo(98, 28); g.lineTo(52, 108); g.stroke(); g.lineWidth = 9; g.beginPath(); g.moveTo(48, 68); g.lineTo(86, 68); g.stroke();
  } else if (kind === "face") {
    g.fillStyle = "#2a78d6"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#f5c518"; g.beginPath(); g.arc(64, 64, 48, 0, 7); g.fill();
    g.fillStyle = "#222"; g.beginPath(); g.arc(46, 52, 7, 0, 7); g.arc(82, 52, 7, 0, 7); g.fill();
    g.strokeStyle = "#9d1d59"; g.lineWidth = 7; g.beginPath(); g.arc(64, 66, 26, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  } else {
    g.fillStyle = "#9ccbf0"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#3d9a3d"; g.fillRect(0, 96, 128, 32);
    g.fillStyle = "#f5c518"; g.beginPath(); g.arc(104, 22, 12, 0, 7); g.fill();
    g.fillStyle = "#c8a27a"; g.fillRect(28, 60, 64, 40); g.fillStyle = "#c0392b"; g.beginPath(); g.moveTo(20, 62); g.lineTo(60, 26); g.lineTo(100, 62); g.fill();
    g.fillStyle = "#5b3a1e"; g.fillRect(52, 74, 16, 26); g.fillStyle = "#e8f4ff"; g.fillRect(34, 68, 12, 12); g.fillRect(74, 68, 12, 12);
  }
  const d = g.getImageData(0, 0, 128, 128).data, out = new Float32Array(128 * 128 * 3);
  for (let i = 0; i < 128 * 128; i++) { out[i * 3] = d[i * 4] / 255; out[i * 3 + 1] = d[i * 4 + 1] / 255; out[i * 3 + 2] = d[i * 4 + 2] / 255; }
  return (AI_IMG[kind] = out);
}
function downsample(src, N) {          // block-average 128×128 → N×N
  const out = new Float32Array(N * N * 3);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x0 = Math.floor(i * 128 / N), x1 = Math.floor((i + 1) * 128 / N), y0 = Math.floor(j * 128 / N), y1 = Math.floor((j + 1) * 128 / N); let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = (y * 128 + x) * 3; r += src[k]; g += src[k + 1]; b += src[k + 2]; n++; }
    out[(j * N + i) * 3] = r / n; out[(j * N + i) * 3 + 1] = g / n; out[(j * N + i) * 3 + 2] = b / n;
  }
  return out;
}
const rgbStr = (a, k) => `rgb(${Math.round(a[k] * 255)},${Math.round(a[k + 1] * 255)},${Math.round(a[k + 2] * 255)})`;
const gray = (a, k) => 0.299 * a[k] + 0.587 * a[k + 1] + 0.114 * a[k + 2];
function divColor(t) {                 // -1 blue · 0 light grey · +1 red
  t = Math.max(-1, Math.min(1, t)); const A = t < 0 ? [42, 120, 214] : [227, 73, 72], B = [242, 240, 245], s = Math.abs(t);
  return `rgb(${Math.round(B[0] + (A[0] - B[0]) * s)},${Math.round(B[1] + (A[1] - B[1]) * s)},${Math.round(B[2] + (A[2] - B[2]) * s)})`;
}
function title(ctx, txt, x = 10, y = 16) { ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.fillText(txt, x, y); ctx.font = "12px system-ui"; }
const PICS = [["digit", "Handwritten digit 7"], ["face", "Smiley face"], ["house", "House photo"]];

/* =====================================================================  A1. TEXT → TOKENS → VECTORS */
const TOK_VOCAB = ["engineer", "design", "machine", "that", "make", "life", "eas", "ier", "un", "believ", "ably", "the", "transform", "understood", "question", "student", "learn", "mathematic", "for", "artificial", "intelligen", "ce", "ru", "as", "er", "s", "ing", "ed", "ly", "tion", "al", "es"];
function toyTokenize(text) {
  const out = []; const parts = text.match(/\s*[A-Za-z]+|\s*[^\sA-Za-z]/g) || [];
  for (const raw of parts) {
    const sp = /^\s/.test(raw), w = raw.trim();
    if (!/^[A-Za-z]+$/.test(w)) { out.push((sp ? "▁" : "") + w); continue; }
    let s = w.toLowerCase(), first = true;
    while (s.length) {
      let m = TOK_VOCAB.filter(v => s.startsWith(v)).sort((a, b) => b.length - a.length)[0] || s.slice(0, Math.min(3, s.length));
      out.push((first && sp ? "▁" : "") + m); s = s.slice(m.length); first = false;
    }
  }
  return out;
}
const tokId = t => { let h = 2166136261; for (const ch of t) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 50000; };
const EMB = { man: [2.2, 0.6], woman: [2.2, 1.6], king: [3.4, 0.6], queen: [3.4, 1.6], student: [1.5, 1.1], teacher: [1.8, 1.5],
  machine: [-0.6, 2.6], motor: [-1.0, 2.95], bridge: [0.3, 3.1], engineer: [0.7, 2.5], design: [-0.1, 2.3],
  transformer: [-2.6, 0.5], neural: [-2.4, -0.4], model: [-2.0, 0.1], data: [-2.8, -0.9], intelligence: [-2.1, 1.0],
  cat: [0.8, -2.4], dog: [1.2, -2.7], horse: [1.9, -2.2], river: [-0.9, -2.6], rain: [-1.4, -2.3] };
const EMB_GROUP = w => ["man", "woman", "king", "queen", "student", "teacher"].includes(w) ? COL.violet : ["machine", "motor", "bridge", "engineer", "design"].includes(w) ? COL.orange : ["transformer", "neural", "model", "data", "intelligence"].includes(w) ? COL.blue : ["cat", "dog", "horse"].includes(w) ? COL.aqua : COL.green;
const wordOpts = Object.keys(EMB).map(w => [w, w]);
MODULES.push({
  id: "tokens", group: "ai", disc: "Text → tokens → vectors", icon: "🔤", math: "Vectors & cosine similarity",
  title: "How an LLM reads text: tokens become vectors (embeddings)",
  question: "A computer cannot read words. It chops text into tokens, gives each an ID, and turns each ID into a list of numbers — a vector whose direction carries meaning.",
  eq: `token → ID → vector e ∈ ℝ<sup>d</sup> &nbsp;·&nbsp; similarity cos θ = (a·b) / (|a||b|) &nbsp;·&nbsp; meaning arithmetic: e(king) − e(man) + e(woman) ≈ e(queen)`,
  eqNote: "Toy tokenizer and hand-placed 2-D embeddings for teaching. Real LLMs learn ~50,000–200,000 tokens and vectors with thousands of dimensions.",
  controls: [
    { id: "s", label: "Sentence", type: "select", value: "0", options: [["0", "Engineers design machines that make life easier."], ["1", "Unbelievably, the transformer understood the question."], ["2", "RUAS students learn mathematics for artificial intelligence."], ["3", "नमस्ते, आप कैसे हैं? (Hindi)"], ["4", "ನಮಸ್ಕಾರ, ಹೇಗಿದ್ದೀರಾ? (Kannada)"]] },
    { id: "a", label: "Word A", type: "select", value: "engineer", options: wordOpts },
    { id: "b", label: "Word B", type: "select", value: "machine", options: wordOpts },
    { id: "an", label: "Show analogy king − man + woman", type: "select", value: "1", options: [["1", "Yes"], ["0", "No"]] },
  ],
  connect: [["Token", "A piece of a word — LLM bills, limits and speed are counted in tokens"], ["Token ID", "Row number in the embedding matrix (a lookup table)"], ["Vector e", "The meaning of the token as numbers the network can compute with"], ["cos θ ≈ 1", "Similar meaning: used for search, chat memory and RAG"], ["Vector arithmetic", "Relations (male→female, country→capital) become directions in space"]],
  tryThis: ["Compare the token count of the English and the Kannada/Hindi sentences. Why do Indian languages cost more tokens?", "Find the two words with the highest cosine similarity, and two with a negative one.", "Why does 'Unbelievably' split into pieces? What does that gain for rare words?"],
  uses: ["ChatGPT, Gemini, Claude and other LLMs", "Semantic search & RAG over university documents", "Recommendation and plagiarism detection"],
  run(p, mc, tc) {
    const S = ["Engineers design machines that make life easier.", "Unbelievably, the transformer understood the question.", "RUAS students learn mathematics for artificial intelligence.", "नमस्ते, आप कैसे हैं?", "ನಮಸ್ಕಾರ, ಹೇಗಿದ್ದೀರಾ?"][+p.s];
    const toks = /[A-Za-z]/.test(S) ? toyTokenize(S) : [...S].map((ch, i) => (ch === " " ? "▁" : ch)).filter(t => t !== "▁");
    // MATH: embedding space
    let { ctx, w, h } = setupCanvas(mc);
    title(ctx, "Embedding space (2-D slice) — direction = meaning");
    const cx = w / 2, cy = h / 2 + 6, sc = Math.min(w, h - 30) / 8.4;
    ctx.strokeStyle = COL.grid; for (let g = -4; g <= 4; g++) { ctx.beginPath(); ctx.moveTo(cx + g * sc, cy - 4 * sc); ctx.lineTo(cx + g * sc, cy + 4 * sc); ctx.moveTo(cx - 4 * sc, cy + g * sc); ctx.lineTo(cx + 4 * sc, cy + g * sc); ctx.stroke(); }
    ctx.strokeStyle = "#bdb5cc"; ctx.beginPath(); ctx.moveTo(cx - 4 * sc, cy); ctx.lineTo(cx + 4 * sc, cy); ctx.moveTo(cx, cy - 4 * sc); ctx.lineTo(cx, cy + 4 * sc); ctx.stroke();
    const P = v => [cx + v[0] * sc, cy - v[1] * sc];
    for (const [wd, v] of Object.entries(EMB)) { const [x, y] = P(v); ctx.fillStyle = EMB_GROUP(wd); ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = COL.ink; ctx.font = "11.5px system-ui"; ctx.fillText(wd, x + 6, y - 5); }
    const A = EMB[p.a], B = EMB[p.b], cos = (A[0] * B[0] + A[1] * B[1]) / (Math.hypot(...A) * Math.hypot(...B));
    arrow(ctx, cx, cy, ...P(A), COL.cri, 3, null); arrow(ctx, cx, cy, ...P(B), COL.pur, 3, null);
    const a1 = Math.atan2(A[1], A[0]), a2 = Math.atan2(B[1], B[0]); ctx.strokeStyle = COL.cri; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 26, -Math.max(a1, a2), -Math.min(a1, a2)); ctx.stroke();
    if (p.an === "1") {
      const k = P(EMB.king), q = P(EMB.queen), m = P(EMB.man), wo = P(EMB.woman);
      ctx.setLineDash([5, 4]); arrow(ctx, ...m, ...wo, COL.green, 2, null, 8); arrow(ctx, ...k, ...q, COL.green, 2, null, 8); ctx.setLineDash([]);
      ctx.fillStyle = COL.green; ctx.font = "600 11.5px system-ui"; ctx.fillText("same arrow: 'male → female'", k[0] - 120, k[1] + 22);
    }
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fillRect(8, h - 44, 250, 36); ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui";
    ctx.fillText(`cos θ(${p.a}, ${p.b}) = ${cos.toFixed(2)}`, 14, h - 22);
    // TWIN: tokenizer view
    ({ ctx, w, h } = setupCanvas(tc));
    title(ctx, "What the LLM actually receives");
    ctx.font = "13px system-ui"; ctx.fillStyle = COL.muted; ctx.fillText("Input text:", 12, 40); ctx.fillStyle = COL.ink; ctx.font = "600 14px system-ui"; ctx.fillText(S, 90, 40);
    let x = 12, y = 66; const cols = [COL.blue, COL.orange, COL.aqua, COL.violet, COL.magenta, COL.yellow];
    ctx.font = "600 13px ui-monospace, monospace";
    toks.forEach((t, i) => {
      const tw = Math.max(ctx.measureText(t).width + 14, 44); if (x + tw > w - 12) { x = 12; y += 52; }
      ctx.fillStyle = cols[i % 6] + "33"; rrect(ctx, x, y, tw, 40, 7); ctx.fill(); ctx.strokeStyle = cols[i % 6]; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = COL.ink; ctx.font = "600 13px ui-monospace, monospace"; ctx.fillText(t, x + 7, y + 17); ctx.fillStyle = COL.muted; ctx.font = "10.5px ui-monospace, monospace"; ctx.fillText("#" + tokId(t), x + 7, y + 33);
      x += tw + 6;
    });
    y += 66; title(ctx, "Each token ID → a row of the embedding matrix (first 6 tokens, 16 of d numbers)", 12, y);
    toks.slice(0, 6).forEach((t, i) => {
      const yy = y + 12 + i * 24, r = mulberry(tokId(t)); ctx.fillStyle = COL.ink; ctx.font = "12px ui-monospace, monospace"; ctx.fillText(t.slice(0, 10), 12, yy + 14);
      for (let k = 0; k < 16; k++) { ctx.fillStyle = divColor(gauss(r) * 0.6); ctx.fillRect(110 + k * ((w - 130) / 16), yy, (w - 130) / 16 - 2, 18); }
    });
    ctx.fillStyle = COL.muted; ctx.font = "11.5px system-ui"; ctx.fillText("blue = negative, red = positive number", 110, y + 12 + 6 * 24 + 14);
    const words = S.trim().split(/\s+/).length;
    return [
      { label: "Tokens", value: toks.length, note: `${words} words · ${[...S].length} characters` },
      { label: "Tokens per word", value: (toks.length / words).toFixed(2), status: toks.length / words <= 1.5 ? "good" : toks.length / words <= 3 ? "warn" : "bad", note: "more tokens = more cost & slower" },
      { label: "cos θ (A, B)", value: cos.toFixed(2), status: cos >= 0.8 ? "good" : cos >= 0.3 ? "warn" : "bad", note: cos >= 0.8 ? "similar meaning" : cos >= 0.3 ? "loosely related" : "unrelated / opposite" },
      { label: "Numbers for this sentence (d = 4096)", value: (toks.length * 4096).toLocaleString("en-IN") },
    ];
  },
});

/* =====================================================================  A2. IMAGES & VIDEO → NUMBERS */
MODULES.push({
  id: "vision", group: "ai", disc: "Images & video → numbers", icon: "🖼️", math: "Matrices & tensors",
  title: "How AI sees: a picture is a matrix, a video is a stack of matrices",
  question: "Every pixel is three numbers (red, green, blue). Vision transformers cut the image into patches and treat each patch like a word token.",
  eq: `image X ∈ ℝ<sup>H×W×3</sup> &nbsp;·&nbsp; patches: (H/p)·(W/p) tokens, each a vector of p·p·3 numbers &nbsp;·&nbsp; video V ∈ ℝ<sup>T×H×W×3</sup>, motion ≈ V<sub>t+1</sub> − V<sub>t</sub>`,
  eqNote: "Pictures drawn in the browser, then averaged down to the chosen resolution (each block of pixels → one pixel).",
  controls: [
    { id: "mode", label: "Input type", type: "select", value: "image", options: [["image", "Image (one picture)"], ["video", "Video (frames over time)"]] },
    { id: "pic", label: "Picture", type: "select", value: "face", options: PICS },
    { id: "res", label: "Resolution", min: 8, max: 64, step: 4, value: 16, unit: "px" },
    { id: "patch", label: "Patch size p", min: 2, max: 16, step: 1, value: 4, unit: "px" },
  ],
  connect: [["Matrix of numbers 0–255", "Every photo, X-ray, CCTV frame or satellite image"], ["3 channels (R, G, B)", "A 3-D array = tensor"], ["Patch → vector", "Vision transformer token (like a word token)"], ["Frame difference V<sub>t+1</sub> − V<sub>t</sub>", "Motion detection, action recognition"], ["Resolution²", "Memory & compute grow with the square of resolution"]],
  tryThis: ["At what resolution can you still recognise the face? This is why AI uses 224 × 224 inputs.", "How many numbers does 1 second of 30 fps video at 64 × 64 contain?", "Halve the patch size: what happens to the number of tokens (and the cost)?"],
  uses: ["Face recognition, medical image diagnosis", "Self-driving cars, CCTV analytics", "Multimodal chatbots that read photos"],
  run(p, mc, tc) {
    const N = p.res, ps = Math.min(p.patch, N), np = Math.floor(N / ps), video = p.mode === "video";
    const img = downsample(aiImage(p.pic), N);
    let { ctx, w, h } = setupCanvas(mc);
    if (!video) {
      title(ctx, `Pixel matrix ${N} × ${N} (each cell = R, G, B numbers)`);
      const cs = Math.min((w * 0.62 - 20) / N, (h - 40) / N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = (j * N + i) * 3; ctx.fillStyle = rgbStr(img, k); ctx.fillRect(10 + i * cs, 26 + j * cs, cs - (cs > 6 ? 0.6 : 0), cs - (cs > 6 ? 0.6 : 0)); if (cs >= 20) { const gv = gray(img, k); ctx.fillStyle = gv > 0.55 ? "#000" : "#fff"; ctx.font = `${Math.min(10, cs / 2.6)}px ui-monospace`; ctx.fillText(Math.round(gv * 255), 10 + i * cs + 2, 26 + j * cs + cs / 2 + 3); } }
      const ox = 20 + N * cs, sw = Math.min(w - ox - 14, (h - 70) / 3 - 18), sc2 = sw / N;
      ["R", "G", "B"].forEach((ch, c) => {
        const oy = 30 + c * (sw + 22); ctx.fillStyle = COL.ink; ctx.font = "600 11.5px system-ui"; ctx.fillText(`${ch} channel`, ox, oy - 4);
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = Math.round(img[(j * N + i) * 3 + c] * 255); ctx.fillStyle = c === 0 ? `rgb(${v},0,0)` : c === 1 ? `rgb(0,${v},0)` : `rgb(0,0,${v})`; ctx.fillRect(ox + i * sc2, oy + j * sc2, sc2 + 0.4, sc2 + 0.4); }
      });
      ctx.fillStyle = COL.cri; ctx.font = "700 12.5px system-ui"; ctx.fillText(`Tensor shape ${N} × ${N} × 3`, ox, h - 12);
    } else {
      const T = 6; title(ctx, `Video = ${T} frames, each ${N} × ${N} × 3 (a 4-D tensor)`);
      const fw = Math.min((w - 30) / 3 - 10, (h - 110) / 2 - 22);
      for (let t = 0; t < T; t++) {
        const fx = 10 + (t % 3) * (fw + 14), fy = 30 + Math.floor(t / 3) * (fw + 24), bx = 0.18 + 0.64 * t / (T - 1), by = 0.25 + 0.5 * Math.abs(Math.sin(t * 0.9)), cs = fw / N;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const d = Math.hypot((i + 0.5) / N - bx, (j + 0.5) / N - by); ctx.fillStyle = d < 0.13 ? COL.orange : j > N * 0.85 ? "#3d9a3d" : "#cfe5f7"; ctx.fillRect(fx + i * cs, fy + j * cs, cs + 0.4, cs + 0.4); }
        ctx.fillStyle = COL.ink; ctx.font = "11.5px system-ui"; ctx.fillText(`frame t = ${t}`, fx, fy + fw + 13);
      }
      ctx.fillStyle = COL.cri; ctx.font = "700 12.5px system-ui"; ctx.fillText(`Tensor shape ${T} × ${N} × ${N} × 3 = ${(T * N * N * 3).toLocaleString("en-IN")} numbers`, 10, h - 12);
    }
    ({ ctx, w, h } = setupCanvas(tc));
    if (!video) {
      title(ctx, `Vision-transformer view: ${np * np} patches of ${ps} × ${ps} → ${np * np} tokens`);
      const cs = Math.min((w - 20) / N, (h - 140) / N), ox = (w - N * cs) / 2;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { ctx.fillStyle = rgbStr(img, (j * N + i) * 3); ctx.fillRect(ox + i * cs, 26 + j * cs, cs + 0.4, cs + 0.4); }
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; for (let k = 0; k <= np; k++) { ctx.beginPath(); ctx.moveTo(ox + k * ps * cs, 26); ctx.lineTo(ox + k * ps * cs, 26 + np * ps * cs); ctx.moveTo(ox, 26 + k * ps * cs); ctx.lineTo(ox + np * ps * cs, 26 + k * ps * cs); ctx.stroke(); }
      const sy = 26 + N * cs + 22; ctx.fillStyle = COL.ink; ctx.font = "600 12px system-ui"; ctx.fillText("Flattened into a sequence, like words in a sentence →", 10, sy);
      const tw = Math.min(34, (w - 20) / Math.min(np * np, 24) - 4); let k = 0;
      for (let pj = 0; pj < np && k < 24; pj++) for (let pi = 0; pi < np && k < 24; pi++, k++) {
        const tx = 10 + k * (tw + 4), sub = tw / ps;
        for (let j = 0; j < ps; j++) for (let i = 0; i < ps; i++) { ctx.fillStyle = rgbStr(img, ((pj * ps + j) * N + pi * ps + i) * 3); ctx.fillRect(tx + i * sub, sy + 10 + j * sub, sub + 0.3, sub + 0.3); }
      }
      if (np * np > 24) { ctx.fillStyle = COL.muted; ctx.fillText(`… ${np * np - 24} more`, 10, sy + tw + 28); }
    } else {
      title(ctx, "Motion = frame t+1 − frame t (red: object arrived, blue: object left)");
      const T = 6, fw = Math.min((w - 40) / 3 - 10, (h - 90) / 2 - 22);
      const frame = t => { const bx = 0.18 + 0.64 * t / (T - 1), by = 0.25 + 0.5 * Math.abs(Math.sin(t * 0.9)); return (i, j) => Math.hypot((i + 0.5) / N - bx, (j + 0.5) / N - by) < 0.13 ? 1 : 0; };
      for (let t = 0; t < 5; t++) {
        const fx = 10 + (t % 3) * (fw + 14), fy = 30 + Math.floor(t / 3) * (fw + 26), a = frame(t), b = frame(t + 1), cs = fw / N;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { ctx.fillStyle = divColor(b(i, j) - a(i, j)); ctx.fillRect(fx + i * cs, fy + j * cs, cs + 0.4, cs + 0.4); }
        ctx.fillStyle = COL.ink; ctx.font = "11.5px system-ui"; ctx.fillText(`V${t + 1} − V${t}`, fx, fy + fw + 13);
      }
    }
    const per = N * N * 3;
    return [
      { label: video ? "Numbers per frame" : "Numbers in this image", value: per.toLocaleString("en-IN"), note: `${N} × ${N} × 3` },
      { label: "Tokens (patches) per image", value: np * np, status: np * np <= 256 ? "good" : np * np <= 1024 ? "warn" : "bad", note: `${ps * ps * 3} numbers per token` },
      { label: "1 s of 30 fps video", value: (per * 30).toLocaleString("en-IN"), unit: "numbers" },
      { label: "Same photo at 1080p", value: (1920 * 1080 * 3 / 1e6).toFixed(1), unit: "million numbers" },
    ];
  },
});

/* =====================================================================  A3. AUDIO → NUMBERS */
MODULES.push({
  id: "audio", group: "ai", disc: "Audio → numbers", icon: "🎙️", math: "Sampling & Fourier transform",
  title: "How AI hears: sound → samples → spectrogram (an image of sound)",
  question: "A microphone gives thousands of numbers per second. Speech AI turns them into a spectrogram with the Fourier transform, then reads it like a picture.",
  eq: `x[n] = x(n/f<sub>s</sub>) &nbsp;·&nbsp; Nyquist: f<sub>s</sub> > 2 f<sub>max</sub> &nbsp;·&nbsp; spectrogram S(m, f) = | Σ<sub>n</sub> x[n] w[n − mH] e<sup>−j2πfn/f<sub>s</sub></sup> |`,
  eqNote: "Synthesised 1-second sounds. Short-time Fourier transform with a Hann window and 50% overlap; colour = loudness in dB.",
  controls: [
    { id: "snd", label: "Sound", type: "select", value: "speech", options: [["speech", "Speech-like 'aa – ee – oo'"], ["whistle", "Rising whistle 1 → 6 kHz"], ["chord", "Musical chord (C-E-G)"]] },
    { id: "fs", label: "Sample rate", type: "select", value: "16000", options: [["8000", "8 kHz (telephone)"], ["16000", "16 kHz (speech AI)"], ["44100", "44.1 kHz (music CD)"]] },
    { id: "win", label: "Window length", min: 10, max: 60, step: 5, value: 25, unit: "ms" },
    { id: "noise", label: "Background noise", min: 0, max: 0.5, step: 0.05, value: 0.05, unit: "" },
  ],
  connect: [["Sampling x[n]", "Microphone + ADC in every phone"], ["Nyquist limit f<sub>s</sub>/2", "Too low a sample rate folds high sounds into wrong ones (aliasing)"], ["Fourier transform per window", "Which frequencies are present at each moment"], ["Spectrogram rows (formants)", "Vowels are recognised from these bright bands"], ["Spectrogram columns", "Audio tokens fed to speech models"]],
  tryThis: ["Play the whistle at 8 kHz: why does the line bend back down? (aliasing)", "Make the window 10 ms then 60 ms: what is the trade-off between time and frequency detail?", "Find the 'aa', 'ee', 'oo' sections by their bright bands (formants)."],
  uses: ["Voice assistants, speech-to-text (Whisper-type models)", "Machine-fault diagnosis from vibration sound", "Heart-sound and cough analysis in health care"],
  run(p, mc, tc) {
    const fs = +p.fs, n = fs, rnd = mulberry(5), x = new Float32Array(n);
    const formant = (f, F) => F.reduce((s, c, i) => s + [1, 0.6, 0.3][i] * Math.exp(-(((f - c) / 120) ** 2)), 0);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / fs; let v = 0;
      if (p.snd === "speech") {
        const seg = t < 0.33 ? [700, 1220, 2600] : t < 0.66 ? [270, 2290, 3010] : [300, 870, 2240], f0 = 125;
        for (let k = 1; k * f0 < 4500; k++) v += formant(k * f0, seg) * Math.sin(2 * Math.PI * k * f0 * t + k);
        v *= 0.35 * (0.6 + 0.4 * Math.sin(Math.PI * t * 3) ** 2);
      } else if (p.snd === "whistle") { const f = 1000 + 5000 * t; ph += 2 * Math.PI * f / fs; v = 0.8 * Math.sin(ph); }
      else for (const f of [261.6, 329.6, 392]) v += 0.3 * Math.sin(2 * Math.PI * f * t) + 0.12 * Math.sin(4 * Math.PI * f * t) + 0.05 * Math.sin(6 * Math.PI * f * t);
      x[i] = v + p.noise * gauss(rnd) * 0.5;
    }
    const W = Math.round(p.win / 1000 * fs), H = Math.floor(W / 2), fmax = Math.min(fs / 2, 6000), NB = 90, frames = Math.floor((n - W) / H) + 1;
    const step = Math.max(1, Math.floor(W / 400)); // subsample inside window for speed (still accurate for display)
    const S = []; let mx = -1e9;
    const win = [...Array(W)].map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (W - 1)));
    for (let m = 0; m < frames; m++) {
      const col = [];
      for (let b = 0; b < NB; b++) {
        const f = (b + 0.5) / NB * fmax; let re = 0, im = 0;
        for (let i = 0; i < W; i += step) { const a = 2 * Math.PI * f * i / fs, v = x[m * H + i] * win[i]; re += v * Math.cos(a); im -= v * Math.sin(a); }
        const db = 20 * Math.log10(Math.hypot(re, im) * step / W + 1e-6); col.push(db); if (db > mx) mx = db;
      }
      S.push(col);
    }
    let { ctx, w, h } = setupCanvas(mc);
    const t1 = [...Array(Math.min(n, 2000))].map((_, i) => i / fs * 1000).filter((_, i) => i % Math.max(1, Math.floor(n / 2000)) === 0);
    const zoomN = Math.round(0.02 * fs), zt = [...Array(zoomN)].map((_, i) => i / fs * 1000), zx = [...x.slice(Math.round(0.15 * fs), Math.round(0.15 * fs) + zoomN)];
    const allT = [...Array(1000)].map((_, i) => i), allX = allT.map(i => x[Math.floor(i * n / 1000)]);
    linePlot(ctx, { x: 0, y: 0, w, h: h * 0.45, title: "Whole 1-second recording x[n]", xlabel: "time (ms)", series: [{ x: allT, y: allX, color: COL.blue, width: 1 }], legend: false, ymin: -1.4, ymax: 1.4 });
    linePlot(ctx, { x: 0, y: h * 0.47, w, h: h * 0.53, title: `Zoom: 20 ms = ${zoomN} samples (dots) at ${fs / 1000} kHz`, xlabel: "time (ms)", series: [{ x: zt, y: zx, color: COL.orange, width: 1.5 }], legend: false, ymin: -1.4, ymax: 1.4 });
    if (zoomN <= 400) { const X0 = 46, Wd = w - 58, Y0 = h * 0.47 + 22, Hh = h * 0.53 - 56; ctx.fillStyle = COL.orange; zx.forEach((v, i) => { ctx.beginPath(); ctx.arc(X0 + i / (zoomN - 1) * Wd, Y0 + (1 - (v + 1.4) / 2.8) * Hh, 2, 0, 7); ctx.fill(); }); }
    ({ ctx, w, h } = setupCanvas(tc));
    title(ctx, "Spectrogram — the 'image' a speech model reads");
    const X0 = 50, Y0 = 26, Wd = w - 62, Hh = h - 66, cw = Wd / frames, ch = Hh / NB;
    for (let m = 0; m < frames; m++) for (let b = 0; b < NB; b++) { ctx.fillStyle = heatColor(Math.max(0, (S[m][b] - mx + 60) / 60)); ctx.fillRect(X0 + m * cw, Y0 + Hh - (b + 1) * ch, cw + 0.6, ch + 0.6); }
    ctx.fillStyle = COL.muted; ctx.font = "11px system-ui"; ctx.textAlign = "right";
    for (let f = 0; f <= fmax; f += 1000) ctx.fillText(f / 1000 + "k", X0 - 4, Y0 + Hh - f / fmax * Hh + 4);
    ctx.textAlign = "center"; for (let t = 0; t <= 1; t += 0.25) ctx.fillText(t * 1000 + " ms", X0 + t * Wd, Y0 + Hh + 14); ctx.textAlign = "left";
    ctx.fillStyle = COL.ink; ctx.font = "600 11.5px system-ui"; ctx.fillText("frequency (Hz)", 4, Y0 + Hh + 30); ctx.fillText("time →", X0 + Wd - 44, Y0 + Hh + 30);
    if (fs / 2 < 6000) { ctx.fillStyle = COL.bad; ctx.fillText(`Nyquist limit ${fs / 2000} kHz = top of chart`, X0 + 6, Y0 + 14); }
    const alias = p.snd === "whistle" && fs < 12000;
    return [
      { label: "Samples per second", value: fs.toLocaleString("en-IN") },
      { label: "Nyquist limit f<sub>s</sub>/2", value: (fs / 2000).toFixed(1), unit: "kHz", status: alias ? "bad" : "good", note: alias ? "whistle reaches 6 kHz → aliasing" : "sound fits below the limit" },
      { label: "Spectrogram frames (audio tokens)", value: frames, note: `per second, window ${p.win} ms` },
      { label: "Frequency resolution ≈ 1/window", value: (1000 / p.win).toFixed(0), unit: "Hz" },
    ];
  },
});

/* =====================================================================  A4. NEURAL NETWORK — learn live */
MODULES.push({
  id: "nn", group: "ai", disc: "Neural network learns", icon: "🧠", math: "Matrix multiply + chain rule",
  title: "Watch a neural network learn: matrices, activation and back-propagation",
  question: "A neural network is layers of matrix multiplications with a bend (activation) in between. Training = adjusting the matrix entries to reduce the error.",
  eq: `h = φ(W<sub>1</sub>x + b<sub>1</sub>), &nbsp; ŷ = σ(w<sub>2</sub>·h + b<sub>2</sub>) &nbsp;·&nbsp; L = −mean[y ln ŷ + (1−y) ln(1−ŷ)] &nbsp;·&nbsp; ∂L/∂W<sub>1</sub> = (∂L/∂ŷ)(∂ŷ/∂h)(∂h/∂W<sub>1</sub>) &nbsp;·&nbsp; W ← W − η ∂L/∂W`,
  eqNote: "2 inputs → H hidden neurons → 1 output, trained live by full-batch gradient descent on 200 points. The same maths, scaled to billions of weights, trains an LLM.",
  controls: [
    { id: "data", label: "Problem (dataset)", type: "select", value: "circle", options: [["linear", "Straight-line split"], ["circle", "Circle inside ring"], ["xor", "XOR (checkerboard)"], ["moons", "Two moons"]] },
    { id: "H", label: "Hidden neurons H", min: 1, max: 10, step: 1, value: 4, unit: "" },
    { id: "act", label: "Activation φ", type: "select", value: "tanh", options: [["tanh", "tanh"], ["relu", "ReLU"], ["sigmoid", "sigmoid"], ["none", "none (linear)"]] },
    { id: "lr", label: "Learning rate η", min: 0.05, max: 3, step: 0.05, value: 0.8, unit: "" },
    { id: "noise", label: "Data noise", min: 0, max: 0.4, step: 0.02, value: 0.08, unit: "" },
  ],
  connect: [["W x (matrix × vector)", "One layer of a neural network — GPUs exist to do this fast"], ["Activation φ (non-linear function)", "Lets the network bend the boundary; without it, any depth is still a straight line"], ["Loss L", "How wrong the model is (cross-entropy, the same loss used by LLMs)"], ["Chain rule ∂L/∂W", "Back-propagation: blame passed backwards layer by layer"], ["Parameters 4H + 1", "LLMs have billions of these numbers"]],
  tryThis: ["Choose 'Circle' with activation 'none': why can it never exceed ~60% accuracy?", "What is the smallest H that solves XOR?", "Set the learning rate to 3: what happens to the loss curve?"],
  uses: ["Every deep-learning model: LLMs, vision, speech", "Defect detection on production lines", "Credit scoring, medical risk prediction"],
  run(p, mc, tc) {
    const rnd = mulberry(21), n = 200, X = [], Y = [];
    for (let i = 0; i < n; i++) {
      let x1 = rnd() * 2 - 1, x2 = rnd() * 2 - 1, y;
      if (p.data === "linear") y = x1 + 0.6 * x2 > 0.1 ? 1 : 0;
      else if (p.data === "circle") y = Math.hypot(x1, x2) < 0.55 ? 1 : 0;
      else if (p.data === "xor") y = x1 * x2 > 0 ? 1 : 0;
      else { const a = rnd() * Math.PI, c = i % 2; y = c; x1 = c ? 0.45 - 0.75 * Math.cos(a) : -0.45 + 0.75 * Math.cos(a); x2 = c ? 0.25 - 0.6 * Math.sin(a) : -0.25 + 0.6 * Math.sin(a); }
      X.push([x1 + p.noise * gauss(rnd), x2 + p.noise * gauss(rnd)]); Y.push(y);
    }
    const r2 = mulberry(3), H = p.H;
    this._s = { X, Y, H, act: p.act, lr: p.lr, W1: [...Array(H)].map(() => [gauss(r2) * 1.2, gauss(r2) * 1.2]), b1: [...Array(H)].map(() => gauss(r2) * 0.3), w2: [...Array(H)].map(() => gauss(r2)), b2: 0, ep: 0, loss: [], acc: 0, mc };
    return this._metrics();
  },
  _f(z, a) { return a === "tanh" ? Math.tanh(z) : a === "relu" ? Math.max(0, z) : a === "sigmoid" ? 1 / (1 + Math.exp(-z)) : z; },
  _d(z, h, a) { return a === "tanh" ? 1 - h * h : a === "relu" ? (z > 0 ? 1 : 0.0) : a === "sigmoid" ? h * (1 - h) : 1; },
  _fwd(s, x) { const z = s.W1.map((wr, k) => wr[0] * x[0] + wr[1] * x[1] + s.b1[k]), hh = z.map(v => this._f(v, s.act)); const o = hh.reduce((t, v, k) => t + v * s.w2[k], s.b2); return { z, hh, y: 1 / (1 + Math.exp(-o)) }; },
  _train(s) {
    const H = s.H, gW1 = [...Array(H)].map(() => [0, 0]), gb1 = Array(H).fill(0), gw2 = Array(H).fill(0); let gb2 = 0, L = 0, ok = 0; const n = s.X.length;
    s.X.forEach((x, i) => {
      const { z, hh, y } = this._fwd(s, x), t = s.Y[i], e = y - t; L += -(t * Math.log(y + 1e-9) + (1 - t) * Math.log(1 - y + 1e-9)); if ((y > 0.5) === (t === 1)) ok++;
      gb2 += e; for (let k = 0; k < H; k++) { gw2[k] += e * hh[k]; const dz = e * s.w2[k] * this._d(z[k], hh[k], s.act); gW1[k][0] += dz * x[0]; gW1[k][1] += dz * x[1]; gb1[k] += dz; }
    });
    for (let k = 0; k < H; k++) { s.W1[k][0] -= s.lr * gW1[k][0] / n; s.W1[k][1] -= s.lr * gW1[k][1] / n; s.b1[k] -= s.lr * gb1[k] / n; s.w2[k] -= s.lr * gw2[k] / n; }
    s.b2 -= s.lr * gb2 / n; s.ep++; s.loss.push(L / n); s.acc = ok / n;
  },
  _metrics() {
    const s = this._s, L = s.loss.length ? s.loss[s.loss.length - 1] : NaN;
    return [
      { label: "Accuracy on the data", value: (s.acc * 100).toFixed(1), unit: "%", status: s.acc >= 0.95 ? "good" : s.acc >= 0.8 ? "warn" : "bad" },
      { label: "Loss L (cross-entropy)", value: isFinite(L) ? L.toFixed(3) : "—", status: !isFinite(L) ? null : L < 0.15 ? "good" : L < 0.4 ? "warn" : "bad" },
      { label: "Training steps (epochs)", value: s.ep, note: s.ep >= 3000 ? "finished" : "learning…" },
      { label: "Parameters (weights + biases)", value: 4 * s.H + 1, note: "LLMs: billions" },
    ];
  },
  frame(time, p, tc) {
    const s = this._s; if (!s) return;
    if (s.ep < 3000) for (let k = 0; k < 6; k++) this._train(s);
    // twin: decision map
    let { ctx, w, h } = setupCanvas(tc);
    title(ctx, "Decision map: orange = network says class 1, blue = class 0");
    const S = Math.min(w - 20, h - 36), ox = (w - S) / 2, oy = 26, G = 44, c = S / G;
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const y = this._fwd(s, [-1.3 + 2.6 * (i + 0.5) / G, 1.3 - 2.6 * (j + 0.5) / G]).y;
      const al = 0.18 + 0.32 * Math.abs(y - 0.5) * 2, mix = (c0, c1) => Math.round(255 + ((c0 + (c1 - c0) * y) - 255) * al);
      ctx.fillStyle = `rgb(${mix(42, 235)},${mix(120, 104)},${mix(214, 52)})`;
      ctx.fillRect(ox + i * c, oy + j * c, c + 0.5, c + 0.5);
    }
    s.X.forEach((x, i) => { ctx.fillStyle = s.Y[i] ? COL.orange : COL.blue; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(ox + (x[0] + 1.3) / 2.6 * S, oy + (1.3 - x[1]) / 2.6 * S, 3.6, 0, 7); ctx.fill(); ctx.stroke(); });
    // math: network diagram + loss curve
    const mc = s.mc; if (!mc || !mc.isConnected) return this._metrics();
    ({ ctx, w, h } = setupCanvas(mc));
    title(ctx, `Network 2 → ${s.H} → 1 (line thickness = |weight|, red +, blue −)`);
    const top = h * 0.5, L1 = [[w * 0.15, top * 0.42], [w * 0.15, top * 0.82]], L2 = [...Array(s.H)].map((_, k) => [w * 0.5, 30 + (k + 0.5) * (top - 30) / s.H]), L3 = [w * 0.85, top * 0.62];
    const line = (a, b, wt) => { ctx.strokeStyle = wt >= 0 ? "rgba(227,73,72,.75)" : "rgba(42,120,214,.75)"; ctx.lineWidth = Math.min(7, 0.6 + Math.abs(wt) * 1.3); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); };
    L2.forEach((q, k) => { line(L1[0], q, s.W1[k][0]); line(L1[1], q, s.W1[k][1]); line(q, L3, s.w2[k]); });
    const node = (q, lab, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q[0], q[1], 13, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "700 11px system-ui"; ctx.textAlign = "center"; ctx.fillText(lab, q[0], q[1] + 4); ctx.textAlign = "left"; };
    node(L1[0], "x₁", COL.pur); node(L1[1], "x₂", COL.pur); L2.forEach((q, k) => node(q, "φ", COL.violet)); node(L3, "ŷ", COL.cri);
    ctx.fillStyle = COL.muted; ctx.font = "11px system-ui"; ctx.fillText("input", L1[0][0] - 14, top - 2); ctx.fillText("hidden (W₁, φ)", L2[0][0] - 36, top - 2); ctx.fillText("output σ", L3[0] - 22, top - 2);
    const ep = s.loss.map((_, i) => i + 1);
    linePlot(ctx, { x: 0, y: top + 6, w, h: h - top - 6, title: "Loss L falling as the weights are corrected", xlabel: "training step", ylabel: "loss", ymin: 0, ymax: Math.max(0.8, ...s.loss.slice(0, 5)) , xmin: 0, xmax: Math.max(200, s.ep), series: [{ x: ep.length ? ep : [0], y: s.loss.length ? s.loss : [0], color: COL.cri, width: 2 }], legend: false });
    return this._metrics();
  },
});

/* =====================================================================  A5. GRADIENT DESCENT */
const SURF = {
  bowl: { f: (x, y) => x * x + y * y, g: (x, y) => [2 * x, 2 * y], min: 0, name: "Round bowl (easy)" },
  valley: { f: (x, y) => 0.5 * x * x + 6 * y * y, g: (x, y) => [x, 12 * y], min: 0, name: "Long narrow valley" },
  two: { f: (x, y) => (x * x - 1) ** 2 + 0.35 * x + y * y, g: (x, y) => [4 * x * (x * x - 1) + 0.35, 2 * y], min: null, name: "Two valleys (local minimum)" },
};
(() => { let m = 1e9; for (let i = 0; i <= 2000; i++) { const x = -2 + 4 * i / 2000; m = Math.min(m, SURF.two.f(x, 0)); } SURF.two.min = m; })();
MODULES.push({
  id: "gd", group: "ai", disc: "Gradient descent", icon: "⛰️", math: "Partial derivatives & gradient",
  title: "How every AI model learns: walking downhill on the loss surface",
  question: "The gradient ∇L points uphill. Step the opposite way, again and again. The step size (learning rate) decides whether you arrive, crawl, or blow up.",
  eq: `∇L = (∂L/∂w<sub>1</sub>, ∂L/∂w<sub>2</sub>) &nbsp;·&nbsp; v ← β v − η ∇L(w), &nbsp; w ← w + v &nbsp;·&nbsp; (β = momentum, η = learning rate)`,
  eqNote: "Two-weight loss surfaces so the landscape can be drawn. Real models do exactly this in millions/billions of dimensions (optimisers such as SGD and Adam).",
  controls: [
    { id: "surf", label: "Loss surface", type: "select", value: "valley", options: Object.entries(SURF).map(([k, v]) => [k, v.name]) },
    { id: "lr", label: "Learning rate η", min: 0.01, max: 1.2, step: 0.01, value: 0.1, unit: "" },
    { id: "mom", label: "Momentum β", min: 0, max: 0.95, step: 0.05, value: 0, unit: "" },
    { id: "x0", label: "Start w₁", min: -2, max: 2, step: 0.1, value: 1.8, unit: "" },
    { id: "y0", label: "Start w₂", min: -2, max: 2, step: 0.1, value: 1.5, unit: "" },
  ],
  connect: [["Loss surface L(w)", "Error of the model for every possible setting of its weights"], ["Gradient ∇L", "Computed by back-propagation (chain rule)"], ["Learning rate η", "The most important training setting: too small = slow, too big = diverges"], ["Momentum β", "Remembers past steps — rolls through narrow valleys"], ["Local minimum", "A 'good enough' solution the model can get stuck in"]],
  tryThis: ["On the narrow valley, find the largest η that does not zig-zag out of control (theory: η < 2/12).", "Add momentum 0.8 with η = 0.05: does it reach the bottom sooner?", "On 'two valleys', change the start point to land in the global vs local minimum."],
  uses: ["Training LLMs, CNNs and every neural network", "Curve fitting & system identification", "Optimal design, control tuning, logistics"],
  run(p, mc, tc) {
    const S = SURF[p.surf]; let x = p.x0, y = p.y0, vx = 0, vy = 0; const path = [[x, y]], L = [S.f(x, y)]; let div = false;
    for (let k = 0; k < 150; k++) { const [gx, gy] = S.g(x, y); vx = p.mom * vx - p.lr * gx; vy = p.mom * vy - p.lr * gy; x += vx; y += vy; if (!isFinite(x) || Math.abs(x) > 50 || Math.abs(y) > 50) { div = true; break; } path.push([x, y]); L.push(S.f(x, y)); }
    let conv = L.findIndex(v => v - S.min < 1e-3);
    const local = p.surf === "two" && !div && path[path.length - 1][0] > 0;
    this._s = { S, path, L, div, mc, key: p.surf };
    if (!this._bg || this._bgKey !== p.surf) this._bg = null;
    return [
      { label: "Final loss", value: div ? "∞" : L[L.length - 1].toFixed(4), status: div ? "bad" : local ? "warn" : L[L.length - 1] - S.min < 1e-3 ? "good" : "warn", note: local ? "stuck in local minimum" : `best possible ${S.min.toFixed(3)}` },
      { label: "Steps to converge", value: div ? "never" : conv < 0 ? "> 150" : conv, status: div ? "bad" : conv < 0 ? "warn" : conv <= 40 ? "good" : "warn" },
      { label: "Behaviour", value: div ? "Diverged" : local ? "Local min" : conv >= 0 && conv <= 40 ? "Converged" : "Slow", status: div ? "bad" : local ? "warn" : conv >= 0 && conv <= 40 ? "good" : "warn" },
      { label: "Start loss", value: L[0].toFixed(2) },
    ];
  },
  frame(time, p, tc) {
    const s = this._s; if (!s) return;
    const k = Math.min(s.path.length - 1, Math.floor((time * 22) % (s.path.length + 30)));
    const mc = s.mc; let { ctx, w, h } = setupCanvas(mc);
    const R = 2.5, S = Math.min(w - 20, h - 36), ox = (w - S) / 2, oy = 26, P = (x, y) => [ox + (x + R) / (2 * R) * S, oy + (R - y) / (2 * R) * S];
    if (!this._bg || this._bgKey !== s.key || this._bg.width !== Math.round(S)) {
      const c = document.createElement("canvas"), G = 120; c.width = c.height = Math.round(S); const g = c.getContext("2d"), cs = S / G; let mx = 0;
      const vals = []; for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const v = s.S.f(-R + 2 * R * (i + 0.5) / G, R - 2 * R * (j + 0.5) / G) - s.S.min; vals.push(v); mx = Math.max(mx, v); }
      vals.forEach((v, idx) => { const t = Math.log(1 + v) / Math.log(1 + mx); g.fillStyle = heatColor(t); g.fillRect((idx % G) * cs, Math.floor(idx / G) * cs, cs + 0.5, cs + 0.5); });
      g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; for (let lv = 1; lv < 12; lv++) { const target = Math.exp(lv / 12 * Math.log(1 + mx)) - 1; vals.forEach((v, idx) => { const i = idx % G, j = Math.floor(idx / G); if (i < G - 1 && (vals[idx + 1] - target) * (v - target) < 0) g.fillRect(i * cs + cs, j * cs, 1, cs); if (j < G - 1 && (vals[idx + G] - target) * (v - target) < 0) g.fillRect(i * cs, j * cs + cs, cs, 1); }); }
      this._bg = c; this._bgKey = s.key;
    }
    title(ctx, "Loss surface L(w₁, w₂) seen from above — blue = low loss");
    ctx.drawImage(this._bg, ox, oy, S, S);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.2; ctx.beginPath(); s.path.slice(0, k + 1).forEach((q, i) => { const [a, b] = P(q[0], q[1]); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.stroke();
    s.path.slice(0, k + 1).forEach(q => { const [a, b] = P(q[0], q[1]); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(a, b, 2.4, 0, 7); ctx.fill(); });
    const [bx, by] = P(...s.path[k]); ctx.fillStyle = COL.cri; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 8, 0, 7); ctx.fill(); ctx.stroke();
    if (k < s.path.length - 1) { const [gx, gy] = s.S.g(...s.path[k]), gl = Math.hypot(gx, gy) || 1; arrow(ctx, bx, by, bx - gx / gl * 40, by + gy / gl * 40, "#fff", 2.5, "−∇L", 8); }
    if (s.div && k >= s.path.length - 1) { ctx.fillStyle = COL.bad; ctx.font = "700 15px system-ui"; ctx.fillText("✖ Diverged — learning rate too large", ox + 10, oy + S - 12); }
    ({ ctx, w, h } = setupCanvas(tc));
    const st = s.L.map((_, i) => i), ymax = Math.min(s.L[0] * 1.5 + 0.01, Math.max(...s.L.filter(isFinite)) * 1.05);
    linePlot(ctx, { x: 0, y: 0, w, h: h * 0.62, title: "Training curve: loss after each step", xlabel: "step", ylabel: "loss", ymin: Math.min(0, s.S.min), ymax, xmin: 0, xmax: Math.max(20, s.L.length - 1),
      series: [{ x: st, y: s.L.map(v => Math.min(v, ymax)), color: "#c9bde3", width: 2 }, { x: st.slice(0, k + 1), y: s.L.slice(0, k + 1).map(v => Math.min(v, ymax)), color: COL.cri, width: 3 }], hlines: [{ y: s.S.min, label: "lowest possible", color: COL.good }], legend: false });
    const yy = h * 0.66; title(ctx, "What this means for training a real model", 12, yy + 12);
    ctx.font = "13px system-ui"; ctx.fillStyle = COL.ink;
    const msg = s.div ? ["✖ Loss exploded: real training shows 'NaN' and must restart.", "Fix: lower the learning rate."] : p.surf === "two" && s.path[s.path.length - 1][0] > 0 ? ["▲ Settled in a local minimum: model works, but not its best.", "Fix: different start (random init), momentum or restarts."] : s.L.findIndex(v => v - s.S.min < 1e-3) < 0 ? ["▲ Still crawling: training would take too long (costly GPU hours).", "Fix: raise η a little or add momentum."] : ["✔ Reached the bottom quickly — a well-tuned training run.", "This is what ML engineers tune for every LLM."];
    msg.forEach((m, i) => ctx.fillText(m, 12, yy + 38 + i * 22));
  },
});

/* =====================================================================  A6. CNN CONVOLUTION */
const KERNELS = { sobelx: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], sobely: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]], blur: [[1, 2, 1], [2, 4, 2], [1, 2, 1]].map(r => r.map(v => v / 16)), sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], outline: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]] };
MODULES.push({
  id: "cnn", group: "ai", disc: "Convolutional network", icon: "🔍", math: "2-D convolution",
  title: "How a CNN finds edges and shapes: a 3 × 3 matrix sliding over the image",
  question: "Each output pixel = sum of (image patch × kernel). The network learns the kernel numbers itself — first edges, then shapes, then objects.",
  eq: `Y(i, j) = Σ<sub>u=−1..1</sub> Σ<sub>v=−1..1</sub> K(u, v) · X(i·s + u, j·s + v) &nbsp;·&nbsp; then ReLU(Y) = max(0, Y) &nbsp;·&nbsp; output size = ⌊(N − 3)/s⌋ + 1`,
  eqNote: "32 × 32 grayscale input. Kernels shown are classic hand-designed ones; a trained CNN learns hundreds of such kernels from data.",
  controls: [
    { id: "pic", label: "Picture", type: "select", value: "house", options: PICS },
    { id: "k", label: "Kernel K", type: "select", value: "sobelx", options: [["sobelx", "Vertical edges (Sobel x)"], ["sobely", "Horizontal edges (Sobel y)"], ["blur", "Blur (average)"], ["sharpen", "Sharpen"], ["outline", "Outline (Laplacian)"]] },
    { id: "s", label: "Stride s", type: "select", value: "1", options: [["1", "1"], ["2", "2 (half size)"]] },
    { id: "relu", label: "Apply ReLU", type: "select", value: "0", options: [["0", "No — show + and −"], ["1", "Yes — keep only positive"]] },
  ],
  connect: [["Kernel K (3 × 3 matrix)", "A learned 'feature detector' (edge, corner, texture)"], ["Sliding sum (convolution)", "Same maths as the ECE filter — now in 2-D"], ["Weight sharing", "9 numbers scan the whole image → few parameters"], ["Stride", "Shrinks the image → faster, coarser"], ["ReLU", "Keeps only detected features (non-linearity)"]],
  tryThis: ["Which kernel finds the walls of the house, and which finds the roof line?", "Count parameters: 10 for the kernel vs a dense layer connecting every pixel.", "Why does the blur kernel's numbers add up to 1?"],
  uses: ["Defect inspection on assembly lines", "Medical scans (tumour, fracture detection)", "Number-plate reading, face unlock"],
  run(p, mc, tc) {
    const N = 32, img = downsample(aiImage(p.pic), N), X = [...Array(N * N)].map((_, i) => gray(img, i * 3)), K = KERNELS[p.k], s = +p.s, O = Math.floor((N - 3) / s) + 1;
    const Y = []; let mx = 1e-9;
    for (let j = 0; j < O; j++) for (let i = 0; i < O; i++) { let v = 0; for (let u = 0; u < 3; u++) for (let q = 0; q < 3; q++) v += K[u][q] * X[(j * s + u) * N + i * s + q]; if (p.relu === "1") v = Math.max(0, v); Y.push(v); mx = Math.max(mx, Math.abs(v)); }
    this._s = { X, Y, K, s, O, N, mx, mc, relu: p.relu === "1", blur: p.k === "blur" };
    return [
      { label: "Output feature map", value: `${O} × ${O}`, note: `from ${N} × ${N}` },
      { label: "Multiplications", value: (O * O * 9).toLocaleString("en-IN") },
      { label: "Learned parameters (kernel + bias)", value: 10, status: "good" },
      { label: "Dense layer for the same job", value: (N * N * O * O).toLocaleString("en-IN"), unit: "weights", status: "bad", note: "why CNNs share weights" },
    ];
  },
  frame(time, p, tc) {
    const s = this._s; if (!s) return;
    const idx = Math.floor(time * 30) % (s.O * s.O), oi = idx % s.O, oj = Math.floor(idx / s.O);
    let { ctx, w, h } = setupCanvas(s.mc);
    title(ctx, "Input X (32 × 32 grey levels) with the sliding 3 × 3 window");
    const cs = Math.min((w * 0.62) / s.N, (h - 40) / s.N);
    for (let j = 0; j < s.N; j++) for (let i = 0; i < s.N; i++) { const v = Math.round(s.X[j * s.N + i] * 255); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(10 + i * cs, 26 + j * cs, cs + 0.4, cs + 0.4); }
    ctx.strokeStyle = COL.cri; ctx.lineWidth = 3; ctx.strokeRect(10 + oi * s.s * cs, 26 + oj * s.s * cs, 3 * cs, 3 * cs);
    const kx = 24 + s.N * cs, kc = Math.min(40, (w - kx - 10) / 3);
    title(ctx, "Kernel K", kx, 40);
    let sum = 0, terms = [];
    for (let u = 0; u < 3; u++) for (let q = 0; q < 3; q++) {
      const kv = s.K[u][q], xv = s.X[(oj * s.s + u) * s.N + oi * s.s + q]; sum += kv * xv; terms.push(xv);
      ctx.fillStyle = divColor(kv / (s.blur ? 0.3 : 8)); ctx.fillRect(kx + q * kc, 48 + u * kc, kc - 2, kc - 2); ctx.fillStyle = COL.ink; ctx.font = "600 11.5px ui-monospace"; ctx.fillText(Math.abs(kv) < 1 && kv !== 0 ? kv.toFixed(2) : kv, kx + q * kc + 4, 48 + u * kc + kc / 2 + 4);
    }
    title(ctx, "Patch under window", kx, 72 + 3 * kc);
    for (let u = 0; u < 3; u++) for (let q = 0; q < 3; q++) { const v = terms[u * 3 + q]; ctx.fillStyle = `rgb(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)})`; ctx.fillRect(kx + q * kc, 80 + 3 * kc + u * kc, kc - 2, kc - 2); ctx.fillStyle = v > 0.55 ? "#000" : "#fff"; ctx.font = "11px ui-monospace"; ctx.fillText(v.toFixed(2), kx + q * kc + 3, 80 + 3 * kc + u * kc + kc / 2 + 4); }
    const shown = s.relu ? Math.max(0, sum) : sum;
    ctx.fillStyle = COL.cri; ctx.font = "700 13px system-ui"; ctx.fillText(`Σ K·X = ${sum.toFixed(2)}`, kx, 104 + 6 * kc); if (s.relu) ctx.fillText(`ReLU → ${shown.toFixed(2)}`, kx, 122 + 6 * kc);
    ({ ctx, w, h } = setupCanvas(tc));
    title(ctx, `Feature map Y (${s.O} × ${s.O}) — red = strong positive, blue = negative`);
    const c2 = Math.min((w - 20) / s.O, (h - 40) / s.O), ox = (w - s.O * c2) / 2;
    for (let j = 0; j < s.O; j++) for (let i = 0; i < s.O; i++) { const v = s.Y[j * s.O + i]; ctx.fillStyle = s.blur ? `rgb(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)})` : divColor(v / s.mx); ctx.fillRect(ox + i * c2, 26 + j * c2, c2 + 0.4, c2 + 0.4); }
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.5; ctx.strokeRect(ox + oi * c2, 26 + oj * c2, c2, c2);
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; ctx.strokeRect(ox, 26, s.O * c2, s.O * c2);
  },
});

/* =====================================================================  A7. ATTENTION */
const ATT_SENT = [
  "The engineer fixed the motor because it was overheating",
  "The robot dropped the glass because it was slippery",
  "The bank of the river flooded after heavy rain",
];
// features: [person/agent, object, action, property, nature/place, function word]
const ATT_W = {
  the: { k: [0, 0, 0, 0, 0, 1], q: [0, 1, 0, 0, 0, 0] }, engineer: { k: [1.3, 0, 0, 0, 0, 0], q: [0, 0, 1.2, 0, 0, 0] }, fixed: { k: [0, 0, 1.3, 0, 0, 0], q: [1, 1, 0, 0, 0, 0] },
  motor: { k: [0, 1.3, 0, 0, 0, 0], q: [0, 0, 1, 0.6, 0, 0] }, because: { k: [0, 0, 0, 0, 0, 1], q: [0, 0, 1, 0, 0, 0] }, it: { k: [0, 0.3, 0, 0, 0, 0.6], q: [0, 1.6, 0, 0.3, 0, 0] },
  was: { k: [0, 0, 0, 0, 0, 1], q: [0, 0, 0, 1, 0, 0] }, overheating: { k: [0, 0, 0, 1.3, 0, 0], q: [0, 1.4, 0, 0, 0, 0] }, robot: { k: [0.9, 0.5, 0, 0, 0, 0], q: [0, 0, 1.2, 0, 0, 0] },
  dropped: { k: [0, 0, 1.3, 0, 0, 0], q: [1, 1, 0, 0, 0, 0] }, glass: { k: [0, 1.3, 0, 0, 0, 0], q: [0, 0, 1, 0.6, 0, 0] }, slippery: { k: [0, 0, 0, 1.3, 0, 0], q: [0, 1.4, 0, 0, 0, 0] },
  bank: { k: [0, 0.6, 0, 0, 0.6, 0], q: [0, 0, 0, 0, 1.7, 0] }, of: { k: [0, 0, 0, 0, 0, 1], q: [0, 1, 0, 0, 0, 0] }, river: { k: [0, 0.3, 0, 0, 1.4, 0], q: [0, 1, 0, 0, 0, 0] },
  flooded: { k: [0, 0, 1.2, 0.3, 0.6, 0], q: [0, 1, 0, 0, 1, 0] }, after: { k: [0, 0, 0, 0, 0, 1], q: [0, 0, 1, 0, 0, 0] }, heavy: { k: [0, 0, 0, 1.2, 0, 0], q: [0, 0, 0, 0, 1.3, 0] }, rain: { k: [0, 0, 0, 0, 1.3, 0], q: [0, 0, 1, 0, 0, 0] },
};
MODULES.push({
  id: "attn", group: "ai", disc: "Attention (Transformer)", icon: "👁️", math: "Dot products & softmax",
  title: "The heart of every LLM: attention decides which words to look at",
  question: "In 'the motor … because it was overheating', how does the model know 'it' = motor? Each word asks a question (query), every word offers a key, and dot products score the match.",
  eq: `Attention(Q, K, V) = softmax( Q Kᵀ / √d ) · V &nbsp;·&nbsp; score<sub>ij</sub> = q<sub>i</sub> · k<sub>j</sub> &nbsp;·&nbsp; softmax(z)<sub>j</sub> = e<sup>z<sub>j</sub></sup> / Σ e<sup>z<sub>k</sub></sup>`,
  eqNote: "Toy attention with hand-made 6-number word vectors (person, object, action, property, nature, function-word). Real transformers learn these vectors and run dozens of attention heads in parallel.",
  controls: [
    { id: "s", label: "Sentence", type: "select", value: "0", options: ATT_SENT.map((s, i) => [String(i), s]) },
    { id: "qi", label: "Query word (position)", min: 1, max: 9, step: 1, value: 7, unit: "" },
    { id: "sh", label: "Sharpness (1/√d scale)", min: 0.3, max: 3, step: 0.1, value: 1.5, unit: "" },
  ],
  connect: [["Query q (what I am looking for)", "'it' looks for an object"], ["Key k (what I offer)", "'motor' offers 'I am an object'"], ["Dot product q·k", "Relevance score between two words"], ["Softmax", "Turns scores into percentages that add to 100%"], ["Weighted sum of V", "New meaning of 'it' = mostly 'motor' — context understood"]],
  tryThis: ["Pick the word 'it' in sentences 1 and 2: which noun does it attend to?", "In sentence 3, which word tells the model that 'bank' is a river bank, not a money bank?", "Lower the sharpness: why does attention become 'blurry'? Raise it: why does it become all-or-nothing?"],
  uses: ["ChatGPT, Claude, Gemini, Llama (transformers)", "Machine translation, code assistants", "Vision transformers, protein-structure prediction"],
  run(p, mc, tc) {
    const words = ATT_SENT[+p.s].split(" "), n = words.length, qi = Math.min(p.qi, n) - 1;
    const V = words.map(w => ATT_W[w.toLowerCase()] || { k: [0, 0, 0, 0, 0, 1], q: [0, 0, 0, 0, 0, 1] });
    const A = V.map((a, i) => { const z = V.map((b, j) => (a.q.reduce((s, v, d) => s + v * b.k[d], 0) - 0.06 * Math.abs(i - j)) * p.sh * 2); const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), S = e.reduce((s, v) => s + v, 0); return e.map(v => v / S); });
    let { ctx, w, h } = setupCanvas(mc);
    title(ctx, "Attention matrix softmax(QKᵀ/√d): row = word asking, column = word looked at");
    const lab = 92, cs = Math.min((w - lab - 14) / n, (h - lab - 30) / n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      ctx.fillStyle = `rgba(157,29,89,${0.06 + 0.94 * A[i][j]})`; ctx.fillRect(lab + j * cs, 30 + i * cs, cs - 1.5, cs - 1.5);
      if (cs > 26) { ctx.fillStyle = A[i][j] > 0.45 ? "#fff" : COL.ink; ctx.font = "10.5px system-ui"; ctx.textAlign = "center"; ctx.fillText(Math.round(A[i][j] * 100), lab + j * cs + cs / 2, 30 + i * cs + cs / 2 + 4); ctx.textAlign = "left"; }
    }
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.5; ctx.strokeRect(lab - 2, 30 + qi * cs - 1, n * cs + 2, cs + 1);
    ctx.font = "12px system-ui"; ctx.fillStyle = COL.ink; ctx.textAlign = "right"; words.forEach((wd, i) => { ctx.font = i === qi ? "700 12px system-ui" : "12px system-ui"; ctx.fillText(wd, lab - 6, 30 + i * cs + cs / 2 + 4); }); ctx.textAlign = "left";
    words.forEach((wd, j) => { ctx.save(); ctx.translate(lab + j * cs + cs / 2 + 4, 34 + n * cs); ctx.rotate(Math.PI / 3); ctx.fillText(wd, 0, 0); ctx.restore(); });
    ({ ctx, w, h } = setupCanvas(tc));
    title(ctx, `Where does "${words[qi]}" look? (thickness = attention weight)`);
    ctx.font = "600 14px system-ui"; const ws = words.map(wd => ctx.measureText(wd).width + 16), total = ws.reduce((s, v) => s + v + 6, 0), scale = Math.min(1, (w - 20) / total);
    let x = (w - total * scale) / 2; const by = h * 0.5, pos = [];
    words.forEach((wd, i) => { const bw = ws[i] * scale; pos.push(x + bw / 2); ctx.fillStyle = i === qi ? COL.cri : `rgba(51,26,106,${0.12 + 0.8 * A[qi][i]})`; rrect(ctx, x, by, bw, 30, 8); ctx.fill(); ctx.fillStyle = i === qi || A[qi][i] > 0.35 ? "#fff" : COL.ink; ctx.font = `600 ${Math.round(14 * scale)}px system-ui`; ctx.fillText(wd, x + 8 * scale, by + 20); x += bw + 6 * scale; });
    words.forEach((wd, j) => { if (j === qi) return; const a = A[qi][j], x1 = pos[qi], x2 = pos[j], mid = (x1 + x2) / 2, ht = Math.min(by - 50, 20 + Math.abs(x2 - x1) * 0.45); ctx.strokeStyle = `rgba(157,29,89,${0.15 + 0.85 * a})`; ctx.lineWidth = 1 + 12 * a; ctx.beginPath(); ctx.moveTo(x1, by - 2); ctx.quadraticCurveTo(mid, by - ht * 2, x2, by - 2); ctx.stroke(); if (a > 0.06) { ctx.fillStyle = COL.cri; ctx.font = "700 12px system-ui"; ctx.textAlign = "center"; ctx.fillText(Math.round(a * 100) + "%", mid, by - ht - 6); ctx.textAlign = "left"; } });
    const order = A[qi].map((a, j) => [a, j]).sort((a, b) => b[0] - a[0]);
    ctx.fillStyle = COL.ink; ctx.font = "13px system-ui";
    ctx.fillText(`New meaning of "${words[qi]}" = ${order.slice(0, 3).map(([a, j]) => `${Math.round(a * 100)}% ${words[j]}`).join(" + ")} + …`, 14, by + 70);
    ctx.fillStyle = COL.muted; ctx.font = "12px system-ui"; ctx.fillText("This blended vector is passed to the next layer; an LLM repeats this in ~30–100 layers.", 14, by + 92);
    const top = order.find(([a, j]) => j !== qi) || order[0], ent = -A[qi].reduce((s, a) => s + (a > 0 ? a * Math.log2(a) : 0), 0);
    return [
      { label: `"${words[qi]}" attends most to`, value: words[top[1]], note: `${Math.round(top[0] * 100)}% of its attention` },
      { label: "Focus (entropy)", value: ent.toFixed(2), unit: "bits", status: ent < 1.5 ? "good" : ent < 2.5 ? "warn" : "bad", note: "low = focused, high = spread out" },
      { label: "Attention scores computed", value: n * n, note: `n² — doubles text → 4× work` },
      { label: "For a 100,000-token document", value: "10 billion", unit: "scores / head / layer" },
    ];
  },
});

/* =====================================================================  A8. NEXT-WORD PREDICTION */
const CORPUS = ("the students learn mathematics . the students build robots . the students learn machine learning . the students ask the professor . " +
  "the engineer designs the bridge . the engineer tests the motor . the engineer designs the robot . the engineer uses mathematics . " +
  "the machine learns from data . the machine predicts the next word . the model learns from data . the model predicts the next word . the model answers the question . " +
  "artificial intelligence learns from data . artificial intelligence helps the engineer . artificial intelligence helps the students . artificial intelligence writes code . " +
  "the robot moves the box . the robot learns from mistakes . the motor drives the robot . the bridge carries the trucks . the data trains the model . " +
  "mathematics helps the engineer . mathematics powers artificial intelligence . the professor teaches mathematics . the professor guides the students . the professor answers the question .").split(" ");
const BI = {}, TRI = {};
for (let i = 0; i < CORPUS.length - 1; i++) { const a = CORPUS[i], b = CORPUS[i + 1]; (BI[a] = BI[a] || {})[b] = (BI[a][b] || 0) + 1; if (i) { const k = CORPUS[i - 1] + " " + a; (TRI[k] = TRI[k] || {})[b] = (TRI[k][b] || 0) + 1; } }
function nextDist(prev2, prev1, T, topk) {
  const cands = Object.keys(BI[prev1] || BI["."]), tri = TRI[prev2 + " " + prev1] || {};
  const z = cands.map(c => Math.log(3 * (tri[c] || 0) + (BI[prev1] || BI["."])[c] + 0.05));
  const p1 = (() => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), S = e.reduce((s, v) => s + v, 0); return e.map(v => v / S); })();
  const order = cands.map((c, i) => i).sort((a, b) => z[b] - z[a]), keep = new Set(order.slice(0, topk));
  const zt = z.map((v, i) => keep.has(i) ? v / T : -Infinity), m = Math.max(...zt), e = zt.map(v => isFinite(v) ? Math.exp(v - m) : 0), S = e.reduce((s, v) => s + v, 0);
  return order.map(i => ({ w: cands[i], z: z[i], p1: p1[i], p: e[i] / S }));
}
MODULES.push({
  id: "llm", group: "ai", disc: "Next-word prediction", icon: "💬", math: "Probability & softmax",
  title: "How a chatbot writes: predict a probability for every next word, then sample",
  question: "An LLM does one thing again and again: given the words so far, output a probability for each possible next token, pick one, append it, repeat.",
  eq: `P(word<sub>i</sub> | context) = e<sup>z<sub>i</sub>/T</sup> / Σ<sub>j</sub> e<sup>z<sub>j</sub>/T</sup> &nbsp;·&nbsp; T = temperature, top-k keeps only the k largest &nbsp;·&nbsp; entropy H = −Σ p log₂ p`,
  eqNote: "A tiny word model built from 28 sentences by counting (trigram). Real LLMs compute the scores z with a transformer over a 100,000-token vocabulary — the sampling step is exactly this.",
  controls: [
    { id: "pr", label: "Prompt", type: "select", value: "the students", options: [["the students", "the students …"], ["the engineer", "the engineer …"], ["artificial intelligence", "artificial intelligence …"], ["the model", "the model …"], ["the professor", "the professor …"]] },
    { id: "T", label: "Temperature T", min: 0.1, max: 2.5, step: 0.05, value: 0.8, unit: "" },
    { id: "k", label: "Top-k", min: 1, max: 10, step: 1, value: 5, unit: "words" },
    { id: "len", label: "Words to generate", min: 5, max: 30, step: 1, value: 16, unit: "" },
    { id: "seed", label: "Random seed (try again)", min: 1, max: 30, step: 1, value: 1, unit: "" },
  ],
  connect: [["Scores z (logits)", "The LLM's raw output for every token in its vocabulary"], ["Softmax", "Converts scores to probabilities that sum to 1"], ["Temperature T", "Low = safe & repetitive, high = creative & error-prone"], ["Top-k", "Cuts off unlikely (often wrong) words"], ["Sampling, one token at a time", "Why answers stream word by word and differ each time"]],
  tryThis: ["Set T = 0.1 and change the seed: why is the text always the same?", "Set T = 2.5 and top-k = 10: when does the text stop making sense?", "Which prompt gives the most uncertain next word (highest entropy)?"],
  uses: ["ChatGPT, Claude, Gemini, Copilot", "Auto-complete in phones, e-mail and code editors", "Speech recognition & translation decoders"],
  run(p, mc, tc) {
    const pw = p.pr.split(" "), first = nextDist(pw[pw.length - 2] || ".", pw[pw.length - 1], p.T, p.k), rnd = mulberry(p.seed * 97 + 13);
    const gen = []; let a = pw[pw.length - 2] || ".", b = pw[pw.length - 1];
    for (let i = 0; i < p.len; i++) { const d = nextDist(a, b, p.T, p.k); let r = rnd(), pick = d[0]; for (const c of d) { r -= c.p; if (r <= 0) { pick = c; break; } } gen.push(pick); a = b; b = pick.w; }
    this._s = { gen, prompt: p.pr };
    const { ctx, w, h } = setupCanvas(mc);
    title(ctx, `Next word after "${p.pr}": grey = raw softmax (T = 1), colour = after T & top-k`);
    const items = first.slice(0, 10), X0 = 120, Wd = w - X0 - 60, bh = Math.min(30, (h - 60) / items.length);
    items.forEach((c, i) => {
      const y = 34 + i * bh; ctx.fillStyle = COL.ink; ctx.font = "600 12.5px system-ui"; ctx.textAlign = "right"; ctx.fillText(c.w === "." ? "“.” (end)" : c.w, X0 - 8, y + bh / 2 + 4); ctx.textAlign = "left";
      ctx.fillStyle = "#ddd6e8"; ctx.fillRect(X0, y + 3, c.p1 * Wd, bh / 2 - 3);
      ctx.fillStyle = c.p > 0 ? COL.cri : "#eee"; ctx.fillRect(X0, y + bh / 2, Math.max(c.p * Wd, c.p > 0 ? 2 : 0), bh / 2 - 3);
      ctx.fillStyle = COL.ink; ctx.font = "11.5px system-ui"; ctx.fillText(c.p > 0 ? (c.p * 100).toFixed(1) + "%" : "cut by top-k", X0 + Math.max(c.p, c.p1) * Wd + 6, y + bh / 2 + 4);
    });
    ctx.fillStyle = COL.muted; ctx.font = "12px system-ui"; ctx.fillText(`z (log-score) of top word = ${items[0].z.toFixed(2)}; all probabilities add up to 100%.`, 12, h - 12);
    const ent = -first.reduce((s, c) => s + (c.p > 0 ? c.p * Math.log2(c.p) : 0), 0), avg = gen.reduce((s, c) => s + c.p, 0) / gen.length;
    return [
      { label: "Top next-word probability", value: (first[0].p * 100).toFixed(1), unit: "%" },
      { label: "Uncertainty (entropy)", value: ent.toFixed(2), unit: "bits", status: ent < 1 ? "good" : ent < 2 ? "warn" : "bad", note: "high = many plausible words" },
      { label: "Average confidence of generated words", value: (avg * 100).toFixed(0), unit: "%", status: avg > 0.6 ? "good" : avg > 0.35 ? "warn" : "bad", note: "low → more 'hallucination' risk" },
      { label: "Vocabulary of this toy model", value: Object.keys(BI).length, unit: "words", note: "real LLMs ≈ 100,000 tokens" },
    ];
  },
  frame(time, p, tc) {
    const s = this._s; if (!s) return;
    const shown = Math.min(s.gen.length, Math.floor((time * 2.5) % (s.gen.length + 6)));
    const { ctx, w, h } = setupCanvas(tc);
    title(ctx, "Chatbot output, generated one word at a time (underline = probability of that word)");
    ctx.fillStyle = "#f1ecf8"; rrect(ctx, 12, 30, w - 24, h * 0.62, 14); ctx.fill(); ctx.fillStyle = COL.muted; ctx.font = "12px system-ui"; ctx.fillText("🤖 toy LLM", w - 100, 50);
    let x = 26, y = 60; ctx.font = "700 16px system-ui"; ctx.fillStyle = COL.pur;
    for (const wd of s.prompt.split(" ")) { ctx.fillText(wd, x, y); x += ctx.measureText(wd + " ").width; }
    ctx.font = "16px system-ui";
    s.gen.slice(0, shown).forEach((c, i) => {
      const t = c.w === "." ? "." : c.w, ww = ctx.measureText(t + " ").width; if (x + ww > w - 26) { x = 26; y += 34; }
      ctx.fillStyle = COL.ink; ctx.fillText(t, x, y); ctx.fillStyle = c.p > 0.6 ? COL.good : c.p > 0.3 ? COL.warn : COL.bad; ctx.fillRect(x, y + 5, ctx.measureText(t).width, 4); x += ww;
    });
    if (shown < s.gen.length && Math.floor(time * 3) % 2) { ctx.fillStyle = COL.cri; ctx.fillRect(x, y - 14, 9, 18); }
    const ly = 46 + h * 0.62; ctx.font = "12px system-ui";
    [[COL.good, "confident (p > 60%)"], [COL.warn, "unsure (30–60%)"], [COL.bad, "risky guess (< 30%)"]].forEach(([c, l], i) => { ctx.fillStyle = c; ctx.fillRect(14 + i * 170, ly, 22, 6); ctx.fillStyle = COL.ink; ctx.fillText(l, 42 + i * 170, ly + 7); });
    if (shown > 0) { const c = s.gen[shown - 1]; ctx.fillStyle = COL.muted; ctx.fillText(`Step ${shown}: picked "${c.w}" with probability ${(c.p * 100).toFixed(1)}%`, 14, ly + 30); }
  },
});
