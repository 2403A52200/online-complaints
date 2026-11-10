Pages.studentDashboard = async () => {
  view('<div class="wrap page spin">Loading…</div>');
  const list = await api('/complaints');
  view(`<div class="wrap page"><div class="bar"><h1 style="font-size:1.8rem">Hello, ${esc(S.user.name.split(' ')[0])}</h1><a class="btn alt" href="#/submit">${icon('plus')}New complaint</a></div>
  ${statCards(list)}<h2>Recent complaints</h2><div id="box"></div></div>`);
  const box = $('#box');
  box.innerHTML = list.length ? `<div class="tw"><table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Updated</th></tr></thead><tbody>${list.slice(0, 5).map((c) =>
    `<tr><td><a href="#/complaint/${c.id}">${esc(c.code)}</a></td><td>${esc(c.title)}</td><td>${pill(c.status)}</td><td>${fmt(c.updated_at)}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="card empty">You have not submitted any complaints yet.<br><br><a class="btn" href="#/submit">Submit your first complaint</a></div>';
};
Pages.mine = () => { view('<div class="wrap page"><h1 style="font-size:1.8rem">My complaints</h1><div id="box"></div></div>'); return complaintList($('#box'), { showStudent: false }); };

Pages.submit = async () => {
  const m = await api('/meta');
  view(`<div class="wrap page"><div class="card form-card"><h2>Submit a complaint</h2><form class="f" data-form="submit">
  <label>Title<input name="title" required minlength="5" maxlength="120" placeholder="e.g. Wi-Fi not working in Lab 3"></label>
  <div class="row2"><label>Category<select name="category_id" required><option value="">Choose…</option>${opts(m.categories, 'id', 'name')}</select></label>
  <label>Priority<select name="priority"><option>Low</option><option selected>Medium</option><option>High</option></select></label></div>
  <label>Description<textarea name="description" required minlength="10" maxlength="2000" placeholder="What happened, where, and since when?"></textarea></label>
  <label>Photo evidence <span class="hint">(optional, PNG or JPEG, up to 2 MB)</span><input type="file" name="image" accept="image/png,image/jpeg"></label>
  <label class="chk"><input type="checkbox" name="anonymous"><span>Submit anonymously &mdash; staff and admins will not see my name.</span></label>
  <span class="msg"></span><button class="btn alt" type="submit">Submit complaint</button></form></div></div>`);
};
const readFile = (file) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error('Could not read the image')); r.readAsDataURL(file); });
forms.submit = async (d, f) => {
  const file = f.image.files[0]; let image;
  if (file) {
    if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Evidence must be a PNG or JPEG image');
    if (file.size > 2 * 1024 * 1024) throw new Error('Image must be 2 MB or smaller');
    image = { data: await readFile(file) };
  }
  const r = await api('/complaints', { method: 'POST', body: { title: d.title, category_id: d.category_id, priority: d.priority, description: d.description, anonymous: !!f.anonymous.checked, image } });
  toast('Submitted. Your complaint ID is ' + r.code, 'ok'); go('#/complaint/' + r.id);
};

Pages.track = () => view(`<div class="wrap page"><div class="narrow card"><h2>Track a complaint</h2><form class="f" data-form="quicktrack">
  <label>Complaint ID<input name="code" placeholder="CMP-2026-0001" required maxlength="20"></label><span class="msg"></span><button class="btn" type="submit">${icon('search')}Track</button></form></div></div>`);
