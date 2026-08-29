/**
 * Stylesheet for the composed pattern stories.
 *
 * Every declaration reads a token from styles/tokens.css — there is not one
 * literal colour below (DESIGN.md non-negotiable #1), which is what lets the
 * same markup answer the light/dark toolbar toggle without a second ruleset.
 *
 * It ships as a string rather than a .css file because the Storybook canvas in
 * this package has no Tailwind pipeline, and a pattern story must not depend on
 * one. `<PatternCanvas>` injects it.
 */
import type { Tone } from "../status/tone";

const TONES: readonly Tone[] = ["accent", "ok", "warn", "crit", "cool", "mute"];

/** One block per tone: chip fill, dot, text colour, card stripe, row stripe. */
const toneRules = TONES.map(
  (tone) => `
.tp-chip[data-tone="${tone}"]{background:var(--${tone}-soft);color:var(--${tone});
  border-color:color-mix(in srgb, var(--${tone}) 32%, transparent);}
.tp-chip[data-tone="${tone}"] .tp-chip__dot{background:var(--${tone});}
.tp-tone-${tone}{color:var(--${tone});}
.tp-panel[data-stripe="${tone}"]::before{background:var(--${tone});}
.tp-row[data-stripe="${tone}"]>td:first-child::before{background:var(--${tone});}
.tp-row[data-stripe="${tone}"]>td{background:color-mix(in srgb, var(--${tone}-soft) 45%, var(--surface));}
`,
).join("");

