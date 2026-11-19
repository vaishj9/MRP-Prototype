/* Riverside Fitness KPI add-on (shared by member.html and staff.html)
   - Cancellation Reason Share (from the cancellation reasons in the data)
   - Customer Satisfaction Score (CSAT) from 1-5 ratings members give in the Member App
   - Progress line graphs: cancellation rate, class fill rate, CSAT, payroll error rate */
(function(){
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N = v => Number(v) || 0;
const FIX = ["Couldn't Book Classes Across Locations","Lost or Incorrect Manual Record","Scheduling/Booking Frustration"];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const GREEN = '#059f7e', GREY = '#8a96a0';
const scope = () => (typeof SCOPED !== 'undefined' && SCOPED) ? SCOPED : '';
const members = db => (db.Members || []).filter(m => !scope() || m.location_id === scope());
const feedback = db => (db.Feedback || []).filter(f => !scope() || f.location_id === scope());
const gone = m => m.is_active_member !== 'Yes';
const f1 = v => v.toFixed(1);

function css(){
  if(document.getElementById('kpiCss')) return;
  const s = document.createElement('style'); s.id = 'kpiCss';
  s.textContent = `
  .stars{display:inline-flex;gap:2px;vertical-align:middle}
  .stars button{background:none!important;border:0!important;box-shadow:none!important;color:#f59e0b!important;font-size:24px;line-height:1;padding:0 3px!important;margin:0!important;cursor:pointer}
  .stars button:hover{transform:scale(1.2)}
  .rv{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line,#dbe3e7);font-size:13.5px}
  .rv:last-child{border-bottom:0}
  .lc{width:100%;height:auto;display:block}
  .lc text{font-family:inherit;fill:var(--muted,#5d6f78)}
  .lgd{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12.5px;color:var(--muted,#5d6f78);margin-top:6px}
  .lgd b{display:inline-block;width:18px;height:0;border-top:3px solid;vertical-align:middle;margin-right:6px}
  .lgd b.d{border-top-style:dashed}
  .kpiH{font-size:24px;margin:26px 0 8px}
  .kpiSub{font-size:18px;margin:22px 0 8px}
  body{font-size:17px}
  body .kpi .v{font-size:36px}
  body .kpi .l{font-size:15px}
  body .card h3{font-size:16px}
  body h2{font-size:26px}
  body table,body .kpiT{font-size:15.5px}
  body .bar{font-size:15px}
  body .note,body .empty,body .feed{font-size:14.5px}
  body nav button{font-size:16px}
  body .tag{font-size:13px}
  body label{font-size:14.5px}
  body .btn.sm{font-size:14px}
  .lgd{font-size:14.5px}
  .rv{font-size:15.5px}
  .stars button{font-size:30px}
  .rb{display:block;height:10px;background:#e6ecef;border-radius:6px;overflow:hidden;min-width:70px}
  .rb i{display:block;height:100%;background:${GREEN};border-radius:6px}
  .rb i.hot{background:#c8432b}
  .kpiT{width:100%;border-collapse:collapse}
  .kpiT th,.kpiT td{padding:6px 8px;text-align:left;border-bottom:1px solid var(--line,#dbe3e7);vertical-align:middle}
  .kpiT td.r,.kpiT th.r{text-align:right;white-space:nowrap}`;
  document.head.appendChild(s);
}

/* ---------- Cancellation Reason Share ---------- */
function reasonRows(db){
  const g = members(db).filter(gone), c = {};
  g.forEach(m => { const r = m.cancellation_reason || 'Other'; c[r] = (c[r] || 0) + 1; });
  const rows = Object.entries(c).sort((a,b) => b[1] - a[1]);
  return {total:g.length, rows, fix: rows.filter(([r]) => FIX.includes(r)).reduce((a,[,n]) => a + n, 0)};
}
function shareCard(db){
  const R = reasonRows(db);
  const body = R.rows.map(([r,n]) => {
    const sh = 100 * n / R.total, isFix = FIX.includes(r);
    return `<tr><td>${E(r)}${isFix ? ' <span class="tag Low" title="A unified booking, record and scheduling system can fix this reason">fixable by system</span>' : ''}</td><td class="r">${n}</td><td class="r"><b>${f1(sh)}%</b></td><td><span class="rb"><i class="${/across/i.test(r)?'hot':''}" style="width:${sh}%"></i></span></td></tr>`;
  }).join('');
  return `<div class="card"><h3>Cancellation reason share</h3>
   ${R.total ? `<div class="tw"><table class="kpiT"><thead><tr><th>Reason</th><th class="r">Cancelled</th><th class="r">Share</th><th></th></tr></thead><tbody>${body}
   <tr><td><b>All cancellations</b></td><td class="r"><b>${R.total}</b></td><td class="r"><b>100.0%</b></td><td></td></tr></tbody></table></div>
   <p class="note"><b>Formula:</b> share = cancellations with that reason &divide; all cancellations (${R.total}).<br>Reasons a unified system can fix (cross-location booking, lost or incorrect records, booking frustration): <b>${R.fix} of ${R.total} = ${f1(100*R.fix/R.total)}%</b>.</p>` : '<div class="empty">No cancellations yet.</div>'}
  </div>`;
}

/* ---------- Customer Satisfaction Score ---------- */
function cs(list){
  const n = list.length, good = list.filter(f => N(f.rating) >= 4).length;
  return {n, good, avg: n ? list.reduce((a,f) => a + N(f.rating), 0) / n : 0, pct: n ? 100 * good / n : null};
}
function csatCard(db, note){
  const F = feedback(db), A = cs(F);
  const row = (label, list) => { const s = cs(list); return `<div class="bar"><span>${E(label)}</span><span class="t"><i style="width:${s.pct||0}%"></i></span><span class="n">${s.n ? f1(s.pct) + '%' : '-'} <small>(${s.n})</small></span></div>`; };
  const locs = (db.Locations || []).filter(l => !scope() || l.location_id === scope());
  return `<div class="card"><h3>Customer satisfaction score (CSAT)</h3>
   ${A.n ? `<div class="kpi" style="margin-bottom:8px"><div class="v">${f1(A.pct)}%</div><div class="l">satisfied (4 or 5 stars) &middot; average ${A.avg.toFixed(2)} / 5 &middot; ${A.n} ratings</div></div>
   ${row('After a class', F.filter(f => f.source === 'After class'))}
   ${row('At cancellation', F.filter(f => f.source === 'At cancellation'))}
   ${row('In the member portal', F.filter(f => f.source === 'Member portal'))}
   ${locs.map(l => row(String(l.location_name).replace('Riverside Fitness - ',''), F.filter(f => f.location_id === l.location_id))).join('')}
   <p class="note"><b>Formula:</b> CSAT = ratings of 4 or 5 &divide; all ratings. In this data: ${A.good} &divide; ${A.n} = ${f1(A.pct)}%.<br>Members rate in the Member App, 1 to 5 stars: any time in the member portal, after a class, and when they cancel a booking.${note ? '<br>' + note : ''}</p>`
   : `<div class="empty">No ratings yet. Members rate in the Member App (1 to 5 stars) after a class and when they cancel a booking. CSAT = ratings of 4 or 5 &divide; all ratings.</div>`}
  </div>`;
}
function salesTile(db, collected){
  const M = members(db).filter(m => !gone(m)), tot = M.reduce((a,m) => a + N(m.monthly_fee_usd), 0);
  return ['Sales ($ / month)', '$' + Math.round(tot).toLocaleString('en-US'), `${M.length} active members x plan fees; $${N(collected).toFixed(2)} paid by new sign-ups`];
}
function kpiTiles(db){
  const A = cs(feedback(db)), R = reasonRows(db), top = R.rows[0];
  return [
    ['CSAT (weekly and monthly)', A.n ? f1(A.pct) + '%' : '-', A.n ? `${A.n} ratings, average ${A.avg.toFixed(2)} / 5` : 'no ratings yet'],
    ['Top cancellation reason', top ? f1(100 * (R.fix >= top[1] ? R.fix : top[1]) / R.total) + '%' : '-', top ? (R.fix >= top[1] ? `system issues (${R.fix} of ${R.total})` : `${top[0]} (${top[1]} of ${R.total})`) : 'no cancellations']
  ];
}

/* ---------- progress line graphs ---------- */
const mondayOf = d => { const x = new Date(String(d).slice(0,10) + 'T12:00:00'); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0,10); };
const dlab = s => { const d = new Date(s + 'T12:00:00'); return MON[d.getMonth()] + ' ' + d.getDate(); };
const mlab = s => MON[N(s.slice(5,7)) - 1] + ' ' + s.slice(2,4);
const addMonth = (m, k) => { const d = new Date(N(m.slice(0,4)), N(m.slice(5,7)) - 1 + k, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0'); };

const qkey = s => String(s).slice(0,4) + ' Q' + Math.ceil(N(String(s).slice(5,7)) / 3);
const keyOf = (g, d) => g === 'week' ? mondayOf(d) : g === 'quarter' ? qkey(d) : String(d).slice(0,7);
const labOf = (g, k) => g === 'week' ? dlab(k) : g === 'quarter' ? k.slice(2,4) + ' ' + k.slice(5) : mlab(k);
const uniq = a => [...new Set(a)].sort();
const lastN = (a, k) => a.slice(Math.max(0, a.length - k));
function activeAt(db, start){
  return members(db).filter(x => String(x.join_date).slice(0,10) < start && (!gone(x) || String(x.cancellation_date).slice(0,10) >= start));
}
/* categories: weeks and months end at the last cancellation (weeks: last 12; months: last 12) */
function churnCats(db, g){
  const ds = members(db).filter(gone).map(m => String(m.cancellation_date).slice(0,10)).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
  if(!ds.length) return [];
  const last = ds[ds.length - 1], out = [];
  if(g === 'week'){ const d = new Date(mondayOf(last) + 'T12:00:00'); for(let k = 11; k >= 0; k--){ const x = new Date(d); x.setDate(x.getDate() - 7 * k); out.push(x.toISOString().slice(0,10)); } }
  else { const end = last.slice(0,7); for(let k = -11; k <= 0; k++) out.push(addMonth(end, k)); }
  return out;
}
const startOf = (g, c) => g === 'week' ? c : c + '-01';
function churnVals(db, cats, g){
  const M = members(db);
  return cats.map(c => {
    const act = activeAt(db, startOf(g, c)).length;
    const can = M.filter(x => gone(x) && keyOf(g, x.cancellation_date) === c).length;
    return act ? 100 * can / act : null;
  });
}
function salesVals(db, cats, g){ return cats.map(c => activeAt(db, startOf(g, c)).reduce((a,x) => a + N(x.monthly_fee_usd), 0)); }
const CI = db => (db.CheckIns || []).filter(c => !scope() || c.location_id === scope());
function fillCats(db, g){ return uniq(CI(db).map(c => keyOf(g, c.checkin_date))); }
function fillVals(db, cats, g){
  const caps = Object.fromEntries((db.Classes || []).map(c => [c.class_id, N(c.class_capacity)]));
  const C = CI(db);
  return cats.map(w => {
    const rows = C.filter(c => keyOf(g, c.checkin_date) === w), sess = {}; let att = 0;
    rows.forEach(c => { sess[c.class_id + '|' + String(c.checkin_date).slice(0,10)] = 1; if(c.attended === 'Yes') att++; });
    const cap = Object.keys(sess).reduce((a,k) => a + (caps[k.split('|')[0]] || 0), 0);
    return cap ? 100 * att / cap : null;
  });
}
function csatCats(db, g){ return uniq(feedback(db).map(f => keyOf(g, f.created_at))); }
function csatVals(db, cats, g){
  const F = feedback(db);
  return cats.map(w => { const s = cs(F.filter(f => keyOf(g, f.created_at) === w)); return s.n ? s.pct : null; });
}
function payCats(db, g){ return uniq((db.Payroll || []).map(p => keyOf(g, String(p.pay_period_month).slice(0,7) + '-01'))); }
function payVals(db, cats, g){
  const sl = Object.fromEntries((db.Staff || []).map(s => [s.staff_id, s.location_id]));
  const P = (db.Payroll || []).filter(p => !scope() || sl[p.staff_id] === scope());
  return cats.map(m => { const r = P.filter(p => keyOf(g, String(p.pay_period_month).slice(0,7) + '-01') === m); return r.length ? 100 * r.filter(p => p.has_manual_entry_error === 'Yes').length / r.length : null; });
}
const avgOf = a => { const v = a.filter(x => x !== null); return v.length ? v.reduce((s,x) => s + x, 0) / v.length : null; };
/* time-frame figures shown under the headline KPI tiles */
function periods(db){
  const cm = churnCats(db, 'month'), fw = fillCats(db, 'week'), pm = payCats(db, 'month');
  const ch = avgOf(churnVals(db, cm, 'month')), fl = lastN(fillVals(db, fw, 'week'), 1)[0], pe = avgOf(payVals(db, pm, 'month'));
  return {
    churn: ch === null ? '' : `avg ${f1(ch)}% / month`,
    fill: fl == null ? '' : `latest week ${f1(fl)}% / week`,
    pay: pe === null ? '' : `avg ${f1(pe)}% / month`
  };
}

function lineChart(o){
  const W = 560, H = 250, L = 54, R = 84, T = 18, B = 44, n = o.cats.length;
  const all = o.series.flatMap(s => s.vals).filter(v => v !== null);
  if(!n || !all.length) return `<div class="card"><h3>${E(o.title)}</h3><div class="empty">${E(o.empty || 'No data yet.')}</div></div>`;
  const usd = o.unit === '$', top = Math.max(...all);
  const nice = t => { const raw = t / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
  const step = usd ? nice(top * 1.1) : (top <= 2 ? .5 : top <= 5 ? 1 : top <= 10 ? 2 : top <= 25 ? 5 : top <= 60 ? 10 : 20);
  const fv = v => usd ? '$' + Math.round(v).toLocaleString('en-US') : f1(v) + '%';
  const fa = v => usd ? (v >= 1000 ? '$' + (v / 1000) + 'k' : '$' + v) : v + '%';
  const max = Math.max(step * 2, Math.ceil(top * 1.1 / step) * step);
  const x = i => L + (n > 1 ? i * (W - L - R) / (n - 1) : (W - L - R) / 2);
  const y = v => T + (H - T - B) * (1 - v / max);
  let g = '';
  for(let v = 0; v <= max + 1e-9; v += step){ g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#d9e1e5" stroke-width="1"/><text x="${L - 7}" y="${y(v) + 5}" text-anchor="end" font-size="14">${fa(Math.round(v * 100) / 100)}</text>`; }
  const skip = Math.ceil(n / 5);
  o.cats.forEach((c,i) => { if(i % skip === 0 || i === n - 1) g += `<text x="${x(i)}" y="${H - 14}" text-anchor="middle" font-size="14">${E(o.labels[i])}</text>`; });
  const used = [];
  o.series.forEach(s => {
    const col = s.color || GREEN, dash = s.dash ? ' stroke-dasharray="6 5"' : '';
    let d = '', pen = false;
    s.vals.forEach((v,i) => { if(v === null){ pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' '; pen = true; });
    g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"${dash}/>`;
    s.vals.forEach((v,i) => { if(v !== null) g += `<circle cx="${x(i)}" cy="${y(v)}" r="4.5" fill="#fff" stroke="${col}" stroke-width="2.2"><title>${E(s.name)} - ${E(o.labels[i])}: ${fv(v)}</title></circle>`; });
    const li = s.vals.map((v,i) => v === null ? -1 : i).filter(i => i >= 0).pop();
    if(li !== undefined){ let ly = y(s.vals[li]) + 5; while(used.some(u => Math.abs(u - ly) < 17)) ly += 17; used.push(ly); g += `<text x="${x(li) + 10}" y="${ly}" font-size="15" font-weight="700" style="fill:${col}">${fv(s.vals[li])}</text>`; }
  });
  const lg = o.series.length > 1 ? `<div class="lgd">${o.series.map(s => `<span><b class="${s.dash ? 'd' : ''}" style="border-color:${s.color || GREEN}"></b>${E(s.name)}</span>`).join('')}</div>` : '';
  const tbl = `<details style="margin-top:6px"><summary class="note" style="cursor:pointer">Show the numbers</summary><div class="tw"><table class="kpiT"><thead><tr><th>${E(o.xName)}</th>${o.series.map(s => `<th class="r">${E(s.name)}</th>`).join('')}</tr></thead><tbody>${o.labels.map((l,i) => `<tr><td>${E(l)}</td>${o.series.map(s => `<td class="r">${s.vals[i] === null ? '-' : fv(s.vals[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  return `<div class="card"><h3>${E(o.title)}</h3><svg class="lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${E(o.title)}">${g}</svg>${lg}<p class="note" style="margin:6px 0 0">${o.note}</p>${tbl}</div>`;
}

const GR = {week:['per week','Week starting','Weeks'], month:['per month','Month','Months'], quarter:['per quarter','Quarter','Quarters']};
function charts(db, base){
  const nm = base ? 'Dataset 2 (simulated)' : 'Current data', bn = 'Dataset 1 (baseline)';
  const row = (title, grains, o) => `<h3 class="kpiSub">${E(title)}</h3><div class="grid two">${grains.map(g => {
    const cats = o.cats(db, g);
    const mk = d => o.vals(d, cats, g);
    const series = o.noBase || !base ? [{name:nm, vals:mk(db), color:GREEN}] : [{name:nm, vals:mk(db), color:GREEN}, {name:bn, vals:mk(base), color:GREY, dash:true}];
    return lineChart({title:`${o.name} ${(o.unit === '$' ? '($ ' : '(% ') + GR[g][0].replace('per ', 'per ') + ')'}`, unit:o.unit, xName:GR[g][1], cats, labels:cats.map(c => labOf(g, c)), series, note:o.note + ' Shown ' + GR[g][0] + '.' + (o.extra && base ? ' ' + o.extra : ''), empty:o.empty});
  }).join('')}</div>`;
  return row('Cancellation rate: weekly and monthly', ['week','month'], {name:'Cancellation rate', cats:churnCats, vals:churnVals, note:'Cancellations in the period &divide; members active at the start of the period. Lower is better.', empty:'No cancellations with a date yet.'})
   + row('Sales: weekly and monthly view', ['week','month'], {name:'Sales', unit:'$', cats:churnCats, vals:salesVals, note:'Membership fees of all members active at the start of the period (plan price x members, a monthly amount). Higher is better.', empty:'No data yet.'})
   + row('Class fill rate: weekly and monthly', ['week','month'], {name:'Class fill rate', cats:fillCats, vals:fillVals, note:'Attended check-ins &divide; seats in the classes held in the period. Higher is better.', empty:'No check-ins yet.'})
   + row('Customer satisfaction (CSAT): weekly and monthly', ['week','month'], {name:'CSAT', noBase:true, cats:csatCats, vals:csatVals, note:'Ratings of 4 or 5 &divide; all ratings in the period. Higher is better.' + (base ? ' Dataset 1 has no ratings, because satisfaction was not measured before the solution.' : ''), empty:'No ratings yet. They appear as members rate in the Member App.'})
   + row('Payroll error rate: monthly and quarterly', ['month','quarter'], {name:'Payroll error rate', cats:payCats, vals:payVals, note:'Payroll records with a manual entry error &divide; all payroll records in the period. Payroll is run monthly, so weekly is not available. Lower is better.', empty:'No payroll records yet.'});
}
/* ---------- before / after launch timeline (Jan 2025 - Dec 2026) ---------- */
const TL_START = '2025-01', TL_LAUNCH = '2025-06', TL_MONTHS = 24;
function timelineChart(o){
  const W = 1000, H = 330, L = 66, R = 100, T = 34, B = 50, n = o.cats.length;
  const all = o.before.concat(o.after, o.compare || []).filter(v => v !== null);
  if(!all.length) return `<div class="card" style="margin-bottom:14px"><h3>${E(o.title)}</h3><div class="empty">${E(o.empty || 'No data yet.')}</div></div>`;
  const usd = o.unit === '$', top = Math.max(...all);
  const nice = t => { const raw = t / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
  const step = usd ? nice(top * 1.1) : (top <= 2 ? .5 : top <= 5 ? 1 : top <= 10 ? 2 : top <= 25 ? 5 : top <= 60 ? 10 : 20);
  const fv = v => usd ? '$' + Math.round(v).toLocaleString('en-US') : f1(v) + '%';
  const fa = v => usd ? (v >= 1000 ? '$' + (v / 1000) + 'k' : '$' + v) : v + '%';
  const max = Math.max(step * 2, Math.ceil(top * 1.1 / step) * step);
  const x = i => L + i * (W - L - R) / (n - 1), y = v => T + (H - T - B) * (1 - v / max);
  const hw = (x(1) - x(0)) / 2, li = o.cats.indexOf(TL_LAUNCH), lastI = o.lastIdx, xl = x(li) - hw, xe = x(lastI) + hw;
  let g = `<rect x="${L}" y="${T}" width="${xl - L}" height="${H - T - B}" fill="#8a96a0" fill-opacity=".12"/>`
        + `<rect x="${xl}" y="${T}" width="${xe - xl}" height="${H - T - B}" fill="#059f7e" fill-opacity=".08"/>`
        + `<rect x="${xe}" y="${T}" width="${W - R - xe}" height="${H - T - B}" fill="#8a96a0" fill-opacity=".05"/>`;
  for(let v = 0; v <= max + 1e-9; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#d9e1e5" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 5}" text-anchor="end" font-size="15">${fa(Math.round(v * 100) / 100)}</text>`;
  o.cats.forEach((c,i) => { if(i % 3 === 0 || i === n - 1) g += `<text x="${x(i)}" y="${H - 16}" text-anchor="middle" font-size="14">${E(mlab(c))}</text>`; });
  const beforeHas = o.before.some(v => v !== null);
  g += `<line x1="${xl}" x2="${xl}" y1="${T - 6}" y2="${H - B}" stroke="#2d3b45" stroke-width="2" stroke-dasharray="5 4"/>`
     + `<text x="${xl - 8}" y="${T - 12}" text-anchor="end" font-size="14" font-weight="700">Dataset 1 (real)</text>`
     + `<text x="${xl + 8}" y="${T - 12}" text-anchor="start" font-size="14" font-weight="700" style="fill:${GREEN}">Prototype launch, Jun 2025 &rarr; Dataset 2 (simulated)</text>`
     + `<text x="${(xe + W - R) / 2}" y="${T + 22}" text-anchor="middle" font-size="13">no data yet</text>`
     + (beforeHas ? '' : `<text x="${(L + xl) / 2}" y="${(T + H - B) / 2}" text-anchor="middle" font-size="13">no data in</text><text x="${(L + xl) / 2}" y="${(T + H - B) / 2 + 17}" text-anchor="middle" font-size="13">this period</text>`);
  const lastOf = (vals, from, to) => { let r; vals.forEach((v,i) => { if(v !== null && i >= from && i <= to) r = i; }); return r; };
  const used = [];
  const draw = (vals, col, name, from, to, dash) => {
    let d = '', pen = false;
    vals.forEach((v,i) => { if(v === null || i < from || i > to){ pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' '; pen = true; });
    if(d) g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"${dash ? ' stroke-dasharray="7 5"' : ''}/>`;
    vals.forEach((v,i) => { if(v !== null && i >= from && i <= to) g += `<circle cx="${x(i)}" cy="${y(v)}" r="4.8" fill="#fff" stroke="${col}" stroke-width="2.4"><title>${E(name)} - ${E(mlab(o.cats[i]))}: ${fv(v)}</title></circle>`; });
    const k = lastOf(vals, from, to);
    if(k !== undefined){ let ly = y(vals[k]) + 5; while(used.some(u => Math.abs(u - ly) < 17)) ly += 17; used.push(ly); g += `<text x="${x(k) + 10}" y="${ly}" font-size="15" font-weight="700" style="fill:${col}">${fv(vals[k])}</text>`; }
  };
  draw(o.before, GREY, 'Dataset 1', 0, li - 1, false);
  if(o.compare) draw(o.compare, GREY, 'Dataset 1 (same months)', li, lastI, true);
  draw(o.after, GREEN, 'Dataset 2', li, lastI, false);
  const avg = (a, f, t) => { const v = a.slice(f, t + 1).filter(z => z !== null); return v.length ? v.reduce((s,z) => s + z, 0) / v.length : null; };
  let sum = '';
  if(beforeHas){ const ab = avg(o.before, 0, li - 1), aa = avg(o.after, li, lastI); if(ab !== null && aa !== null) sum = `Average ${fv(ab)} before launch &rarr; ${fv(aa)} after launch. `; }
  else if(o.compare){ const idx = o.after.map((v,i) => v !== null && o.compare[i] !== null ? i : -1).filter(i => i >= 0); if(idx.length){ const a1 = idx.reduce((s,i) => s + o.compare[i], 0) / idx.length, a2 = idx.reduce((s,i) => s + o.after[i], 0) / idx.length; sum = `Same months (${E(mlab(o.cats[idx[0]]))} to ${E(mlab(o.cats[idx[idx.length - 1]]))}): Dataset 1 average ${fv(a1)} vs Dataset 2 average ${fv(a2)}. `; } }
  const lg = `<div class="lgd"><span><b style="border-color:${GREY}"></b>Dataset 1${o.compare ? ' (dashed = same months as Dataset 2)' : ''}</span><span><b style="border-color:${GREEN}"></b>Dataset 2 (simulated)</span></div>`;
  const rows = o.cats.map((c,i) => [c, o.before[i], o.compare ? o.compare[i] : null, o.after[i]]).filter(r => r[1] !== null || r[2] !== null || r[3] !== null);
  const tbl = `<details style="margin-top:6px"><summary class="note" style="cursor:pointer">Show the numbers</summary><div class="tw"><table class="kpiT"><thead><tr><th>Month</th><th class="r">Dataset 1</th><th class="r">Dataset 2</th></tr></thead><tbody>${rows.map(r => `<tr><td>${E(mlab(r[0]))}</td><td class="r">${r[1] !== null ? fv(r[1]) : r[2] !== null ? fv(r[2]) : '-'}</td><td class="r">${r[3] !== null ? fv(r[3]) : '-'}</td></tr>`).join('')}</tbody></table></div></details>`;
  return `<div class="card" style="margin-bottom:14px"><h3>${E(o.title)}</h3><svg class="lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${E(o.title)}">${g}</svg>${lg}
   <p class="note" style="margin:6px 0 0">${sum}${o.note}</p>${tbl}</div>`;
}
function timeline(){
  const D1 = window.SEED;
  if(!D1 || !window.SEED2) return '';
  const D2 = Object.assign({}, window.SEED2); D2.Feedback = simFeedback(D2);
  const cats = Array.from({length: TL_MONTHS}, (_, i) => addMonth(TL_START, i));
  const li = cats.indexOf(TL_LAUNCH);
  const lastM = members(D2).filter(gone).map(m => String(m.cancellation_date).slice(0,7)).sort().pop() || TL_LAUNCH;
  const lastIdx = Math.max(li, cats.indexOf(lastM) < 0 ? cats.length - 1 : cats.indexOf(lastM));
  const mk = (fn, o) => {
    const v1 = fn(D1, cats, 'month'), v2 = fn(D2, cats, 'month');
    const before = v1.map((v,i) => i < li ? v : null), after = v2.map((v,i) => i >= li && i <= lastIdx ? v : null);
    const compare = o.compare ? v1.map((v,i) => i >= li && i <= lastIdx ? v : null) : null;
    return timelineChart(Object.assign({}, o, {cats, before, after, compare, lastIdx}));
  };
  return mk(churnVals, {title:'Cancellation rate (% per month)', note:'Cancellations in the month &divide; members active at the start of the month. Lower is better.'})
       + mk(salesVals, {title:'Sales ($ per month)', unit:'$', note:'Membership fees of members active at the start of the month. Higher is better.'})
       + mk(fillVals, {title:'Class fill rate (% per month)', compare:true, note:'Attended check-ins &divide; seats in the classes held that month. Higher is better. Class check-ins in the data cover only Jun 15 to Jul 9 2026.', empty:'No check-ins yet.'})
       + mk(csatVals, {title:'Customer satisfaction, CSAT (% per month)', note:'Ratings of 4 or 5 &divide; all ratings that month. Higher is better. Dataset 1 has no ratings, because satisfaction was not measured before the solution; Dataset 2 ratings are simulated.', empty:'No ratings yet.'}, )
       + mk(payVals, {title:'Payroll error rate (% per month)', compare:true, note:'Payroll records with a manual entry error &divide; all payroll records that month. Lower is better. Payroll records in the data cover Mar to Aug 2026.', empty:'No payroll records yet.'});
}

/* ---------- Dataset 1 vs Dataset 2 bar comparison ---------- */
function overallFill(db){
  const caps = Object.fromEntries((db.Classes || []).map(c => [c.class_id, N(c.class_capacity)]));
  const sess = {}; let att = 0;
  CI(db).forEach(c => { sess[c.class_id + '|' + String(c.checkin_date).slice(0,10)] = 1; if(c.attended === 'Yes') att++; });
  const cap = Object.keys(sess).reduce((a,k) => a + (caps[k.split('|')[0]] || 0), 0);
  return cap ? 100 * att / cap : null;
}
const EXPERIENCE = FIX.concat(['Lack of Class Variety']);
function barStats(db){
  const M = members(db), g = M.filter(gone), t = g.length, cnt = {};
  g.forEach(m => { const r = m.cancellation_reason || 'Other'; cnt[r] = (cnt[r] || 0) + 1; });
  const sys = FIX.reduce((a,r) => a + (cnt[r] || 0), 0), exp = EXPERIENCE.reduce((a,r) => a + (cnt[r] || 0), 0);
  const single = Object.entries(cnt).sort((a,b) => b[1] - a[1])[0] || ['-', 0];
  const top = sys >= single[1] ? {n:sys, name:'system issues'} : {n:single[1], name:single[0].toLowerCase()};
  return {
    active: M.length ? 100 * M.filter(m => !gone(m)).length / M.length : null,
    cancel: M.length ? 100 * t / M.length : null,
    fill: overallFill(db),
    exp: t ? 100 * exp / t : null,
    top: t ? 100 * top.n / t : null, topName: top.name
  };
}
function barCompare(){
  const D1 = window.SEED, D2 = window.SEED2;
  if(!D1 || !D2) return '';
  const a = barStats(D1), b = barStats(D2);
  const items = [['Active membership','active'],['Cancellation rate','cancel'],['Capacity filling','fill'],['Experience-related cancellations','exp'],['Top cancellation reason share','top']];
  const W = 1000, H = 380, L = 62, R = 24, T = 50, B = 78, gw = (W - L - R) / items.length, bw = Math.min(70, gw * .3);
  const y = v => T + (H - T - B) * (1 - v / 100);
  let g = '';
  for(let v = 0; v <= 100; v += 20) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#d9e1e5" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 5}" text-anchor="end" font-size="15">${v}</text>`;
  g += `<text x="16" y="${(T + H - B) / 2}" font-size="15" text-anchor="middle" transform="rotate(-90 16 ${(T + H - B) / 2})">Percent</text>`;
  g += `<rect x="${W - 330}" y="10" width="16" height="16" rx="3" fill="${GREY}"/><text x="${W - 308}" y="23" font-size="15">Dataset 1</text><rect x="${W - 190}" y="10" width="16" height="16" rx="3" fill="${GREEN}"/><text x="${W - 168}" y="23" font-size="15">Dataset 2 (simulated)</text>`;
  items.forEach(([lab, k], i) => {
    const cx = L + gw * i + gw / 2;
    [[a[k], GREY, -bw - 2, 'Dataset 1'], [b[k], GREEN, 2, 'Dataset 2']].forEach(([v, col, dx, nm]) => {
      if(v === null) return;
      g += `<rect x="${cx + dx}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="4" fill="${col}"><title>${nm} - ${E(lab)}: ${f1(v)}%</title></rect><text x="${cx + dx + bw / 2}" y="${y(v) - 7}" text-anchor="middle" font-size="15" font-weight="700">${f1(v)}%</text>`;
    });
    const words = lab.split(' '), half = Math.ceil(words.length / 2), l1 = words.slice(0, half).join(' '), l2 = words.slice(half).join(' ');
    g += `<text x="${cx}" y="${H - B + 26}" text-anchor="middle" font-size="15">${E(l1)}</text><text x="${cx}" y="${H - B + 46}" text-anchor="middle" font-size="15">${E(l2)}</text>`;
  });
  g += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="#2d3b45" stroke-width="1.5"/>`;
  return `<div class="card" style="margin-bottom:14px"><h3>Before and after: changes in main KPIs</h3><svg class="lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Before and after changes in main KPIs, Dataset 1 vs Dataset 2">${g}</svg>
   <p class="note" style="margin:6px 0 0">Active membership = active &divide; all members. Cancellation rate = cancelled &divide; all members. Capacity filling = attended check-ins &divide; class seats. Experience-related cancellations = cancellations for cross-location booking, lost or incorrect records, booking frustration or lack of class variety &divide; all cancellations. Top cancellation reason share: Dataset 1 = ${a.topName} (${f1(a.top)}%), Dataset 2 = ${b.topName} (${f1(b.top)}%). Lower is better for the cancellation measures. Dataset 2 is simulated.</p></div>`;
}

function sections(db, base){
  css();
  return `<h2 class="kpiH">KPI measurement</h2>
  <div class="grid two">${shareCard(db)}${csatCard(db, base ? 'Simulated ratings for Dataset 2, not real members.' : '')}</div>
  <h2 class="kpiH">Progress over time: before and after the prototype (Jan 2025 to Dec 2026)</h2>${timeline()}`;
}

/* ---------- Dataset 2: simulated ratings ---------- */
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pick(r, w){ let x = r(), acc = 0; for(const k of [5,4,3,2,1]){ acc += w[k]; if(x < acc) return k; } return 1; }
function simFeedback(db){
  const r = rng(7), out = []; let i = 0;
  (db.CheckIns || []).forEach(c => {
    if(c.attended === 'Yes' && r() < 0.42){
      out.push({feedback_id:'FDB-' + String(++i).padStart(5,'0'), member_id:c.member_id, ref_id:c.checkin_id, location_id:c.location_id, source:'After class', rating:pick(r,{5:.46,4:.38,3:.11,2:.04,1:.01}), created_at:String(c.checkin_date).slice(0,10) + 'T18:00:00'});
    } else if(r() < 0.03){
      out.push({feedback_id:'FDB-' + String(++i).padStart(5,'0'), member_id:c.member_id, ref_id:c.checkin_id, location_id:c.location_id, source:'At cancellation', rating:pick(r,{5:.12,4:.26,3:.30,2:.20,1:.12}), created_at:String(c.checkin_date).slice(0,10) + 'T18:30:00'});
    }
  });
  const d0 = new Date('2026-06-15T12:00:00');
  (db.Members || []).forEach(m => {
    if(r() < 0.35){ const d = new Date(d0); d.setDate(d.getDate() + Math.floor(r() * 25)); out.push({feedback_id:'FDB-' + String(++i).padStart(5,'0'), member_id:m.member_id, ref_id:m.member_id, location_id:m.location_id, source:'Member portal', rating:pick(r,{5:.40,4:.40,3:.14,2:.05,1:.01}), created_at:d.toISOString().slice(0,10) + 'T12:00:00'}); }
  });
  return out;
}

/* ---------- Dashboard 1 vs 2 compare tab ---------- */
function compareCard(a, b){
  const sv = db => { const R = reasonRows(db), x = R.rows.find(([r]) => /across/i.test(r)); return {R, across: x ? x[1] : 0}; };
  const A = sv(a), B = sv(b), fa = cs(feedback(a)), fb = cs(feedback(b));
  const sh = (n, t) => t ? `${n} of ${t} = <b>${f1(100 * n / t)}%</b>` : '-';
  return `<div class="card" style="margin-bottom:14px"><h3>Cancellation reason share and CSAT: Dashboard 1 vs Dashboard 2</h3>
   <div class="tw"><table class="kpiT"><thead><tr><th>Measure</th><th>Dashboard 1<br><small>Dataset 1: real baseline</small></th><th>Dashboard 2<br><small>Dataset 2: simulated after launch</small></th></tr></thead><tbody>
   <tr><td>Cancelled members</td><td>${A.R.total}</td><td><b>${B.R.total}</b></td></tr>
   <tr><td>Share: couldn't book classes across locations</td><td>${sh(A.across, A.R.total)}</td><td>${sh(B.across, B.R.total)}</td></tr>
   <tr><td>Share of cancellations fixable by the system</td><td>${sh(A.R.fix, A.R.total)}</td><td>${sh(B.R.fix, B.R.total)}</td></tr>
   <tr><td>CSAT (ratings of 4 or 5 &divide; all ratings)</td><td>${fa.n ? f1(fa.pct) + '%' : 'not measured yet'}</td><td><b>${fb.n ? f1(fb.pct) + '%' : '-'}</b></td></tr>
   <tr><td>Average rating (1 to 5)</td><td>${fa.n ? fa.avg.toFixed(2) : 'not measured yet'}</td><td><b>${fb.n ? fb.avg.toFixed(2) : '-'}</b></td></tr>
   </tbody></table></div>
   <p class="note">Dataset 1 has no satisfaction ratings: CSAT is a new measure that the solution adds. Dataset 2 ratings are simulated.</p></div>`;
}

/* ---------- Member App: star ratings ---------- */
function stars(a){
  return `<span class="stars" role="group" aria-label="Rate from 1 to 5 stars">${[1,2,3,4,5].map(n => `<button type="button" data-rate="${n}" data-src="${E(a.src)}" data-ref="${E(a.ref)}" data-loc="${E(a.loc)}" title="${n} star${n > 1 ? 's' : ''}" aria-label="${n} star${n > 1 ? 's' : ''}">&#9734;</button>`).join('')}</span>`;
}
function decorateAccount(){
  if(typeof ACCT === 'undefined' || !ACCT) return;
  css();
  const view = document.getElementById('view');
  const mine = (ACCT.feedback || []).filter(f => f.source === 'Member portal').sort((a,b) => String(a.created_at).localeCompare(String(b.created_at))).pop();
  const pc = document.createElement('div'); pc.className = 'card'; pc.style.marginBottom = '14px';
  pc.innerHTML = `<h3>Rate your experience</h3><p class="note" style="margin-top:0">How satisfied are you with Riverside Fitness overall? Choose 1 star (very unhappy) to 5 stars (very happy). You can rate any time.</p>${stars({src:'Member portal', ref:ACCT.m.member_id, loc:ACCT.m.location_id})}${mine ? `<p class="note">Your latest rating: <b>${'&#9733;'.repeat(N(mine.rating))}${'&#9734;'.repeat(5 - N(mine.rating))}</b> (${E(String(mine.created_at).slice(0,10))}). Thank you!</p>` : ''}`;
  view.insertBefore(pc, view.firstChild);
  if(window.__rate){
    const d = document.createElement('div'); d.className = 'card'; d.style.marginBottom = '14px';
    d.innerHTML = `<h3>How was your booking experience?</h3><p class="note">You just cancelled a booking. How satisfied are you with Riverside Fitness, from 1 star (very unhappy) to 5 stars (very happy)?</p>${stars({src:'At cancellation', ref:window.__rate.ref, loc:window.__rate.loc})}`;
    view.insertBefore(d, view.firstChild);
  }
  const h = [...view.querySelectorAll('h3')].find(x => x.textContent.trim() === 'Recent visits');
  if(h){
    const fb = ACCT.feedback || [];
    const rows = (ACCT.checkins || []).slice().reverse().filter(c => c.attended !== 'No').map(c => {
      const k = (PUB.Classes || []).find(x => x.class_id === c.class_id) || {};
      const done = fb.find(f => f.ref_id === c.checkin_id && f.source === 'After class');
      return `<div class="rv"><span>${E(String(c.checkin_date).slice(0,10))} - ${E(k.class_name || c.class_id)} - ${E(locName(c.location_id))}</span>${done ? `<span title="Your rating">${'&#9733;'.repeat(N(done.rating))}${'&#9734;'.repeat(5 - N(done.rating))}</span>` : `<span><small>Rate this class</small> ${stars({src:'After class', ref:c.checkin_id, loc:c.location_id})}</span>`}</div>`;
    });
    h.parentElement.innerHTML = '<h3>Recent visits</h3>' + (rows.join('') || '<div class="empty">No visits yet.</div>');
  }
}
async function submitRating(b){
  const rating = N(b.dataset.rate), src = b.dataset.src;
  await append('Feedback', {feedback_id:'', member_id:me, ref_id:b.dataset.ref, location_id:b.dataset.loc, source:src, rating, created_at:new Date().toISOString().slice(0,19)});
  if(src === 'At cancellation') window.__rate = null;
  await load(); toast('Thank you for your feedback'); render();
}

window.RFKPI = {periods, barCompare, sections, kpiTiles, salesTile, simFeedback, compareCard, decorateAccount, submitRating};
})();
