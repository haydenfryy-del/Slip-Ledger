"use strict";

const RECIPIENTS = {
  fidf: { name: "Friends of the IDF", slug: "fidf" },
  pp:   { name: "Planned Parenthood", slug: "plannedparenthood" }
};
const DEFAULT_SETTINGS = { amount: 100, recipients: ["fidf", "pp"], mode: "split" };
const LS_KEY = "slip-ledger-v2";

let settings = { ...DEFAULT_SETTINGS };
let slips = []; // { id, at, lines: [{ key, amount, paid }] }

const $ = id => document.getElementById(id);
const money = n => "$" + Math.round(n).toLocaleString("en-US");
const donateUrl = (slug, amt) => "https://www.every.org/" + slug + "?amount=" + amt + "&frequency=ONCE#donate";

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2400);
}

/* ---------- storage ---------- */
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ settings, slips })); }
  catch (e) { toast("Could not save on this device"); }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (d) { settings = { ...DEFAULT_SETTINGS, ...d.settings }; slips = Array.isArray(d.slips) ? d.slips : []; }
  } catch (e) { /* start fresh */ }
}

/* ---------- logic ---------- */
function splitFor(s) {
  const r = s.recipients.length ? s.recipients : ["fidf"];
  const per = (r.length > 1 && s.mode === "split") ? Math.round(s.amount / r.length) : s.amount;
  return r.map(key => ({ key, amount: Math.max(10, per), paid: false }));
}

function logSlip() {
  const now = Date.now();
  slips.push({ id: "slip-" + now, at: now, lines: splitFor(settings) });
  save();
  $("confirmBox").hidden = true;
  render();
  toast("Slip logged. Pay it below.");
  document.querySelector(".ledger").scrollIntoView({ behavior: "smooth", block: "start" });
}

function togglePaid(slipId, key) {
  const s = slips.find(x => x.id === slipId);
  const l = s && s.lines.find(x => x.key === key);
  if (!l) return;
  l.paid = !l.paid;
  save();
  render();
  if (l.paid) toast("Marked paid");
}

/* ---------- render ---------- */
function render() {
  const sorted = [...slips].sort((a, b) => b.at - a.at);
  let owed = 0, paid = 0;
  slips.forEach(s => s.lines.forEach(l => { if (l.paid) paid += l.amount; else owed += l.amount; }));

  $("statSlips").textContent = slips.length;
  $("statOwed").textContent = money(owed);
  $("statPaid").textContent = money(paid);

  const preview = splitFor(settings);
  const total = preview.reduce((a, l) => a + l.amount, 0);
  $("slipBtnSub").textContent = "Logs it and opens a " + money(total) + " donation";
  $("confirmAmt").textContent = money(total);
  $("confirmSplit").textContent = preview.map(l => money(l.amount) + " to " + RECIPIENTS[l.key].name).join(", ");

  const list = $("ledgerList");
  list.textContent = "";
  if (!sorted.length) {
    const e = document.createElement("div");
    e.className = "empty";
    e.textContent = "Nothing logged. After a slip, tap the red button and the donation shows up here to pay.";
    list.appendChild(e);
  }
  sorted.forEach(s => {
    const due = s.lines.some(l => !l.paid);
    const item = document.createElement("div");
    item.className = "item" + (due ? " due" : "");

    const top = document.createElement("div");
    top.className = "top";
    const when = document.createElement("span");
    when.textContent = new Date(s.at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const pill = document.createElement("span");
    pill.className = "pill " + (due ? "due" : "paid");
    pill.textContent = due ? "Owed" : "Paid";
    top.append(when, pill);

    const lines = document.createElement("div");
    lines.className = "lines";
    s.lines.forEach(l => {
      const r = RECIPIENTS[l.key];
      if (!r) return;
      const row = document.createElement("div");
      row.className = "line";
      const label = document.createElement("span");
      const amt = document.createElement("span");
      amt.className = "num";
      amt.textContent = money(l.amount);
      label.append(amt, " → " + r.name);
      const acts = document.createElement("div");
      acts.className = "row";
      if (!l.paid) {
        const a = document.createElement("a");
        a.className = "btn primary";
        a.href = donateUrl(r.slug, l.amount);
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "Donate";
        acts.appendChild(a);
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn" + (l.paid ? "" : " good");
      b.textContent = l.paid ? "Undo" : "I paid";
      b.addEventListener("click", () => togglePaid(s.id, l.key));
      acts.appendChild(b);
      row.append(label, acts);
      lines.appendChild(row);
    });
    item.append(top, lines);
    list.appendChild(item);
  });

  if (document.activeElement !== $("amtInput")) $("amtInput").value = settings.amount;
  $("rFidf").checked = settings.recipients.includes("fidf");
  $("rPp").checked = settings.recipients.includes("pp");
  $("modeSplit").checked = settings.mode === "split";
  $("modeEach").checked = settings.mode === "each";
}

/* ---------- wiring ---------- */
$("slipBtn").addEventListener("click", () => { $("confirmBox").hidden = false; $("confirmYes").focus(); });
$("confirmNo").addEventListener("click", () => { $("confirmBox").hidden = true; });
$("confirmYes").addEventListener("click", logSlip);

$("amtInput").addEventListener("change", e => {
  settings.amount = Math.max(10, Math.round(+e.target.value || DEFAULT_SETTINGS.amount));
  save(); render();
});
function setRecipients() {
  const r = [];
  if ($("rFidf").checked) r.push("fidf");
  if ($("rPp").checked) r.push("pp");
  if (!r.length) { toast("Pick at least one"); render(); return; }
  settings.recipients = r;
  save(); render();
}
$("rFidf").addEventListener("change", setRecipients);
$("rPp").addEventListener("change", setRecipients);
$("modeSplit").addEventListener("change", () => { settings.mode = "split"; save(); render(); });
$("modeEach").addEventListener("change", () => { settings.mode = "each"; save(); render(); });

/* backup: copy to clipboard, or paste text and restore */
$("exportBtn").addEventListener("click", async () => {
  const text = JSON.stringify({ settings, slips });
  const box = $("backupBox");
  try {
    await navigator.clipboard.writeText(text);
    toast("Backup copied");
  } catch (e) {
    box.hidden = false; box.value = text; box.select();
    toast("Select all and copy the text");
  }
});
$("importBtn").addEventListener("click", () => {
  const box = $("backupBox");
  if (box.hidden || !box.value.trim()) { box.hidden = false; box.value = ""; box.focus(); return; }
  try {
    const d = JSON.parse(box.value);
    if (!d || !Array.isArray(d.slips)) throw new Error("bad");
    settings = { ...DEFAULT_SETTINGS, ...d.settings };
    slips = d.slips;
    save(); render();
    box.value = ""; box.hidden = true;
    toast("Backup restored");
  } catch (e) { toast("That backup could not be read"); }
});

load();
render();

if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(() => {}); }
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}
