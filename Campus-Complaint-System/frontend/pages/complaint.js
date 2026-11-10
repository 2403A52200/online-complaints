// Complaint details: timeline, evidence image, and role-specific actions.
Pages.complaint = async (id) => {
  view('<div class="wrap page spin">Loading…</div>');
  const c = await api('/complaints/' + encodeURIComponent(id)), role = S.user.role;
  const meta = role === 'admin' ? await api('/meta') : null;
  const closed = ['Resolved', 'Rejected'].includes(c.status);
  const statusForm = (role === 'staff' || role === 'admin') && (!closed || role === 'admin') ? `<div class="card"><h3>Update status</h3>
    <form class="f" data-form="status" data-id="${c.id}"><label>Status<select name="status">${opts(STATUS.map((s) => ({ v: s })), 'v', 'v', c.status)}</select></label>
    <label>Comment / progress update<textarea name="comment" maxlength="500" style="min-height:80px"></textarea></label><span class="msg"></span><button class="btn" type="submit">Save update</button></form></div>` : '';
  const sug = role === 'admin' ? meta.departments.find((d) => d.id === c.suggested_department_id) : null;
  const assignForm = role === 'admin' && !closed ? `<div class="card"><h3>${c.department_id ? 'Re-assign department' : 'Assign to department'}</h3>${c.department_id ? '' : `<p class="hint">Not assigned yet, so no department can see it. Suggested from category: <b>${esc(sug && sug.name)}</b></p>`}
    <form class="f" data-form="assign" data-id="${c.id}"><select name="department_id" aria-label="Department">${opts(meta.departments, 'id', 'name', c.department_id || c.suggested_department_id)}</select><span class="msg"></span>
    <button class="btn alt" type="submit">${c.department_id ? 'Re-assign' : 'Assign &amp; notify department'}</button></form></div>` : '';
  let fb = '';
  if (c.feedback) fb = `<div class="card"><h3>Feedback</h3><p>Rating: <b>${c.feedback.rating}/5</b></p><p>${esc(c.feedback.comment) || '<span class="hint">No comment</span>'}</p></div>`;
  else if (role === 'student' && c.status === 'Resolved') fb = `<div class="card"><h3>How did we do?</h3><form class="f" data-form="feedback" data-id="${c.id}">
    <label>Rating<select name="rating"><option value="5">5 – Excellent</option><option value="4">4 – Good</option><option value="3">3 – Okay</option><option value="2">2 – Poor</option><option value="1">1 – Very poor</option></select></label>
    <label>Comment<textarea name="comment" maxlength="500" style="min-height:70px"></textarea></label><span class="msg"></span><button class="btn alt" type="submit">Send feedback</button></form></div>`;
  view(`<div class="wrap page"><div class="bar"><div><h1 style="font-size:1.8rem">${esc(c.title)}</h1><span class="hint">${esc(c.code)}</span></div>${pill(c.status)}</div>
  <div class="detail"><div style="display:grid;gap:18px;align-content:start"><div class="card"><h3>Description</h3><p style="white-space:pre-wrap">${esc(c.description)}</p><div id="ev"></div></div>
  <div class="card"><h3>Progress</h3><ul class="tl">${c.history.map((h) => `<li><b>${esc(h.status)}</b> <small>${fmt(h.created_at)} &middot; ${esc(h.by)}</small>${h.comment ? `<br>${esc(h.comment)}` : ''}</li>`).join('')}</ul></div></div>
  <div style="display:grid;gap:18px;align-content:start"><div class="card"><h3>Details</h3><dl><dt>Category</dt><dd>${esc(c.category)}</dd><dt>Department</dt><dd>${esc(c.department) || 'Awaiting admin assignment'}</dd>
  <dt>Priority</dt><dd class="pr-${c.priority}">${c.priority}${c.escalated ? ' (escalated)' : ''}</dd><dt>Submitted by</dt><dd>${esc(c.student_name)}${c.anonymous && role === 'student' ? ' (shown as anonymous to staff)' : ''}</dd>
  <dt>Submitted</dt><dd>${fmt(c.created_at)}</dd><dt>Due</dt><dd>${fmt(c.due_at)}</dd><dt>Resolved</dt><dd>${fmt(c.resolved_at)}</dd></dl></div>${statusForm}${assignForm}${fb}</div></div></div>`);
  if (c.image) api('/files/' + c.image, { blob: true }).then((b) => { $('#ev').innerHTML = `<img class="evidence" alt="Evidence image" src="${URL.createObjectURL(b)}">`; }).catch(() => {});
};
const reload = (f) => go('#/complaint/' + f.dataset.id);
forms.status = async (d, f) => { await api(`/complaints/${f.dataset.id}/status`, { method: 'PATCH', body: d }); toast('Status updated', 'ok'); reload(f); };
forms.assign = async (d, f) => { await api(`/complaints/${f.dataset.id}/assign`, { method: 'POST', body: d }); toast('Department assigned', 'ok'); reload(f); };
forms.feedback = async (d, f) => { await api(`/complaints/${f.dataset.id}/feedback`, { method: 'POST', body: d }); toast('Thanks for your feedback', 'ok'); reload(f); };
