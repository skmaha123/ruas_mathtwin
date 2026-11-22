/* App shell: sidebar, overview map, module view, sliders, metrics, animation */
"use strict";
const $ = s => document.querySelector(s);
const STATUS = { good: ["✔", "On target"], warn: ["▲", "Watch"], bad: ["✖", "Fails"] };
let current = null, params = {}, raf = 0, t0 = performance.now();

function buildNav() {
  const nav = $("#nav");
  nav.innerHTML = `<button class="navbtn" data-id="home"><span class="ic">🗺️</span><span><b>Overview</b><small>Math → discipline map</small></span></button>` +
    MODULES.map(m => `<button class="navbtn" data-id="${m.id}"><span class="ic">${m.icon}</span><span><b>${m.disc}</b><small>${m.math}</small></span></button>`).join("");
  nav.onclick = e => { const b = e.target.closest(".navbtn"); if (b) go(b.dataset.id); };
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
    <div class="grid">${MODULES.map(m => `
      <button class="card" data-id="${m.id}">
        <div class="ctop"><span class="cic">${m.icon}</span><span class="tag">${m.math}</span></div>
        <h3>${m.disc}</h3><p>${m.title}</p>
        <ul>${m.uses.map(u => `<li>${u}</li>`).join("")}</ul>
        <span class="open">Open twin →</span>
      </button>`).join("")}
    </div>
    <h2 class="sec">How to use this in a class (15 minutes)</h2>
    <ol class="howto">
      <li><b>Pose the engineering question</b> shown at the top of a twin before showing any equation.</li>
      <li><b>Let students predict</b> which slider will help most, then test it live.</li>
      <li><b>Read the "How the maths connects" table</b> — every symbol has a physical meaning.</li>
      <li><b>Set a "Try this" challenge</b>: hit the design target (all metrics green) with the cheapest change.</li>
      <li><b>Close with the theory</b>: now the derivation has a reason to exist.</li>
    </ol>
    <p class="fine">Models are deliberately simplified for teaching (stated under each equation). Use them to build intuition, not for final design.</p>`;
  $("#main").onclick = e => { const c = e.target.closest(".card"); if (c) go(c.dataset.id); };
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

function render() {
  const m = current; if (!m) return;
  const met = m.run(params, $("#mc"), $("#tc")) || [];
  if (m.frame) m.frame((performance.now() - t0) / 1000, params, $("#tc"));
  $("#metrics").innerHTML = met.map(x => {
    const s = x.status ? STATUS[x.status] : null;
    return `<div class="met ${x.status || ""}"><div class="ml">${x.label}</div><div class="mv">${x.value}<small>${x.unit ? " " + x.unit : ""}</small></div>${s ? `<div class="ms"><span>${s[0]}</span> ${s[1]}</div>` : ""}${x.note ? `<div class="mn">${x.note}</div>` : ""}</div>`;
  }).join("");
}

function loop() {
  const m = current;
  const step = () => { if (current !== m) return; m.frame((performance.now() - t0) / 1000, params, $("#tc")); raf = requestAnimationFrame(step); };
  raf = requestAnimationFrame(step);
}

function go(id) {
  document.querySelectorAll(".navbtn").forEach(b => b.classList.toggle("on", b.dataset.id === id));
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  const m = MODULES.find(x => x.id === id);
  m ? show(m) : home();
  window.scrollTo(0, 0);
  document.body.classList.remove("menu");
}

window.addEventListener("resize", () => { if (current) schedule(); });
buildNav();
$("#burger").onclick = () => document.body.classList.toggle("menu");
go((location.hash || "#home").slice(1));
