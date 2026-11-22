/* App shell: sidebar, overview map, module view, sliders, metrics, animation */
"use strict";
const $ = s => document.querySelector(s);
const STATUS = { good: ["✔", "On target"], warn: ["▲", "Watch"], bad: ["✖", "Fails"] };
let current = null, params = {}, raf = 0, t0 = performance.now();

function buildNav() {
  const nav = $("#nav"), btn = m => `<button class="navbtn" data-id="${m.id}"><span class="ic">${m.icon}</span><span><b>${m.disc}</b><small>${m.math}</small></span></button>`;
  nav.innerHTML = `<button class="navbtn" data-id="home"><span class="ic">🗺️</span><span><b>Overview</b><small>Math → discipline map</small></span></button>
    <div class="navh">Engineering twins</div>${MODULES.filter(m => m.group !== "ai").map(btn).join("")}
    <div class="navh ai">AI &amp; LLM — for everyone</div>
    <button class="navbtn" data-id="ai"><span class="ic">🤖</span><span><b>How AI works</b><small>Start here: the LLM pipeline</small></span></button>
    ${MODULES.filter(m => m.group === "ai").map(btn).join("")}`;
  nav.onclick = e => { const b = e.target.closest(".navbtn"); if (b) go(b.dataset.id); };
}

const cardHTML = m => `
      <button class="card${m.group === "ai" ? " aic" : ""}" data-id="${m.id}">
        <div class="ctop"><span class="cic">${m.icon}</span><span class="tag">${m.math}</span></div>
        <h3>${m.disc}</h3><p>${m.title}</p>
        <ul>${m.uses.map(u => `<li>${u}</li>`).join("")}</ul>
        <span class="open">Open twin →</span>
      </button>`;

function aiSectionHTML(withHero) {
  const step = (id, ic, t, d) => `<button class="pstep" data-id="${id}"><span class="pic">${ic}</span><b>${t}</b><small>${d}</small></button>`;
  return `
    ${withHero ? `<section class="hero ai">
      <h1>How AI and Large Language Models work — <span>it is all mathematics</span></h1>
      <p>ChatGPT, Claude, Gemini and image or speech AI are not magic. They are <b>vectors, matrices, derivatives and probability</b> — the same B.Tech maths — applied billions of times. Follow the pipeline below; every box opens a live, hands-on twin.</p>
    </section>` : ""}
    <h2 class="sec">1 · Everything becomes numbers</h2>
    <div class="pipe">
      ${step("tokens", "🔤", "Text", "split into tokens → vectors")}
      ${step("vision", "🖼️", "Images & video", "pixels → patches → vectors")}
      ${step("audio", "🎙️", "Audio", "samples → spectrogram → vectors")}
    </div>
    <div class="arrowdown">⬇ all inputs become a sequence of vectors (embeddings)</div>
    <h2 class="sec">2 · The transformer mixes and transforms them</h2>
    <div class="pipe">
      ${step("attn", "👁️", "Attention", "dot products + softmax: which words matter")}
      ${step("nn", "🧠", "Neural layers", "matrix × vector + activation")}
      ${step("cnn", "🔍", "Convolution", "image feature detectors (CNNs)")}
    </div>
    <div class="arrowdown">⬇ repeated in many layers → scores for every possible next token</div>
    <h2 class="sec">3 · Output, and how it learned</h2>
    <div class="pipe">
      ${step("llm", "💬", "Next-word prediction", "softmax → probability → sample")}
      ${step("gd", "⛰️", "Training", "gradient descent on the loss")}
    </div>
    <h2 class="sec">The B.Tech maths behind AI</h2>
    <table class="mtab">
      <thead><tr><th>Maths you learned</th><th>Where it lives in AI</th><th>Twin</th></tr></thead>
      <tbody>
        <tr><td>Vectors, dot product, cosine</td><td>Word embeddings, semantic search, attention scores</td><td>🔤 👁️</td></tr>
        <tr><td>Matrices &amp; matrix multiplication</td><td>Every layer: y = W x + b (GPUs are matrix machines)</td><td>🧠</td></tr>
        <tr><td>Functions (exp, tanh, max)</td><td>Activations, softmax</td><td>🧠 💬</td></tr>
        <tr><td>Partial derivatives, chain rule</td><td>Back-propagation — computing ∇L</td><td>🧠 ⛰️</td></tr>
        <tr><td>Optimisation (minima, gradient)</td><td>Training = minimising the loss</td><td>⛰️</td></tr>
        <tr><td>Probability &amp; statistics</td><td>Next-token prediction, temperature, entropy</td><td>💬</td></tr>
        <tr><td>Fourier transform, convolution</td><td>Speech spectrograms, CNN image filters</td><td>🎙️ 🔍</td></tr>
        <tr><td>Eigenvectors / PCA</td><td>Compressing and visualising embeddings</td><td>💻 (CSE twin)</td></tr>
      </tbody>
    </table>
    <div class="grid" style="margin-top:18px">${MODULES.filter(m => m.group === "ai").map(cardHTML).join("")}</div>
    <p class="fine">All AI twins are tiny teaching models that run in your browser. They use the same equations as real systems, at a scale you can see.</p>`;
}
function aiHome() {
  cancelAnimationFrame(raf); current = null;
  $("#main").innerHTML = aiSectionHTML(true);
  $("#main").onclick = e => { const c = e.target.closest(".card,.pstep"); if (c) go(c.dataset.id); };
}

