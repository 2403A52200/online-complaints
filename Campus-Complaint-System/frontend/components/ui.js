// Shared helpers: DOM, API client, session, navigation bar, complaint list.
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = { user: JSON.parse(localStorage.getItem('cc_user') || 'null'), token: localStorage.getItem('cc_token'), unread: 0 };
const actions = {}, forms = {};
const STATUS = ['Pending', 'In Progress', 'Resolved', 'Rejected'], PRIORITY = ['Low', 'Medium', 'High'];
const ICONS = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
};
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const fmt = (s) => (s ? new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '–');
const cls = (s) => String(s).replace(/\s/g, '');
const pill = (s) => `<span class="pill p-${cls(s)}">${esc(s)}</span>`;
const opts = (arr, v, l, sel) => arr.map((o) => `<option value="${esc(o[v])}"${String(o[v]) === String(sel) ? ' selected' : ''}>${esc(o[l])}</option>`).join('');
const view = (html) => { $('#app').innerHTML = html; $('#app').focus({ preventScroll: true }); window.scrollTo(0, 0); };
const go = (h) => { if (location.hash === h) window.dispatchEvent(new Event('hashchange')); else location.hash = h; };

function toast(msg, type = '') {
  const t = document.createElement('div'); t.className = 't ' + type; t.textContent = msg; $('#toast').append(t);
  setTimeout(() => t.remove(), 4200);
}
function setSession(token, user) {
  S.token = token ?? S.token; S.user = user;
  if (user) { localStorage.setItem('cc_user', JSON.stringify(user)); if (token) localStorage.setItem('cc_token', token); }
  else { S.token = null; localStorage.removeItem('cc_user'); localStorage.removeItem('cc_token'); }
}
function logout() { setSession(null, null); S.unread = 0; renderNav(); go('#/login'); }

async function api(path, { method = 'GET', body, blob } = {}) {
  const r = await fetch('/api' + path, {
    method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401 && S.token) { logout(); throw new Error('Your session has expired. Please sign in again.'); }
  if (blob && r.ok) return r.blob();
  const d = (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
  return d;
}

// Submit a form: disables the button, shows errors inline, re-enables when done.
async function run(form, fn) {
  const btn = form.querySelector('button[type=submit]'), msg = form.querySelector('.msg');
  if (btn) btn.disabled = true; if (msg) msg.textContent = '';
  try { await fn(Object.fromEntries(new FormData(form))); }
  catch (e) { if (msg) msg.textContent = e.message; toast(e.message, 'err'); }
  finally { if (btn) btn.disabled = false; }
}

const LINKS = {
  guest: [['#/', 'Home'], ['#/about', 'About'], ['#/contact', 'Contact'], ['#/login', 'Login']],
  student: [['#/dashboard', 'Dashboard'], ['#/submit', 'New complaint'], ['#/my-complaints', 'My complaints'], ['#/track', 'Track']],
  staff: [['#/dashboard', 'Assigned complaints']],
  admin: [['#/dashboard', 'Dashboard'], ['#/complaints', 'Complaints'], ['#/users', 'Users'], ['#/categories', 'Categories'], ['#/reports', 'Reports']],
};
function renderNav() {
  const cur = location.hash || '#/', role = S.user ? S.user.role : 'guest';
  const a = LINKS[role].map(([h, t]) => `<a class="l${cur === h ? ' on' : ''}" href="${h}">${t}</a>`).join('');
  const right = S.user
    ? `<a class="l" href="#/notifications" aria-label="Notifications">${icon('bell')}${S.unread ? `<span class="badge-n">${S.unread}</span>` : ''}</a>
       <a class="l" href="#/profile">${esc(S.user.name.split(' ')[0])}</a><button class="l" data-act="logout">${icon('logout')}Logout</button>`
    : '<a class="btn alt sm" href="#/register">Register</a>';
  $('#nav').innerHTML = `<nav class="nav" aria-label="Main"><a class="brand" href="#/">College <b>Complaint Portal</b></a>
    <button class="menu-btn" data-act="menu" aria-label="Menu">${icon('menu')}</button><div class="links" id="links">${a}${right}</div></nav>`;
}
async function refreshUnread() {
  if (!S.user) return;
  try { S.unread = (await api('/notifications')).unread; renderNav(); } catch { /* ignore */ }
}

// Searchable, filterable complaints table (used by student, staff and admin pages).
async function complaintList(box, { showStudent }) {
  box.innerHTML = `<form class="filters" role="search"><input name="q" placeholder="Search by title or complaint ID" aria-label="Search">
    <select name="status" aria-label="Status"><option value="">All statuses</option>${STATUS.map((s) => `<option>${s}</option>`).join('')}</select>
    <select name="priority" aria-label="Priority"><option value="">All priorities</option>${PRIORITY.map((s) => `<option>${s}</option>`).join('')}</select>
    <button class="btn" type="submit">${icon('search')}Filter</button></form><div class="rows"><div class="spin">Loading…</div></div>`;
  const form = $('form', box), rows = $('.rows', box);
  const load = async () => {
    const p = new URLSearchParams([...new FormData(form)].filter(([, v]) => v));
    try {
      const list = await api('/complaints?' + p), adm = S.user.role === 'admin';
      rows.innerHTML = list.length ? `<div class="tw"><table><thead><tr><th>ID</th><th>Title</th>${showStudent ? '<th>Student</th>' : ''}<th>Category</th>${adm ? '<th>Department</th>' : ''}<th>Priority</th><th>Status</th><th>Submitted</th></tr></thead><tbody>
        ${list.map((c) => `<tr><td><a href="#/complaint/${c.id}">${esc(c.code)}</a></td><td>${esc(c.title)}${c.escalated ? ' <span class="pill p-Rejected">Escalated</span>' : ''}</td>${showStudent ? `<td>${esc(c.student_name)}</td>` : ''}
        <td>${esc(c.category)}</td>${adm ? `<td>${esc(c.department) || '<span class="hint">Awaiting assignment</span>'}</td>` : ''}<td class="pr-${c.priority}">${c.priority}</td><td>${pill(c.status)}</td><td>${fmt(c.created_at)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="card empty">No complaints match. Try clearing the filters.</div>';
    } catch (e) { rows.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; }
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); load(); });
  await load();
}
function statCards(list) {
  const n = (s) => list.filter((c) => c.status === s).length;
  return `<div class="stats"><div class="stat"><b>${list.length}</b><span>Total</span></div>${STATUS.map((s) => `<div class="stat s-${cls(s)}"><b>${n(s)}</b><span>${s}</span></div>`).join('')}</div>`;
}

document.addEventListener('click', (e) => { const a = e.target.closest('[data-act]'); if (a && actions[a.dataset.act]) actions[a.dataset.act](a, e); });
document.addEventListener('submit', (e) => { const f = e.target.closest('form[data-form]'); if (f) { e.preventDefault(); if (forms[f.dataset.form]) run(f, (d) => forms[f.dataset.form](d, f)); } });
actions.logout = () => { logout(); toast('You have been signed out'); };
actions.menu = () => $('#links').classList.toggle('open');
