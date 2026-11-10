Pages.adminDashboard = async () => {
  view('<div class="wrap page spin">Loading…</div>');
  const [s, waiting] = [await api('/admin/stats'), await api('/complaints?assigned=0')], n = (st) => (s.byStatus.find((x) => x.status === st) || {}).n || 0;
  const bar = (rows) => { const max = Math.max(1, ...rows.map((r) => r.n)); return rows.length ? rows.map((r) => `<div class="b"><span>${esc(r.name)}</span><i style="width:${(r.n / max) * 100}%"></i><b>${r.n}</b></div>`).join('') : '<p class="hint">No data yet.</p>'; };
  view(`<div class="wrap page"><h1 style="font-size:1.8rem">Admin dashboard</h1><div class="stats"><div class="stat"><b>${s.total}</b><span>Total</span></div><div class="stat s-Pending"><b>${s.unassigned}</b><span>Awaiting assignment</span></div>
  ${STATUS.map((x) => `<div class="stat s-${cls(x)}"><b>${n(x)}</b><span>${x}</span></div>`).join('')}<div class="stat"><b>${s.escalated}</b><span>Escalated</span></div>
  <div class="stat"><b>${s.avgRating ?? '–'}</b><span>Avg. rating</span></div></div>
  <h2 style="margin-top:6px">Waiting for you to assign (${waiting.length})</h2>
  ${waiting.length ? `<div class="tw"><table><thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Priority</th><th>Submitted</th><th></th></tr></thead><tbody>${waiting.map((c) => `<tr><td>${esc(c.code)}</td><td>${esc(c.title)}</td><td>${esc(c.category)}</td><td class="pr-${c.priority}">${c.priority}</td><td>${fmt(c.created_at)}</td><td><a class="btn alt sm" href="#/complaint/${c.id}">Assign</a></td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">Nothing waiting. Every complaint has been assigned.</div>'}
  <div class="cols" style="margin-top:22px"><div class="card bars"><h3>By category</h3>${bar(s.byCategory)}</div><div class="card bars"><h3>By department</h3>${bar(s.byDepartment)}</div></div>
  <p style="margin-top:18px"><a class="btn" href="#/complaints">View all complaints</a></p></div>`);
};
Pages.adminComplaints = () => { view('<div class="wrap page"><h1 style="font-size:1.8rem">All complaints</h1><div id="box"></div></div>'); return complaintList($('#box'), { showStudent: true }); };

Pages.users = async () => {
  const [users, m] = await Promise.all([api('/admin/users'), api('/meta')]);
  view(`<div class="wrap page"><h1 style="font-size:1.8rem">Manage users</h1><div class="tw"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th></th></tr></thead><tbody>
  ${users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.department) || '–'}</td><td>${u.active ? pill('Resolved').replace('Resolved', 'Active') : pill('Rejected').replace('Rejected', 'Inactive')}</td>
  <td>${u.id === S.user.id ? '' : `<button class="btn ghost sm" data-act="toggle" data-id="${u.id}" data-active="${u.active ? 0 : 1}">${u.active ? 'Deactivate' : 'Activate'}</button>`}</td></tr>`).join('')}</tbody></table></div>
  <div class="card form-card" style="margin-top:22px"><h2>Add staff or admin</h2><form class="f" data-form="newuser"><div class="row2"><label>Name<input name="name" required></label><label>Email<input name="email" type="email" required></label></div>
  <div class="row2"><label>Role<select name="role"><option value="staff">Department staff</option><option value="admin">Admin</option></select></label>
  <label>Department (staff only)<select name="department_id">${opts(m.departments, 'id', 'name')}</select></label></div>
  <label>Temporary password<input name="password" type="password" minlength="8" required autocomplete="new-password"></label><span class="msg"></span><button class="btn" type="submit">Create user</button></form></div></div>`);
};
actions.toggle = async (b) => { try { await api('/admin/users/' + b.dataset.id, { method: 'PATCH', body: { active: b.dataset.active === '1' } }); toast('User updated', 'ok'); go('#/users'); } catch (e) { toast(e.message, 'err'); } };
forms.newuser = async (d) => { await api('/admin/users', { method: 'POST', body: d }); toast('User created', 'ok'); go('#/users'); };

Pages.categories = async () => {
  const m = await api('/meta');
  view(`<div class="wrap page"><h1 style="font-size:1.8rem">Complaint categories</h1><div class="tw"><table><thead><tr><th>Category</th><th>Handled by</th></tr></thead><tbody>
  ${m.categories.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.department)}</td></tr>`).join('')}</tbody></table></div>
  <div class="card form-card" style="margin-top:22px"><h2>Add category</h2><form class="f" data-form="newcat"><div class="row2"><label>Name<input name="name" required minlength="3" maxlength="60"></label>
  <label>Department<select name="department_id">${opts(m.departments, 'id', 'name')}</select></label></div><span class="msg"></span><button class="btn" type="submit">Add category</button></form></div></div>`);
};
forms.newcat = async (d) => { await api('/admin/categories', { method: 'POST', body: d }); toast('Category added', 'ok'); go('#/categories'); };

Pages.reports = async () => {
  const s = await api('/admin/stats');
  view(`<div class="wrap page"><h1 style="font-size:1.8rem">Reports</h1><div class="card form-card"><p>${s.total} complaints on record, ${s.escalated} escalated. Average feedback rating: ${s.avgRating ?? 'no ratings yet'}.</p>
  <button class="btn" data-act="csv">Download all complaints (CSV)</button></div></div>`);
};
actions.csv = async () => {
  try { const b = await api('/admin/report', { blob: true }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'complaints-report.csv'; a.click(); URL.revokeObjectURL(a.href); }
  catch (e) { toast(e.message, 'err'); }
};

Pages.notifications = async () => {
  const r = await api('/notifications');
  view(`<div class="wrap page"><div class="bar"><h1 style="font-size:1.8rem">Notifications</h1><button class="btn ghost" data-act="readall">Mark all as read</button></div><div class="card">
  ${r.items.length ? r.items.map((n) => `<div class="note${n.is_read ? '' : ' un'}"><span>${n.complaint_id ? `<a href="#/complaint/${n.complaint_id}">${esc(n.message)}</a>` : esc(n.message)}</span><small>${fmt(n.created_at)}</small></div>`).join('') : '<div class="empty">No notifications yet.</div>'}</div></div>`);
};
actions.readall = async () => { await api('/notifications/read', { method: 'POST' }); S.unread = 0; go('#/notifications'); renderNav(); };
