/**
 * Riverside Fitness prototype - Google Apps Script backend (free).
 * Paste into Extensions > Apps Script of the Google Sheet that holds the Riverside_Database tabs.
 * Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
 */
const ID_RULES = {
  Members:  { col: 'member_id',  prefix: 'MEM-', pad: 4 },
  Bookings: { col: 'booking_id', prefix: 'BKG-', pad: 5 },
  CheckIns: { col: 'checkin_id', prefix: 'CHK-', pad: 6 },
  Payroll:  { col: 'payroll_id', prefix: 'PAY-', pad: 5 }
};
// Change this passcode! Staff pages must send it to read all data or change records.
const STAFF_KEY = 'riverside2026';
const TABS = ['Members', 'Locations', 'Staff', 'Classes', 'Bookings', 'CheckIns', 'Payroll'];

function tz_() { return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(); }

function cell_(v, header) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, tz_(), /month/.test(header) ? 'yyyy-MM' : (/created/.test(header) ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd'));
  }
  return v;
}

function readTab_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  const head = v.shift();
  return v.filter(r => r.join('') !== '').map(r => {
    const o = {};
    head.forEach((h, i) => { o[h] = cell_(r[i], h); });
    return o;
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Read. Staff (with passcode) get everything. Customers get only classes, locations,
// seat counts, and - when they give their own Member ID - their own records.
function doGet(e) {
  const p = (e && e.parameter) || {};
  const out = {};
  if (p.key === STAFF_KEY) {
    TABS.forEach(t => { out[t] = readTab_(t); });
    return json_(out);
  }
  out.Locations = readTab_('Locations');
  out.Classes = readTab_('Classes');
  const counts = {};
  const bookings = readTab_('Bookings');
  bookings.forEach(b => {
    if (b.status === 'Booked' || b.status === 'Checked-in') {
      const k = b.class_id + '|' + b.class_date;
      counts[k] = (counts[k] || 0) + 1;
    }
  });
  out.Counts = counts;
  if (p.member) {
    const id = String(p.member).trim().toUpperCase();
    const mem = readTab_('Members').filter(m => String(m.member_id).toUpperCase() === id);
    out.Members = mem.map(m => ({ member_id: m.member_id, full_name: m.full_name, location_id: m.location_id,
      membership_type: m.membership_type, monthly_fee_usd: m.monthly_fee_usd, join_date: m.join_date,
      is_active_member: m.is_active_member, monthly_checkins: m.monthly_checkins }));
    out.Bookings = bookings.filter(b => String(b.member_id).toUpperCase() === id);
    out.CheckIns = readTab_('CheckIns').filter(c => String(c.member_id).toUpperCase() === id).slice(-10);
  }
  return json_(out);
}

// Write: append a row, update a row, or add to a number
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const req = JSON.parse(e.postData.contents);
    const staff = req.key === STAFF_KEY;
    // Customers may only: join (Members), book (Bookings), and cancel their own booking.
    if (!staff) {
      const okJoin = req.action === 'append' && (req.tab === 'Members' || req.tab === 'Bookings');
      const okCancel = req.action === 'update' && req.tab === 'Bookings' && req.changes && req.changes.status === 'Cancelled';
      if (!okJoin && !okCancel) return json_({ ok: false, error: 'Staff passcode required' });
      if (okCancel) {
        const row = readTab_('Bookings').filter(b => String(b.booking_id) === String(req.value))[0];
        if (!row || String(row.member_id).toUpperCase() !== String(req.member || '').toUpperCase()) {
          return json_({ ok: false, error: 'Not your booking' });
        }
      }
    }
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(req.tab);
    if (!sh) return json_({ ok: false, error: 'Unknown tab ' + req.tab });
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

    if (req.action === 'append') {
      const row = req.row;
      const rule = ID_RULES[req.tab];
      if (rule) {
        const ids = readTab_(req.tab).map(r => Number(String(r[rule.col]).replace(/\D/g, '')) || 0);
        const next = (ids.length ? Math.max.apply(null, ids) : 0) + 1;
        row[rule.col] = rule.prefix + ('00000000' + next).slice(-rule.pad);
      }
      const values = head.map(h => (row[h] === undefined ? '' : row[h]));
      const r = sh.getLastRow() + 1;
      const range = sh.getRange(r, 1, 1, head.length);
      // keep dates and months as plain text so Sheets does not convert them
      range.setNumberFormats([head.map(h => /date|month|created/.test(h) ? '@' : 'General')]);
      range.setValues([values]);
      return json_({ ok: true, row: row });
    }

    if (req.action === 'update' || req.action === 'inc') {
      const keyIdx = head.indexOf(req.key);
      const data = sh.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][keyIdx]) === String(req.value)) {
          if (req.action === 'inc') {
            const c = head.indexOf(req.field);
            sh.getRange(i + 1, c + 1).setValue((Number(data[i][c]) || 0) + (req.by || 1));
          } else {
            Object.keys(req.changes).forEach(k => {
              const c = head.indexOf(k);
              if (c >= 0) sh.getRange(i + 1, c + 1).setValue(req.changes[k]);
            });
          }
          return json_({ ok: true });
        }
      }
      return json_({ ok: false, error: 'Row not found' });
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