export const PATTERN_CSS = `
/* ---- base -------------------------------------------------------------- */
.tp,.tp *,.tp *::before,.tp *::after{box-sizing:border-box;}
.tp{font-family:var(--font-ui);color:var(--ink);line-height:1.45;
  -webkit-font-smoothing:antialiased;}
.tp h1,.tp h2,.tp h3,.tp h4,.tp p,.tp ul,.tp ol,.tp figure,.tp dl{margin:0;}
.tp ul,.tp ol{padding:0;list-style:none;}
.tp table{border-collapse:collapse;}
.tp-stack{display:flex;flex-direction:column;gap:16px;}
.tp-stack-sm{display:flex;flex-direction:column;gap:8px;}
.tp-row-flex{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.tp-spread{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.tp-grow{flex:1;}

/* ---- device frame: the width the pattern is actually read at ----------- */
.tp-device{display:flex;flex-direction:column;gap:12px;width:100%;}
.tp-device__caption{display:flex;align-items:center;gap:10px;font-size:10px;
  font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-4);}
.tp-device__rule{flex:1;height:1px;background:var(--line);}
.tp-device__px{font-family:var(--font-code);letter-spacing:0;text-transform:none;}
.tp-device__body{width:100%;}

/* ---- type -------------------------------------------------------------- */
.tp-title{font-family:var(--font-display);font-weight:400;font-size:30px;
  line-height:1.12;letter-spacing:.005em;color:var(--ink);}
.tp-sub{font-size:13px;color:var(--ink-3);}
.tp-label{font-size:10px;font-weight:700;letter-spacing:.09em;
  text-transform:uppercase;color:var(--ink-3);}
.tp-mono{font-family:var(--font-code);font-variant-numeric:tabular-nums;}
.tp-num{font-variant-numeric:tabular-nums;text-align:right;}
.tp-muted{color:var(--ink-3);}
.tp-faint{color:var(--ink-4);}

/* ---- chip: colour never travels alone, the dot carries it -------------- */
.tp-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid;
  border-radius:var(--radius-pill);padding:2px 8px;font-size:12px;font-weight:500;
  white-space:nowrap;line-height:1.5;}
.tp-chip__dot{width:6px;height:6px;border-radius:var(--radius-pill);flex:none;}
.tp-chip--lg{font-size:13px;padding:4px 11px;}
.tp-chip--lg .tp-chip__dot{width:7px;height:7px;}

/* ---- button: destructive is outlined, never filled (#5) ---------------- */
.tp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
  font-family:var(--font-ui);font-weight:600;border:1px solid transparent;
  border-radius:var(--radius);cursor:pointer;white-space:nowrap;
  transition:background-color .15s ease,border-color .15s ease,color .15s ease;}
.tp-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}
.tp-btn[data-size="sm"]{height:28px;padding:0 10px;font-size:12px;
  border-radius:var(--radius-sm);}
.tp-btn[data-size="md"]{height:38px;padding:0 14px;font-size:13px;}
.tp-btn[data-size="lg"]{height:56px;padding:0 20px;font-size:17px;}
.tp-btn--primary{background:var(--accent);color:var(--on-accent);
  border-color:var(--accent);}
.tp-btn--primary:hover{background:var(--accent-hover);border-color:var(--accent-hover);}
.tp-btn--outline{background:var(--surface);color:var(--ink);border-color:var(--line-2);}
.tp-btn--outline:hover{background:var(--surface-2);}
.tp-btn--ghost{background:transparent;color:var(--accent);}
.tp-btn--ghost:hover{background:var(--accent-soft);}
.tp-btn--danger{background:transparent;color:var(--crit);border-color:var(--crit);}
.tp-btn--danger:hover{background:var(--crit-soft);}
.tp-btn--block{width:100%;}

/* ---- panel ------------------------------------------------------------- */
.tp-panel{position:relative;overflow:hidden;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);}
.tp-panel[data-stripe]::before{content:"";position:absolute;inset-block:0;left:0;
  width:3px;}
.tp-panel__head{display:flex;align-items:flex-start;justify-content:space-between;
  gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);}
.tp-panel__body{padding:16px;}
.tp-panel__foot{padding:12px 16px;border-top:1px solid var(--line);
  display:flex;flex-direction:column;gap:10px;}

/* ---- operator: dense board -------------------------------------------- */
.tp-scroll{width:100%;max-width:100%;overflow-x:auto;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--radius);}
.tp-table{width:100%;font-size:13px;text-align:left;color:var(--ink);}
.tp-table thead th{position:sticky;top:0;background:var(--surface-2);
  color:var(--ink-3);font-size:10px;font-weight:700;letter-spacing:.07em;
  text-transform:uppercase;padding:8px 10px;white-space:nowrap;
  border-bottom:1px solid var(--line);}
.tp-table tbody td{padding:7px 10px;vertical-align:middle;white-space:nowrap;
  border-bottom:1px solid var(--line);}
.tp-table tbody tr:last-child td{border-bottom:none;}
.tp-table th.tp-num,.tp-table td.tp-num{text-align:right;}
.tp-row>td:first-child{position:relative;padding-left:13px;}
.tp-row[data-stripe]>td:first-child::before{content:"";position:absolute;
  inset-block:0;left:0;width:3px;}
.tp-table tbody tr:hover>td{background:var(--surface-2);}
.tp-strong{font-weight:600;}
.tp-legend{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:11px;
  color:var(--ink-3);}
.tp-legend__key{display:inline-flex;align-items:center;gap:6px;}
.tp-legend__stripe{width:3px;height:13px;border-radius:2px;background:var(--crit);}

/* ---- segmented filter -------------------------------------------------- */
.tp-seg{display:inline-flex;background:var(--surface-2);border:1px solid var(--line);
  border-radius:var(--radius);padding:2px;}
.tp-seg__item{border:none;background:transparent;font:inherit;font-size:12px;
  font-weight:600;color:var(--ink-3);padding:5px 11px;border-radius:var(--radius-sm);
  cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
.tp-seg__item[aria-selected="true"]{background:var(--surface);color:var(--ink);
  box-shadow:var(--shadow);}
.tp-seg__count{font-variant-numeric:tabular-nums;color:var(--ink-4);}

/* ---- operator: KPI tiles ---------------------------------------------- */
.tp-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
.tp-tile__value{font-size:34px;font-weight:600;line-height:1.02;
  letter-spacing:-.015em;font-variant-numeric:tabular-nums;color:var(--ink);}
.tp-tile__unit{font-size:15px;font-weight:600;color:var(--ink-3);margin-left:3px;}
.tp-tile__mid{display:flex;align-items:flex-end;justify-content:space-between;
  gap:12px;margin-top:10px;}
.tp-tile__foot{margin-top:12px;padding-top:10px;border-top:1px solid var(--line);
  font-size:11px;color:var(--ink-3);display:flex;justify-content:space-between;gap:8px;}

/* ---- partner: one decision per card, hands busy ------------------------ */
.tp-items{display:flex;flex-direction:column;gap:12px;}
.tp-item{display:flex;gap:14px;align-items:flex-start;}
.tp-item__qty{font-family:var(--font-code);font-variant-numeric:tabular-nums;
  font-weight:600;font-size:16px;color:var(--ink-2);min-width:30px;}
.tp-item__name{display:block;font-size:17px;font-weight:500;line-height:1.3;}
.tp-item__opt{display:block;font-size:14px;color:var(--ink-3);margin-top:2px;}
.tp-item__amt{font-size:16px;font-variant-numeric:tabular-nums;color:var(--ink-2);
  margin-left:auto;padding-left:12px;}
.tp-callout{display:flex;gap:10px;align-items:flex-start;border:1px solid;
  border-radius:var(--radius-sm);padding:10px 12px;font-size:14px;}
.tp-callout[data-tone="warn"]{background:var(--warn-soft);color:var(--warn);
  border-color:color-mix(in srgb, var(--warn) 32%, transparent);}
.tp-callout__dot{width:7px;height:7px;border-radius:var(--radius-pill);flex:none;
  margin-top:6px;background:currentColor;}
.tp-hr{height:1px;background:var(--line);border:0;margin:0;}

/* ---- customer: the bill at 390px -------------------------------------- */
.tp-bill{display:flex;flex-direction:column;}
.tp-bill__row{display:flex;align-items:baseline;justify-content:space-between;
  gap:14px;padding:7px 0;font-size:14px;}
.tp-bill__label{color:var(--ink-2);}
.tp-bill__note{display:block;font-size:11px;color:var(--ink-4);margin-top:1px;}
.tp-bill__amt{font-variant-numeric:tabular-nums;text-align:right;min-width:92px;
  color:var(--ink);flex:none;}
.tp-bill__total{margin-top:8px;padding-top:12px;border-top:1px solid var(--line-2);
  font-size:18px;font-weight:700;}
.tp-bill__total .tp-bill__label{color:var(--ink);}

/* ---- the note a reviewer reads next to the pattern --------------------- */
.tp-note{border-left:3px solid var(--accent);background:var(--accent-soft);
  border-radius:0 var(--radius-sm) var(--radius-sm) 0;padding:11px 14px;
  font-size:12px;line-height:1.55;color:var(--ink-2);}
.tp-note b{color:var(--ink);font-weight:600;}
.tp-note code{font-family:var(--font-code);font-size:11px;color:var(--ink);}
${toneRules}
`;