function home() {
  cancelAnimationFrame(raf); current = null;
  $("#main").innerHTML = `
    <section class="hero">
      <h1>The maths you learn in B.Tech — <span>running live inside real engineering</span></h1>
      <p>Each card is a <b>digital twin</b>: a mathematical model on the left, the engineering system it controls on the right. Move a slider and watch both the equation and the performance of the product change together.</p>
      <div class="legend"><span class="st good">✔ On target</span><span class="st warn">▲ Watch</span><span class="st bad">✖ Fails a design limit</span></div>
    </section>
    <h2 class="sec">Math topic → where it works</h2>
    <div class="grid">${MODULES.filter(m => m.group !== "ai").map(cardHTML).join("")}</div>
    <section id="ai-section" class="aiblock">
      <div class="aihead"><span>🤖</span><div><h2>How AI &amp; Large Language Models work — maths for everyone</h2><p>ChatGPT, Claude, Gemini, image and speech AI are vectors, matrices, derivatives and probability — the same B.Tech maths. Click any box to open its live twin.</p></div></div>
      ${aiSectionHTML(false)}
    </section>
    <h2 class="sec">How to use this in a class (15 minutes)</h2>
    <ol class="howto">
      <li><b>Pose the engineering question</b> shown at the top of a twin before showing any equation.</li>
      <li><b>Let students predict</b> which slider will help most, then test it live.</li>
      <li><b>Read the "How the maths connects" table</b> — every symbol has a physical meaning.</li>
      <li><b>Set a "Try this" challenge</b>: hit the design target (all metrics green) with the cheapest change.</li>
      <li><b>Close with the theory</b>: now the derivation has a reason to exist.</li>
    </ol>
    <p class="fine">Models are deliberately simplified for teaching (stated under each equation). Use them to build intuition, not for final design.</p>`;
  $("#main").onclick = e => { const c = e.target.closest(".card,.pstep"); if (c) go(c.dataset.id); };
}

