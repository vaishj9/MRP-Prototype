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
  .kpiH{font-size:18px;margin:22px 0 8px}
  .rb{display:block;height:10px;background:#e6ecef;border-radius:6px;overflow:hidden;min-width:70px}
  .rb i{display:block;height:100%;background:${GREEN};border-radius:6px}
  .rb i.hot{background:#c8432b}
  .kpiT{width:100%;border-collapse:collapse;font-size:13.5px}
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
   ${locs.map(l => row(String(l.location_name).replace('Riverside Fitness - ',''), F.filter(f => f.location_id === l.location_id))).join('')}
   <p class="note"><b>Formula:</b> CSAT = ratings of 4 or 5 &divide; all ratings. In this data: ${A.good} &divide; ${A.n} = ${f1(A.pct)}%.<br>Members rate in the Member App, 1 to 5 stars, after a class and when they cancel a booking.${note ? '<br>' + note : ''}</p>`
   : `<div class="empty">No ratings yet. Members rate in the Member App (1 to 5 stars) after a class and when they cancel a booking. CSAT = ratings of 4 or 5 &divide; all ratings.</div>`}
  </div>`;
}
function salesTile(db, collected){
  const M = members(db).filter(m => !gone(m)), tot = M.reduce((a,m) => a + N(m.monthly_fee_usd), 0);
  return ['Sales (monthly)', '$' + Math.round(tot).toLocaleString('en-US'), `${M.length} active members x plan fees; $${N(collected).toFixed(2)} paid by new sign-ups`];
}
function kpiTiles(db){
  const A = cs(feedback(db)), R = reasonRows(db), top = R.rows[0];
  return [
    ['CSAT', A.n ? f1(A.pct) + '%' : '-', A.n ? `${A.n} ratings, average ${A.avg.toFixed(2)} / 5` : 'no ratings yet'],
    ['Top cancellation reason', top ? f1(100 * top[1] / R.total) + '%' : '-', top ? `${top[0]} (${top[1]} of ${R.total})` : 'no cancellations']
  ];
}

/* ---------- progress line graphs ---------- */
const mondayOf = d => { const x = new Date(String(d).slice(0,10) + 'T12:00:00'); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0,10); };
const dlab = s => { const d = new Date(s + 'T12:00:00'); return MON[d.getMonth()] + ' ' + d.getDate(); };
const mlab = s => MON[N(s.slice(5,7)) - 1] + ' ' + s.slice(2,4);
const addMonth = (m, k) => { const d = new Date(N(m.slice(0,4)), N(m.slice(5,7)) - 1 + k, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0'); };

function churnCats(db){
  const ms = members(db).filter(gone).map(m => String(m.cancellation_date).slice(0,7)).filter(x => /^\d{4}-\d{2}$/.test(x)).sort();
  if(!ms.length) return [];
  const end = ms[ms.length - 1], out = [];
  for(let k = -11; k <= 0; k++) out.push(addMonth(end, k));
  return out;
}
function churnVals(db, cats){
  const M = members(db);
  return cats.map(m => {
    const start = m + '-01';
    const act = M.filter(x => String(x.join_date).slice(0,10) < start && (!gone(x) || String(x.cancellation_date).slice(0,10) >= start)).length;
    const can = M.filter(x => gone(x) && String(x.cancellation_date).slice(0,7) === m).length;
    return act ? 100 * can / act : null;
  });
}
function salesVals(db, cats){
  const M = members(db);
  return cats.map(m => { const start = m + '-01'; return M.filter(x => String(x.join_date).slice(0,10) < start && (!gone(x) || String(x.cancellation_date).slice(0,10) >= start)).reduce((a,x) => a + N(x.monthly_fee_usd), 0); });
}
function fillCats(db){
  return [...new Set((db.CheckIns || []).filter(c => !scope() || c.location_id === scope()).map(c => mondayOf(c.checkin_date)))].sort();
}
function fillVals(db, cats){
  const caps = Object.fromEntries((db.Classes || []).map(c => [c.class_id, N(c.class_capacity)]));
  const C = (db.CheckIns || []).filter(c => !scope() || c.location_id === scope());
  return cats.map(w => {
    const rows = C.filter(c => mondayOf(c.checkin_date) === w), sess = {}; let att = 0;
    rows.forEach(c => { sess[c.class_id + '|' + String(c.checkin_date).slice(0,10)] = 1; if(c.attended === 'Yes') att++; });
    const cap = Object.keys(sess).reduce((a,k) => a + (caps[k.split('|')[0]] || 0), 0);
    return cap ? 100 * att / cap : null;
  });
}
function csatCats(db){ return [...new Set(feedback(db).map(f => mondayOf(f.created_at)))].sort(); }
function csatVals(db, cats){
  const F = feedback(db);
  return cats.map(w => { const s = cs(F.filter(f => mondayOf(f.created_at) === w)); return s.n ? s.pct : null; });
}
function payCats(db){ return [...new Set((db.Payroll || []).map(p => String(p.pay_period_month).slice(0,7)))].sort(); }
function payVals(db, cats){
  const sl = Object.fromEntries((db.Staff || []).map(s => [s.staff_id, s.location_id]));
  const P = (db.Payroll || []).filter(p => !scope() || sl[p.staff_id] === scope());
  return cats.map(m => { const r = P.filter(p => String(p.pay_period_month).slice(0,7) === m); return r.length ? 100 * r.filter(p => p.has_manual_entry_error === 'Yes').length / r.length : null; });
}

function lineChart(o){
  const W = 560, H = 220, L = 44, R = 70, T = 16, B = 36, n = o.cats.length;
  const all = o.series.flatMap(s => s.vals).filter(v => v !== null);
  if(!n || !all.length) return `<div class="card"><h3>${E(o.title)}</h3><div class="empty">${E(o.empty || 'No data yet.')}</div></div>`;
  const usd = o.unit === '$', top = Math.max(...all);
  const nice = t => { const raw = t / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
  const step = usd ? nice(top * 1.1) : (top <= 10 ? 2 : top <= 25 ? 5 : top <= 60 ? 10 : 20);
  const fv = v => usd ? '$' + Math.round(v).toLocaleString('en-US') : f1(v) + '%';
  const fa = v => usd ? (v >= 1000 ? '$' + (v / 1000) + 'k' : '$' + v) : v + '%';
  const max = Math.max(step * 2, Math.ceil(top * 1.1 / step) * step);
  const x = i => L + (n > 1 ? i * (W - L - R) / (n - 1) : (W - L - R) / 2);
  const y = v => T + (H - T - B) * (1 - v / max);
  let g = '';
  for(let v = 0; v <= max; v += step){ g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#d9e1e5" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11">${fa(v)}</text>`; }
  const skip = Math.ceil(n / 7);
  o.cats.forEach((c,i) => { if(i % skip === 0 || i === n - 1) g += `<text x="${x(i)}" y="${H - 12}" text-anchor="middle" font-size="11">${E(o.labels[i])}</text>`; });
  o.series.forEach(s => {
    const col = s.color || GREEN, dash = s.dash ? ' stroke-dasharray="6 5"' : '';
    let d = '', pen = false;
    s.vals.forEach((v,i) => { if(v === null){ pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' '; pen = true; });
    g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"${dash}/>`;
    s.vals.forEach((v,i) => { if(v !== null) g += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#fff" stroke="${col}" stroke-width="2"><title>${E(s.name)} - ${E(o.labels[i])}: ${fv(v)}</title></circle>`; });
    const li = s.vals.map((v,i) => v === null ? -1 : i).filter(i => i >= 0).pop();
    if(li !== undefined) g += `<text x="${x(li) + 9}" y="${y(s.vals[li]) + 4}" font-size="12" font-weight="700" style="fill:${col}">${fv(s.vals[li])}</text>`;
  });
  const lg = o.series.length > 1 ? `<div class="lgd">${o.series.map(s => `<span><b class="${s.dash ? 'd' : ''}" style="border-color:${s.color || GREEN}"></b>${E(s.name)}</span>`).join('')}</div>` : '';
  const tbl = `<details style="margin-top:6px"><summary class="note" style="cursor:pointer">Show the numbers</summary><div class="tw"><table class="kpiT"><thead><tr><th>${E(o.xName)}</th>${o.series.map(s => `<th class="r">${E(s.name)}</th>`).join('')}</tr></thead><tbody>${o.labels.map((l,i) => `<tr><td>${E(l)}</td>${o.series.map(s => `<td class="r">${s.vals[i] === null ? '-' : fv(s.vals[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  return `<div class="card"><h3>${E(o.title)}</h3><svg class="lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${E(o.title)}">${g}</svg>${lg}<p class="note" style="margin:6px 0 0">${o.note}</p>${tbl}</div>`;
}

function charts(db, base){
  const cc = churnCats(db), fc = fillCats(db), pc = payCats(db), sc = csatCats(db);
  const nm = base ? 'Dataset 2 (simulated)' : 'Current data', bn = 'Dataset 1 (baseline)';
  const two = (vals, bvals) => base ? [{name:nm, vals, color:GREEN}, {name:bn, vals:bvals, color:GREY, dash:true}] : [{name:nm, vals, color:GREEN}];
  return `<div class="grid two">
   ${lineChart({title:'Cancellation rate by month', xName:'Month', cats:cc, labels:cc.map(mlab), series:two(churnVals(db,cc), base ? churnVals(base,cc) : null), note:'Cancellations in the month &divide; members active at the start of the month. Lower is better.', empty:'No cancellations with a date yet.'})}
   ${lineChart({title:'Monthly sales by month', unit:'$', xName:'Month', cats:cc, labels:cc.map(mlab), series:two(salesVals(db,cc), base ? salesVals(base,cc) : null), note:'Sales = membership fees of all members active at the start of the month (plan price x members). Higher is better.', empty:'No data yet.'})}
   ${lineChart({title:'Class fill rate by week', xName:'Week starting', cats:fc, labels:fc.map(dlab), series:two(fillVals(db,fc), base ? fillVals(base,fc) : null), note:'Attended check-ins &divide; seats in the classes held that week. Higher is better.', empty:'No check-ins yet.'})}
   ${lineChart({title:'Customer satisfaction (CSAT) by week', xName:'Week starting', cats:sc, labels:sc.map(dlab), series:[{name:nm, vals:csatVals(db,sc), color:GREEN}], note:'Ratings of 4 or 5 &divide; all ratings that week. Higher is better.' + (base ? ' Dataset 1 has no ratings, because satisfaction was not measured before the solution.' : ''), empty:'No ratings yet. They appear as members rate in the Member App.'})}
   ${lineChart({title:'Payroll error rate by month', xName:'Pay month', cats:pc, labels:pc.map(mlab), series:two(payVals(db,pc), base ? payVals(base,pc) : null), note:'Payroll records with a manual entry error &divide; all payroll records that month. Lower is better.', empty:'No payroll records yet.'})}
  </div>`;
}
function sections(db, base){
  css();
  return `<h2 class="kpiH">KPI measurement</h2>
  <div class="grid two">${shareCard(db)}${csatCard(db, base ? 'Simulated ratings for Dataset 2, not real members.' : '')}</div>
  <h2 class="kpiH">Progress over time</h2>${charts(db, base)}`;
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

window.RFKPI = {sections, kpiTiles, salesTile, simFeedback, compareCard, decorateAccount, submitRating};
})();
