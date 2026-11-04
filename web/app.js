// Judge the Model: three sections that read results/ and help a clinical lead judge each model.
//
// Run locally:  bash run_app.sh   (it runs node web/server.mjs; then open http://localhost:8766/)
// Every number comes from m11.js, computed from the files in results/. Every table and plot says
// Training or Test. The bridge (bridge.js) only decides how a section is opened; it computes nothing.
import * as m11 from "./m11.js";

const TRAIN = "Training";
const TEST = "Test";
const SECTIONS = ["1. Beyond Accuracy", "2. A Threshold for the Job", "3. Training vs. Test"];

// Words for each dataset's two classes (from data/README.md). Text only: no numbers come from here.
const WORDS = {
  readmission: {
    who: "patients", one: "patient", aOne: "a patient",
    posName: "Readmitted within 30 days", negName: "Not readmitted within 30 days",
    posShort: "Readmitted", negShort: "Not readmitted",
    posVerb: "were readmitted within 30 days", negVerb: "were not readmitted within 30 days",
    posVerb1: "was readmitted within 30 days", posFound: "readmissions caught",
    missedMeans: "These patients may not receive additional discharge planning or follow-up after discharge.",
  },
  diabetes: {
    who: "adults", one: "adult", aOne: "an adult",
    posName: "Diabetes (reported doctor diagnosis or HbA1c ≥ 6.5%)", negName: "No diabetes by this label",
    posShort: "Diabetes", negShort: "No diabetes",
    posVerb: "have diabetes by this label", negVerb: "do not have diabetes by this label",
    posVerb1: "has diabetes by this label", posFound: "cases found",
    missedMeans: "For these adults, further evaluation or confirmatory testing may be delayed.",
  },
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const int = (n) => n.toLocaleString("en-US");
const state = { section: SECTIONS[0], key: "readmission", model: "logreg", threshold: 0.5 };
const cache = {};

async function load(name) {
  if (!(name in cache)) {
    // ../results/ is next to web/ on GitHub Pages; web/server.mjs serves it at the same address.
    const r = await fetch(`../results/${name}.json`);
    cache[name] = r.ok ? await r.json() : null;
  }
  return cache[name];
}

const caption = (text) => `<p class="caption">${esc(text)}</p>`;
const partTag = (part) => `<span class="part part-${part === TRAIN ? "train" : "test"}">${part}</span>`;
const fmtT = (t) => t.toFixed(2);
// A change between two rates, in percentage points; undefined stays "undefined".
const fmtPts = (a, b) => (a === null || b === null ? "undefined" : `${b - a >= 0 ? "+" : "−"}${Math.abs((b - a) * 100).toFixed(1)} pts`);
const fmtDelta = (a, b, d = 0) => { const v = b - a; return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`; };
const per100 = (count, n) => (100 * count) / n; // counts come from m11.confusion

// rows: array of objects; the first column is the row header. opts.highlight: index of a row to mark.
function table(rows, opts = {}) {
  const cols = Object.keys(rows[0]);
  const head = cols.map((c) => `<th scope="col">${esc(c)}</th>`).join("");
  const body = rows.map((r, j) => `<tr${j === opts.highlight ? ' class="hl"' : ""}>` + cols.map((c, i) => i === 0 ? `<th scope="row">${esc(r[c])}</th>`
    : `<td class="num">${esc(r[c])}</td>`).join("") + "</tr>").join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// The confusion matrix in the course layout: rows = what actually happened, columns = what the model said, positives first.
function matrix(c, w, { small = false, label = "" } = {}) {
  const cell = (n, name, cls) => `<td class="cm-${cls}"><span class="cm-n">${int(n)}</span>${small ? "" : `<span class="cm-name">${name}</span>`}</td>`;
  return `<table class="cm${small ? " cm-small" : ""}"${label ? ` aria-label="${esc(label)}"` : ""}>
    <thead><tr><td></td><th scope="col">Model said: flag</th><th scope="col">Model said: don't flag</th></tr></thead>
    <tbody>
      <tr><th scope="row">Actually: ${esc(w.posShort)}</th>${cell(c.tp, "caught (true positives)", "tp")}${cell(c.fn, "missed (false negatives)", "fn")}</tr>
      <tr><th scope="row">Actually: ${esc(w.negShort)}</th>${cell(c.fp, "false alarms (false positives)", "fp")}${cell(c.tn, "correctly not flagged (true negatives)", "tn")}</tr>
    </tbody></table>`;
}

// Design choice (see DECISIONS.md): show first how many real positive cases the model misses at the current
// threshold, with what that means clinically, so the lead sees what the model fails to identify, not only its successes.
function missedPanel(c, m, w, t, compare) {
  const missRate = m.sensitivity === null ? null : 1 - m.sensitivity; // missed ÷ all who had the outcome
  return `<div class="missed">
    <p class="missed-kicker">${TEST} · missed at threshold ${fmtT(t)}</p>
    <p class="missed-n"><strong>${int(c.fn)}</strong> of ${int(m.positives)} ${w.who} who ${w.posVerb} were <strong>not flagged</strong> (${m11.fmtPct(missRate)})</p>
    <p class="missed-why">${esc(w.missedMeans)}</p>
    ${compare ? `<p class="missed-cmp">${compare}</p>` : ""}
  </div>`;
}

async function recommendations() {
  const recs = (await load("decisions"))?.recommendations || {};
  const any = Object.values(recs).some(Boolean);
  const html = any
    ? m11.DATASETS.map((k) => `<p><strong>${esc(m11.DATASET_LABEL[k])}:</strong> ${recs[k] ? esc(recs[k]) : "<em>not written yet</em>"}</p>`).join("")
    : caption("No recommendations yet: fill in Recommendations in DECISIONS.md, run python -m analysis, then commit and push.");
  $("recommendations").insertAdjacentHTML("beforeend", html);
  $("bridge-recommendations").innerHTML = html;
}

// ---- 1. Beyond Accuracy ------------------------------------------------------
function beyondAccuracy(res, model, el) {
  const w = WORDS[state.key];
  const [p, y] = m11.preds(res, model);
  const c = m11.confusion(p, y, 0.5);
  const m = m11.metrics(c);
  const alwaysC = m11.confusion(y.map(() => 0), y, 0.5); // "always no": a probability of 0 for everyone, so nobody is flagged
  const always = m11.metrics(alwaysC);
  const majority = m11.majorityAccuracy(y);
  const name = m11.MODEL_LABEL[model];

  const q = (question, answer, detail) => `<div class="qcard"><p class="q">${question}</p><p class="a">${answer}</p>${detail ? `<p class="d">${detail}</p>` : ""}</div>`;
  const precisionAnswer = m.precision === null
    ? `Undefined: it flagged no one, so there is nothing to divide (0 ÷ 0).`
    : `${int(c.tp)} of ${int(m.flagged)} <span class="metric">precision ${m11.fmtPct(m.precision)}</span>`;

  const rows = m11.MODELS.filter((k) => k in res.models).map((k) => {
    const mk = m11.metrics(m11.confusion(...m11.preds(res, k), 0.5));
    return { Model: m11.MODEL_LABEL[k], Accuracy: m11.fmtPct(mk.accuracy), "Sensitivity (recall, TPR)": m11.fmtPct(mk.sensitivity),
             Specificity: m11.fmtPct(mk.specificity), "FPR (1 − specificity)": m11.fmtPct(mk.fpr), Precision: m11.fmtPct(mk.precision), F1: m11.fmtNum(mk.f1) };
  });
  const keys = m11.MODELS.filter((k) => k in res.models);
  const minis = keys.map((k) => `<figure class="mini${k === model ? " hl" : ""}"><figcaption>${esc(m11.MODEL_LABEL[k])}</figcaption>
      ${matrix(m11.confusion(...m11.preds(res, k), 0.5), w, { small: true, label: `${m11.MODEL_LABEL[k]}, test confusion matrix at threshold 0.50` })}</figure>`).join("");

  el.innerHTML = `
    <div class="callout"><strong>Positive class:</strong> ${esc(w.posName)}. ${esc(w.aOne[0].toUpperCase() + w.aOne.slice(1))} is <em>flagged</em> when the model's probability is at or above the threshold, 0.50 in this section.</div>
    ${missedPanel(c, m, w, 0.5)}

    <h3>Why accuracy alone misleads</h3>
    <p>Of the ${int(m.n)} test ${w.who}, ${int(m.positives)} (${m11.fmtPct(m.prevalence)}) ${w.posVerb}.
       A rule that gives everyone the most common answer ("no") is right ${m11.fmtPct(majority)} of the time, yet it catches ${int(alwaysC.tp)} of them.</p>
    ${caption(`${TEST} · threshold 0.50`)}
    ${table([
      { "": `Always "no"`, Accuracy: m11.fmtPct(always.accuracy), [`${w.posShort} ${w.who} caught`]: `${int(alwaysC.tp)} of ${int(m.positives)}` },
      { "": name, Accuracy: m11.fmtPct(m.accuracy), [`${w.posShort} ${w.who} caught`]: `${int(c.tp)} of ${int(m.positives)}` },
    ])}

    <h3>${esc(name)}, in the clinical lead's questions</h3>
    ${caption(`${TEST} · ${name}, threshold 0.50`)}
    <div class="qgrid">
      ${q(`Of the ${w.who} who ${w.posVerb}, how many did the model flag?`, `${int(c.tp)} of ${int(m.positives)} <span class="metric">sensitivity ${m11.fmtPct(m.sensitivity)}</span>`, "Also called recall or the true positive rate (TPR).")}
      ${q(`Of the ${w.who} who ${w.negVerb}, how many did it leave unflagged?`, `${int(c.tn)} of ${int(m.negatives)} <span class="metric">specificity ${m11.fmtPct(m.specificity)}</span>`, `The rest, ${int(c.fp)}, are false alarms (FPR ${m11.fmtPct(m.fpr)}).`)}
      ${q(`Of the ${w.who} the model flagged, how many ${w.posVerb}?`, precisionAnswer, "Precision: how often a flag is right.")}
      ${q(`How often is it right overall, and is that better than always saying "no"?`, `<span class="metric">accuracy ${m11.fmtPct(m.accuracy)}</span> vs ${m11.fmtPct(majority)} for always "no"`, `Of all ${int(m.n)} test ${w.who}, the share it got right.`)}
    </div>

    <h3>The confusion matrix: four groups of ${w.who}</h3>
    ${caption(`${TEST} · ${name}, threshold 0.50 · rows are what actually happened, columns are what the model said`)}
    ${matrix(c, w, { label: `${name}, test confusion matrix at threshold 0.50` })}

    <h3>All five models at 0.50</h3>
    ${caption(`${TEST} · every model, threshold 0.50 · the selected model is highlighted`)}
    ${table(rows, { highlight: keys.indexOf(model) })}
    <div class="minis">${minis}</div>
    ${caption("Undefined means 0 ÷ 0: for example, precision when a model flags no one.")}`;
}

// ---- 2. A Threshold for the Job ------------------------------------------------
function threshold(res, model, el) {
  const w = WORDS[state.key];
  const [p, y] = m11.preds(res, model);
  const name = m11.MODEL_LABEL[model];
  const auc = m11.auroc(p, y);
  const base = m11.confusion(p, y, 0.5);
  const baseM = m11.metrics(base);

  // Dot strips: one dot per test patient, at its probability. Positions never change; only the threshold line moves.
  const W = 900, L = 150, R = 24, H = 230, laneH = 70, top1 = 34, top2 = 34 + laneH + 30;
  const X = (v) => L + v * (W - L - R);
  const jitter = (i) => ((i * 0.6180339887) % 1); // fixed spread, so the picture is the same every time
  const dots = (cls) => p.map((v, i) => (y[i] === cls ? `<circle cx="${X(v).toFixed(1)}" cy="${((cls ? top1 : top2) + 6 + jitter(i) * (laneH - 12)).toFixed(1)}" r="2.4"/>` : "")).join("");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((v) => `<line class="grid" x1="${X(v)}" x2="${X(v)}" y1="${top1 - 6}" y2="${top2 + laneH + 4}"/><text x="${X(v)}" y="${H - 6}" text-anchor="middle">${v.toFixed(2)}</text>`).join("");
  const strips = `
    <svg id="strips" viewBox="0 0 ${W} ${H}" role="img" aria-label="Test ${w.who} as dots placed by the model's probability, with the threshold as a line">
      <defs><clipPath id="flag-zone"><rect id="flag-rect" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>
      ${ticks}
      <text x="8" y="${top1 + laneH / 2}" class="lane">${esc(w.posShort)}</text><text x="8" y="${top1 + laneH / 2 + 16}" class="lane-n">${int(baseM.positives)} ${w.who}</text>
      <text x="8" y="${top2 + laneH / 2}" class="lane">${esc(w.negShort)}</text><text x="8" y="${top2 + laneH / 2 + 16}" class="lane-n">${int(baseM.negatives)} ${w.who}</text>
      <g class="dots-off">${dots(1)}${dots(0)}</g>
      <g class="dots-on" clip-path="url(#flag-zone)"><g class="pos">${dots(1)}</g><g class="neg">${dots(0)}</g></g>
      <line id="t50" class="t50" x1="${X(0.5)}" x2="${X(0.5)}" y1="${top1 - 10}" y2="${top2 + laneH + 4}"/>
      <text x="${X(0.5)}" y="${top1 - 14}" text-anchor="middle" class="t50-label">0.50</text>
      <line id="t-line" class="rule" y1="${top1 - 10}" y2="${top2 + laneH + 4}"/>
      <text id="t-flag" class="zone" y="${top1 - 14}">flagged →</text>
      <text x="${(W - 4)}" y="${H - 22}" text-anchor="end" class="axis-title">model's probability →</text>
      <rect id="drag-area" x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent"/>
    </svg>`;

  const job = state.key === "diabetes"
    ? `<strong>The job:</strong> flag adults for follow-up testing. The screening team wants a sensitivity of at least 0.90.`
    : `<strong>The job:</strong> predict readmission within 30 days, at discharge. There is no fixed target: see what each threshold gains and gives up.`;

  el.innerHTML = `
    <div class="callout">${job}</div>
    <p>The threshold is a decision you make, separate from the model. Moving it changes <em>who is flagged</em>, not any ${w.one}'s probability and not the model's ranking:
       ${esc(name)}'s ${TEST} AUROC is ${m11.fmtNum(auc)} at every threshold.</p>
    <div class="slider">
      <label for="t">Threshold</label>
      <input id="t" type="range" min="0" max="1" step="0.01" value="${state.threshold}">
      <output id="t-out" for="t"></output>
      <span id="t-live" class="live" aria-live="polite"></span>
    </div>
    <div id="missed-t"></div>
    ${caption(`${TEST} · ${name} · each dot is one test ${w.one}, placed by the model's probability; coloured dots are flagged at the chosen threshold. Drag across the strips or use the slider.`)}
    ${strips}
    <div class="legend"><span><i class="sw-pos"></i>${esc(w.posShort)}, flagged</span><span><i class="sw-neg"></i>${esc(w.negShort)}, flagged (false alarm)</span><span><i class="sw-off"></i>not flagged</span><span><i class="sw-t50"></i>0.50 for comparison</span></div>
    <p id="trade" class="trade"></p>
    <div class="cols">
      <figure>${caption(`${TEST} · threshold 0.50`)}${matrix(base, w, { label: "Test confusion matrix at threshold 0.50" })}</figure>
      <figure>${caption(`${TEST} · chosen threshold`)}<div id="cm-t"></div></figure>
    </div>
    <h3>0.50 compared with your threshold</h3>
    <div id="cmp"></div>
    ${caption("A threshold picked while looking at these test patients will usually do slightly worse on new ones, so treat these test results as likely optimistic.")}`;

  const slider = el.querySelector("#t");
  const svg = el.querySelector("#strips");
  const update = (t) => {
    state.threshold = t;
    const c = m11.confusion(p, y, t);
    const m = m11.metrics(c);
    el.querySelector("#t-out").textContent = fmtT(t);
    slider.value = t;
    el.querySelector("#t-live").textContent = `Sensitivity ${m11.fmtPct(m.sensitivity)} · flagged per 100: ${m.flagged_per_100.toFixed(1)}`;
    el.querySelector("#missed-t").innerHTML = missedPanel(c, m, w, t,
      t === 0.5 ? "" : `At 0.50 the same model misses ${int(base.fn)}: ${base.fn >= c.fn ? `${int(base.fn - c.fn)} fewer missed` : `${int(c.fn - base.fn)} more missed`} at ${fmtT(t)}.`);
    const x = X(t);
    svg.querySelector("#flag-rect").setAttribute("x", x);
    const line = svg.querySelector("#t-line");
    line.setAttribute("x1", x); line.setAttribute("x2", x);
    const flagText = svg.querySelector("#t-flag");
    flagText.setAttribute("x", Math.min(x + 6, W - 70));
    el.querySelector("#cm-t").innerHTML = matrix(c, w, { label: `Test confusion matrix at threshold ${fmtT(t)}` });
    el.querySelector("#cm-t").previousElementSibling.textContent = `${TEST} · threshold ${fmtT(t)}`;

    const n = m.n;
    const dFlag = per100(m.flagged, n) - per100(baseM.flagged, n);
    const dTp = per100(c.tp, n) - per100(base.tp, n);
    const dFp = per100(c.fp, n) - per100(base.fp, n);
    const word = (v) => (v >= 0 ? "more" : "fewer");
    el.querySelector("#trade").innerHTML = t === 0.5 ? `At 0.50. Move the threshold to see what it gains and gives up.`
      : `Compared with 0.50, per 100 ${w.who}: <strong>${Math.abs(dFlag).toFixed(1)} ${word(dFlag)} flagged</strong>, `
        + `<strong>${Math.abs(dTp).toFixed(1)} ${word(dTp)} ${w.posFound}</strong> and <strong>${Math.abs(dFp).toFixed(1)} ${word(dFp)} false alarms</strong>.`;

    const row = (label, a, b, change) => ({ Measure: label, "At 0.50": a, [`At ${fmtT(t)}`]: b, Change: change });
    el.querySelector("#cmp").innerHTML = caption(`${TEST} · ${name}`) + table([
      row("Flagged per 100", baseM.flagged_per_100.toFixed(1), m.flagged_per_100.toFixed(1), fmtDelta(baseM.flagged_per_100, m.flagged_per_100, 1)),
      row(`Caught (of ${int(m.positives)} ${w.posShort.toLowerCase()})`, int(base.tp), int(c.tp), fmtDelta(base.tp, c.tp)),
      row("Missed", int(base.fn), int(c.fn), fmtDelta(base.fn, c.fn)),
      row(`False alarms (of ${int(m.negatives)} ${w.negShort.toLowerCase()})`, int(base.fp), int(c.fp), fmtDelta(base.fp, c.fp)),
      row("Sensitivity", m11.fmtPct(baseM.sensitivity), m11.fmtPct(m.sensitivity), fmtPts(baseM.sensitivity, m.sensitivity)),
      row("Specificity", m11.fmtPct(baseM.specificity), m11.fmtPct(m.specificity), fmtPts(baseM.specificity, m.specificity)),
      row("Precision", m11.fmtPct(baseM.precision), m11.fmtPct(m.precision), fmtPts(baseM.precision, m.precision)),
      row("Accuracy", m11.fmtPct(baseM.accuracy), m11.fmtPct(m.accuracy), fmtPts(baseM.accuracy, m.accuracy)),
      row(`${TEST} AUROC (ranking; never changes)`, m11.fmtNum(auc), m11.fmtNum(auc), "none"),
    ]);
  };
  slider.addEventListener("input", () => update(Number(slider.value)));
  // Drag on the strips: the pointer's position becomes the threshold, in steps of 0.01.
  const fromPointer = (e) => {
    const r = svg.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    update(Math.round(Math.min(1, Math.max(0, (vx - L) / (W - L - R))) * 100) / 100);
  };
  const area = svg.querySelector("#drag-area");
  area.addEventListener("pointerdown", (e) => { area.setPointerCapture(e.pointerId); fromPointer(e); });
  area.addEventListener("pointermove", (e) => { if (area.hasPointerCapture(e.pointerId)) fromPointer(e); });
  update(state.threshold);
}

// ---- 3. Training vs. Test ------------------------------------------------------
function trainVsTest(res, _model, el) {
  const w = WORDS[state.key];
  const s = m11.aurocSummary(res);
  const order = Object.keys(s).sort((a, b) => (s[b].test ?? -1) - (s[a].test ?? -1));
  const vals = order.flatMap((k) => [s[k].train, s[k].test]).filter((v) => v !== null);
  const lo = Math.min(0.5, Math.floor(Math.min(...vals) * 20) / 20);
  const W = 900, L = 190, R = 40, rowH = 40, top0 = 30, H = top0 + order.length * rowH + 30;
  const X = (v) => L + ((v - lo) / (1 - lo)) * (W - L - R);
  const ticks = [];
  for (let v = lo; v <= 1.0001; v += 0.1) ticks.push(Math.round(v * 100) / 100);
  const rows = order.map((k, i) => {
    const yy = top0 + i * rowH + rowH / 2;
    const { train, test } = s[k];
    const line = train !== null && test !== null ? `<line class="gapline" x1="${X(train)}" x2="${X(test)}" y1="${yy}" y2="${yy}"/>` : "";
    return `<text x="${L - 12}" y="${yy + 4}" text-anchor="end" class="lane">${esc(m11.MODEL_LABEL[k])}</text>${line}
      ${train !== null ? `<circle class="dot-train" cx="${X(train)}" cy="${yy}" r="7"><title>${TRAIN} AUROC ${m11.fmtNum(train)}</title></circle>` : ""}
      ${test !== null ? `<circle class="dot-test" cx="${X(test)}" cy="${yy}" r="7"><title>${TEST} AUROC ${m11.fmtNum(test)}</title></circle>` : ""}`;
  }).join("");
  const axis = ticks.map((v) => `<line class="grid" x1="${X(v)}" x2="${X(v)}" y1="${top0 - 6}" y2="${H - 26}"/><text x="${X(v)}" y="${H - 8}" text-anchor="middle">${v.toFixed(1)}</text>`).join("");

  const fitted = order.filter((k) => k !== "baseline" && s[k].gap !== null);
  const bestTrain = [...fitted].sort((a, b) => s[b].train - s[a].train)[0];
  const bestTest = [...fitted].sort((a, b) => s[b].test - s[a].test)[0];
  const widest = [...fitted].sort((a, b) => s[b].gap - s[a].gap)[0];
  const plain = fitted.length < 2 ? caption("Only the baseline has results so far: run python -m analysis, then commit and push results/.")
    : `<p class="trade">Best on its ${TRAIN.toLowerCase()} ${w.who}: <strong>${esc(m11.MODEL_LABEL[bestTrain])}</strong> (${m11.fmtNum(s[bestTrain].train)}).
       Best on the ${TEST.toLowerCase()} ${w.who}, whom no model saw: <strong>${esc(m11.MODEL_LABEL[bestTest])}</strong> (${m11.fmtNum(s[bestTest].test)}).
       ${esc(m11.MODEL_LABEL[widest])} has the widest gap (${m11.fmtNum(s[widest].gap)}): on ${w.who} it had already seen it ranks far better than on new ones, a sign it memorised its training ${w.who}.</p>`;

  el.innerHTML = `
    <div class="callout">A model is judged on ${w.who} it never saw, because new ${w.who} are what it will meet. <strong>AUROC measures ranking</strong>: how often ${w.aOne} who ${w.posVerb1} gets a higher probability than one who didn't. It is not accuracy, and it doesn't depend on a threshold. The prevalence baseline gives everyone the same probability, so it ranks no better than chance.</div>
    <p><strong>${TRAIN}:</strong> ${int(res.train.n)} ${w.who} (${int(res.train.n_pos)} ${w.posShort.toLowerCase()}), the rows every model learned from.
       <strong>${TEST}:</strong> ${int(res.test.n)} ${w.who} (${int(res.test.n_pos)} ${w.posShort.toLowerCase()}), never used for fitting.</p>
    ${caption(`${TRAIN} and ${TEST} AUROC for every model, sorted by ${TEST} AUROC, because the test ${w.who} stand in for new ones`)}
    <div class="legend"><span><i class="sw-train"></i>${TRAIN} AUROC (${w.who} it learned from)</span><span><i class="sw-test"></i>${TEST} AUROC (${w.who} it never saw)</span><span><i class="sw-gap"></i>the gap</span></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Training and test AUROC for every model; the table below has the same numbers">${axis}${rows}
      <text x="${W - R}" y="${top0 - 12}" text-anchor="end" class="axis-title">AUROC →</text></svg>
    ${plain}
    ${caption(`${TRAIN} and ${TEST} · sorted by ${TEST} AUROC · gap = ${TRAIN.toLowerCase()} − ${TEST.toLowerCase()}`)}
    ${table(order.map((k) => ({ Model: m11.MODEL_LABEL[k], [`${TRAIN} AUROC`]: m11.fmtNum(s[k].train), [`${TEST} AUROC`]: m11.fmtNum(s[k].test), "Gap (training − test)": m11.fmtNum(s[k].gap) })))}
    ${caption("A small gap in either direction is normal: with about a thousand test patients, a simple model's test AUROC can land a little above or below its training AUROC by chance.")}`;
}

const RENDER = Object.fromEntries(SECTIONS.map((s, i) => [s, [beyondAccuracy, threshold, trainVsTest][i]]));

// ---- page ----------------------------------------------------------------------
async function render() {
  const { section, key, model } = state;
  const res = await load(key);
  const sIndex = SECTIONS.indexOf(section);
  $("section-title").textContent = section;
  $("model-field").hidden = sIndex === 2;
  $("model-note").hidden = sIndex !== 2;
  [...document.querySelectorAll('#sections input')].forEach((r) => { r.checked = Number(r.value) === sIndex; });
  const content = $("content");
  if (!res) {
    $("context").textContent = "";
    content.innerHTML = `<p class="warn">No results for ${esc(m11.DATASET_LABEL[key])} yet: run <code>python -m analysis</code>, then commit and push <code>results/</code>.</p>`;
    return;
  }
  $("context").textContent = `${m11.DATASET_LABEL[key]}: ${int(res.train.n)} training rows (${int(res.train.n_pos)} positive), `
    + `${int(res.test.n)} test rows (${int(res.test.n_pos)} positive).`;
  [...$("model").options].forEach((o) => { o.text = m11.MODEL_LABEL[o.value] + (o.value in res.models ? "" : " (not trained yet)"); });
  if (sIndex !== 2 && !(model in res.models)) {
    content.innerHTML = `<p class="warn">${esc(m11.MODEL_LABEL[model])} has no results yet: run <code>python -m analysis</code>, then commit and push <code>results/</code>.</p>`;
    return;
  }
  RENDER[section](res, model, content);
}

// ---- stardate (decorative; not a result) ------------------------------------------
// TNG-style stardate: (year − 1946) × 1000 + day of the year + the fraction of today that has passed,
// in this computer's local time, cut to one decimal. 4 Nov 2026 at 15:42 → 80308.6.
function stardate(d = new Date()) {
  const y = d.getFullYear();
  const dayOfYear = Math.round((Date.UTC(y, d.getMonth(), d.getDate()) - Date.UTC(y, 0, 1)) / 864e5) + 1;
  const dayFraction = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
  return (Math.floor(((y - 1946) * 1000 + dayOfYear + dayFraction) * 10) / 10).toFixed(1);
}
function startStardate() {
  const el = $("stardate");
  const tick = () => { const d = new Date(); el.textContent = stardate(d); el.dateTime = d.toISOString(); };
  tick();
  setInterval(tick, 10000); // the decimal moves about every 2.4 minutes
}

// ---- bridge view ---------------------------------------------------------------
// The page starts in plain view and switches to the bridge only if three.js and WebGL start.
const VIEW_KEY = "jtm-view";
const ui = { bridge: null, audio: null, opener: null };
const readPref = () => { try { return localStorage.getItem(VIEW_KEY); } catch { return null; } };
const writePref = (v) => { try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable: the choice lasts this visit */ } };
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setMode(mode) {
  document.body.classList.toggle("mode-bridge", mode === "bridge");
  document.body.classList.toggle("mode-plain", mode !== "bridge");
  $("view-toggle").textContent = mode === "bridge" ? "Plain view" : "Bridge view";
  $("view-toggle").setAttribute("aria-pressed", String(mode !== "bridge"));
  if (mode !== "bridge") {
    document.body.classList.remove("panel-open");
    if (ui.audio?.isOn()) toggleSound(); // plain view is quiet
  }
  ui.bridge?.setPaused(mode !== "bridge");
}

function openSection(i, opener) {
  state.section = SECTIONS[i];
  ui.opener = opener || null;
  render();
  ui.audio?.chirp();
  if (!document.body.classList.contains("mode-bridge")) return;
  ui.bridge?.focusScreen(i, () => {
    document.body.classList.add("panel-open");
    ui.bridge?.setPaused(true);
    $("panel").scrollTop = 0;
    $("section-title").focus();
  });
}

function closePanel() {
  if (!document.body.classList.contains("panel-open")) return;
  document.body.classList.remove("panel-open");
  ui.bridge?.setPaused(false);
  ui.bridge?.home();
  ui.audio?.chirp(true);
  (ui.opener || document.querySelector(".screen-main"))?.focus();
}

async function startBridge() {
  try {
    const { initBridge } = await import("./bridge.js");
    ui.bridge = initBridge($("bridge-canvas"), { onSelect: (i) => openSection(i), reducedMotion });
  } catch (err) {
    console.warn("Bridge view unavailable; staying in plain view.", err);
    $("view-toggle").hidden = true;
    $("sound-toggle").hidden = true;
    return;
  }
  setMode(readPref() === "plain" ? "plain" : "bridge");
}

async function toggleSound() {
  const btn = $("sound-toggle");
  if (!ui.audio) {
    try { ui.audio = (await import("./audio.js")).createAudio(); } catch { btn.hidden = true; return; }
  }
  const on = ui.audio.toggle();
  btn.textContent = on ? "Sound on" : "Sound off";
  btn.setAttribute("aria-pressed", String(on));
}

function init() {
  $("sections").innerHTML = SECTIONS.map((s, i) => `<label class="radio"><input type="radio" name="section" value="${i}"
    ${s === state.section ? "checked" : ""}>${esc(s)}</label>`).join("");
  $("dataset").innerHTML = m11.DATASETS.map((k) => `<option value="${k}">${esc(m11.DATASET_LABEL[k])}</option>`).join("");
  $("model").innerHTML = m11.MODELS.map((m) => `<option value="${m}">${esc(m11.MODEL_LABEL[m])}</option>`).join("");
  $("dataset").value = state.key;
  $("model").value = state.model;
  $("sections").addEventListener("change", (e) => {
    const i = Number(e.target.value);
    state.section = SECTIONS[i];
    render();
    if (document.body.classList.contains("panel-open")) ui.bridge?.focusScreen(i, () => ui.bridge?.setPaused(true), true);
  });
  $("dataset").addEventListener("change", (e) => { state.key = e.target.value; render(); });
  $("model").addEventListener("change", (e) => { state.model = e.target.value; render(); });
  document.querySelectorAll(".screen-btn").forEach((b) => b.addEventListener("click", () => openSection(Number(b.dataset.section), b)));
  $("return-bridge").addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });
  $("view-toggle").addEventListener("click", () => {
    const next = document.body.classList.contains("mode-bridge") ? "plain" : "bridge";
    writePref(next);
    setMode(next);
  });
  $("sound-toggle").addEventListener("click", toggleSound);
  recommendations();
  render();
  startStardate();
  startBridge();
}

init();