function ctrlHTML(c) {
  if (c.type === "select") return `<label class="ctl"><span class="lab">${c.label}</span><select id="c_${c.id}">${c.options.map(([v, t]) => `<option value="${v}"${v === c.value ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
  return `<label class="ctl"><span class="lab">${c.label} <output id="o_${c.id}">${c.value}</output> <i>${c.unit || ""}</i></span><input type="range" id="c_${c.id}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}"></label>`;
}

function show(m) {
  cancelAnimationFrame(raf); current = m;
  params = Object.fromEntries(m.controls.map(c => [c.id, c.type === "select" ? c.value : +c.value]));
  $("#main").innerHTML = `
    <section class="mhead">
      <div class="mtag"><span>${m.icon} ${m.disc}</span><span class="tag">${m.math}</span></div>
      <h1>${m.title}</h1><p class="q">❓ ${m.question}</p>
    </section>
    <section class="eqbox"><div class="eq">${m.eq}</div><div class="eqn">${m.eqNote}</div></section>
    <section class="controls">${m.controls.map(ctrlHTML).join("")}<button id="reset" class="reset">↺ Reset</button></section>
    <section class="panes">
      <div class="pane"><div class="ph"><span class="dot m"></span>The mathematics</div><canvas id="mc"></canvas></div>
      <div class="pane"><div class="ph"><span class="dot e"></span>The engineering twin${m.frame ? ' <em>· live</em>' : ""}</div><canvas id="tc"></canvas></div>
    </section>
    <section class="metrics" id="metrics" aria-live="polite"></section>
    <section class="two">
      <div class="box"><h3>🔗 How the maths connects</h3><table><thead><tr><th>Maths</th><th>Engineering meaning</th></tr></thead><tbody>${m.connect.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</tbody></table></div>
      <div class="box"><h3>🎯 Try this</h3><ol>${m.tryThis.map(t => `<li>${t}</li>`).join("")}</ol><h3 class="mt">🏭 Same maths also used in</h3><ul>${m.uses.map(u => `<li>${u}</li>`).join("")}</ul></div>
    </section>`;
  m.controls.forEach(c => {
    const el = $("#c_" + c.id);
    el.addEventListener("input", () => { params[c.id] = c.type === "select" ? el.value : +el.value; const o = $("#o_" + c.id); if (o) o.textContent = el.value; schedule(); });
  });
  $("#reset").onclick = () => show(m);
  render();
  if (m.frame) loop();
}

let pending = false;
function schedule() { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; render(); }); } }

function metricsHTML(met) {
  return met.map(x => {
    const s = x.status ? STATUS[x.status] : null;
    return `<div class="met ${x.status || ""}"><div class="ml">${x.label}</div><div class="mv">${x.value}<small>${x.unit ? " " + x.unit : ""}</small></div>${s ? `<div class="ms"><span>${s[0]}</span> ${s[1]}</div>` : ""}${x.note ? `<div class="mn">${x.note}</div>` : ""}</div>`;
  }).join("");
}
function render() {
  const m = current; if (!m) return;
  let met = m.run(params, $("#mc"), $("#tc")) || [];
  if (m.frame) { const fm = m.frame((performance.now() - t0) / 1000, params, $("#tc"), $("#mc")); if (fm) met = fm; }
  $("#metrics").innerHTML = metricsHTML(met);
}

function loop() {
  const m = current; let n = 0;
  const step = () => {
    if (current !== m) return;
    const fm = m.frame((performance.now() - t0) / 1000, params, $("#tc"), $("#mc"));
    if (fm && ++n % 8 === 0) $("#metrics").innerHTML = metricsHTML(fm);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function go(id) {
  document.querySelectorAll(".navbtn").forEach(b => b.classList.toggle("on", b.dataset.id === id));
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  if (id === "home-ai") { home(); document.getElementById("ai-section").scrollIntoView(); return; }
  const m = MODULES.find(x => x.id === id);
  m ? show(m) : id === "ai" ? aiHome() : home();
  window.scrollTo(0, 0);
  document.body.classList.remove("menu");
}

window.addEventListener("hashchange", () => { const id = location.hash.slice(1) || "home"; if (!current || current.id !== id) go(id); });
window.addEventListener("resize", () => { if (current) schedule(); });
buildNav();
$("#burger").onclick = () => document.body.classList.toggle("menu");
go((location.hash || "#home").slice(1));
