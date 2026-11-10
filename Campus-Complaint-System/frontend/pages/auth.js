const DEMO_DEPT = { 'Hostel & Mess': 'hostel@campus.edu', 'Academics': 'academics@campus.edu', 'Infrastructure': 'staff@campus.edu', 'IT & Network': 'it@campus.edu', 'Library': 'library@campus.edu', 'Administration': 'administration@campus.edu' };
Pages.login = async (role) => {
  if (!['student', 'admin', 'department'].includes(role)) return view(`<div class="wrap page"><h1 style="font-size:1.8rem;text-align:center">Choose how you want to log in</h1><div class="cols" style="margin-top:20px">${loginCards()}</div></div>`);
  const dept = role === 'department', depts = dept ? await api('/departments') : [];
  const demo = dept ? Object.entries(DEMO_DEPT).map(([n, e]) => `<button class="btn ghost sm" data-act="fill" data-e="${e}" data-p="Staff@123" data-d="${esc(n)}">${esc(n)}</button>`).join('')
    : role === 'admin' ? '<button class="btn ghost sm" data-act="fill" data-e="admin@campus.edu" data-p="Admin@123">Admin</button>' : '';
  view(`<div class="wrap page"><div class="narrow card"><p><a href="#/login">&larr; Choose another login</a></p><h2>${dept ? 'Department' : role === 'admin' ? 'Admin' : 'Student'} login</h2>
  <form class="f" data-form="login"><input type="hidden" name="portal" value="${dept ? 'staff' : role}">
  ${dept ? `<label>Department<select name="department_id" required><option value="">Select your department…</option>${opts(depts, 'id', 'name')}</select></label>` : ''}
  <label>Email<input name="email" type="email" autocomplete="username" required></label>
  <label>Password<input name="password" type="password" autocomplete="current-password" required></label><span class="msg"></span>
  <button class="btn" type="submit">Login</button></form>${role === 'student' ? '<p style="margin-top:14px">New student? <a href="#/register">Create an account</a></p>' : ''}
  ${demo ? `<div class="demo"><b>Demo account${dept ? 's' : ''}</b> (tap to fill)<br>${demo}</div>` : ''}</div></div>`);
};
actions.fill = (b) => { const f = $('form[data-form=login]'); f.email.value = b.dataset.e; f.password.value = b.dataset.p; if (b.dataset.d && f.department_id) [...f.department_id.options].forEach((o) => { if (o.text === b.dataset.d) f.department_id.value = o.value; }); };
forms.login = async (d) => { const r = await api('/auth/login', { method: 'POST', body: d }); setSession(r.token, r.user); await refreshUnread(); toast('Welcome, ' + r.user.name, 'ok'); go('#/dashboard'); };

Pages.register = () => view(`<div class="wrap page"><div class="narrow card"><h2>Student registration</h2>
  <form class="f" data-form="register"><label>Full name<input name="name" autocomplete="name" required maxlength="80"></label>
  <label>Email<input name="email" type="email" autocomplete="email" required></label>
  <div class="row2"><label>Roll number<input name="roll_no" maxlength="30"></label><label>Course<input name="course" maxlength="60" placeholder="B.Tech CSE"></label></div>
  <label>Password<input name="password" type="password" autocomplete="new-password" minlength="8" required><span class="hint">At least 8 characters with a letter and a number.</span></label>
  <label>Confirm password<input name="confirm" type="password" autocomplete="new-password" required></label><span class="msg"></span>
  <button class="btn" type="submit">Create account</button></form><p style="margin-top:14px">Already registered? <a href="#/login">Login</a></p></div></div>`);
forms.register = async (d) => {
  if (d.password !== d.confirm) throw new Error('Passwords do not match');
  const r = await api('/auth/register', { method: 'POST', body: d }); setSession(r.token, r.user); toast('Account created', 'ok'); go('#/dashboard');
};

Pages.profile = async () => {
  const u = await api('/auth/me'); setSession(null, u);
  view(`<div class="wrap page"><div class="form-card card"><h2>My profile</h2><p class="hint">Signed in as ${esc(u.email)} &middot; role: ${esc(u.role)}</p>
  <form class="f" data-form="profile"><label>Full name<input name="name" value="${esc(u.name)}" required maxlength="80"></label>
  ${u.role === 'student' ? `<div class="row2"><label>Roll number<input name="roll_no" value="${esc(u.roll_no)}" maxlength="30"></label><label>Course<input name="course" value="${esc(u.course)}" maxlength="60"></label></div>` : ''}
  <h3>Change password <span class="hint">(optional)</span></h3><div class="row2"><label>Current password<input name="current_password" type="password" autocomplete="current-password"></label>
  <label>New password<input name="new_password" type="password" autocomplete="new-password"></label></div><span class="msg"></span><button class="btn" type="submit">Save changes</button></form></div></div>`);
};
forms.profile = async (d) => { const u = await api('/auth/profile', { method: 'PUT', body: d }); setSession(null, u); renderNav(); toast('Profile saved', 'ok'); };
