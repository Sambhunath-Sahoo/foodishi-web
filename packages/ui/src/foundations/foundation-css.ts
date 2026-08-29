/**
 * Stylesheet for the two Foundations stories. Like the pattern sheet it reads
 * tokens only — a palette page that hardcoded its own colours would be lying.
 */
export const FOUNDATION_CSS = `
.tp-fd{display:flex;flex-direction:column;gap:28px;max-width:1080px;}
.tp-fd__group{display:flex;flex-direction:column;gap:12px;}
.tp-fd__head{display:flex;align-items:baseline;gap:12px;
  border-bottom:1px solid var(--line);padding-bottom:8px;}
.tp-fd__head h2{font-size:13px;font-weight:700;letter-spacing:.06em;
  text-transform:uppercase;color:var(--ink);}
.tp-fd__head p{font-size:12px;color:var(--ink-3);}

/* ---- palette ----------------------------------------------------------- */
.tp-sw{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:10px;}
.tp-sw__card{display:flex;gap:12px;align-items:flex-start;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;}
.tp-sw__chip{width:46px;height:46px;flex:none;border-radius:var(--radius-sm);
  border:1px solid var(--line-2);}
.tp-sw__body{min-width:0;}
.tp-sw__name{font-family:var(--font-code);font-size:12px;font-weight:600;
  color:var(--ink);}
.tp-sw__hex{font-family:var(--font-code);font-size:11px;color:var(--ink-3);
  text-transform:uppercase;letter-spacing:.03em;}
.tp-sw__hex--raw{text-transform:none;overflow-wrap:anywhere;}
.tp-sw__means{font-size:12px;color:var(--ink-2);margin-top:3px;line-height:1.4;}
.tp-sw__pair{display:flex;align-items:center;gap:8px;margin-top:6px;}

/* ---- non-colour scale -------------------------------------------------- */
.tp-scale{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
  gap:10px;}
.tp-scale__card{background:var(--surface);border:1px solid var(--line);
  border-radius:var(--radius);padding:12px;display:flex;flex-direction:column;
  gap:8px;}
.tp-scale__demo{height:34px;background:var(--accent-soft);
  border:1px solid color-mix(in srgb, var(--accent) 30%, transparent);}

/* ---- typography -------------------------------------------------------- */
.tp-ty{display:flex;flex-direction:column;}
.tp-ty__row{display:grid;grid-template-columns:190px minmax(0,1fr);gap:20px;
  padding:16px 0;border-bottom:1px solid var(--line);align-items:baseline;}
.tp-ty__row:last-child{border-bottom:none;}
.tp-ty__meta{display:flex;flex-direction:column;gap:2px;}
.tp-ty__role{font-size:12px;font-weight:600;color:var(--ink);}
.tp-ty__spec{font-family:var(--font-code);font-size:11px;color:var(--ink-3);}
.tp-ty__sample{color:var(--ink);min-width:0;overflow-wrap:anywhere;}
.tp-ty__face{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;}
.tp-ty__face h3{font-size:13px;font-weight:700;letter-spacing:.06em;
  text-transform:uppercase;}
.tp-ty__alphabet{font-size:22px;color:var(--ink-2);line-height:1.4;
  overflow-wrap:anywhere;}
.tp-fig{width:100%;font-size:14px;}
.tp-fig th{text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;color:var(--ink-3);padding:6px 10px;
  border-bottom:1px solid var(--line);}
.tp-fig td{padding:6px 10px;border-bottom:1px solid var(--line);}
.tp-fig tr:last-child td{border-bottom:none;}
.tp-fig .tp-fig__on{font-variant-numeric:tabular-nums;text-align:right;
  font-family:var(--font-code);}
.tp-fig .tp-fig__off{font-variant-numeric:normal;text-align:right;
  font-family:var(--font-ui);}
`;
