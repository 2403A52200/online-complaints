// App entry: hash router + session restore.
const ROUTES = {
  '': { p: 'home' }, about: { p: 'about' }, contact: { p: 'contact' }, login: { p: 'login', guest: true }, register: { p: 'register', guest: true },
  dashboard: { p: 'dash', roles: ['student', 'staff', 'admin'] }, submit: { p: 'submit', roles: ['student'] }, 'my-complaints': { p: 'mine', roles: ['student'] },
  track: { p: 'track', roles: ['student'] }, complaint: { p: 'complaint', roles: ['student', 'staff', 'admin'] }, profile: { p: 'profile', roles: ['student', 'staff', 'admin'] },
  notifications: { p: 'notifications', roles: ['student', 'staff', 'admin'] }, complaints: { p: 'adminComplaints', roles: ['admin'] },
  users: { p: 'users', roles: ['admin'] }, categories: { p: 'categories', roles: ['admin'] }, reports: { p: 'reports', roles: ['admin'] },
};
async function route() {
  const [name, arg] = location.hash.replace(/^#\/?/, '').split('/'), r = ROUTES[name || ''];
  renderNav();
  if (!r) return Pages.notFound();
  if (r.roles && !S.user) { toast('Please log in to continue'); return go('#/login'); }
  if (r.roles && !r.roles.includes(S.user.role)) { toast('That page is not available for your role', 'err'); return go('#/dashboard'); }
  if (r.guest && S.user) return go('#/dashboard');
  const page = r.p === 'dash' ? Pages[S.user.role + 'Dashboard'] : r.p === 'mine' ? Pages.mine : Pages[r.p];
  try { await page(arg ? decodeURIComponent(arg) : undefined); }
  catch (e) { view(`<div class="wrap page"><div class="card empty"><h2>Something went wrong</h2><p>${esc(e.message)}</p><a class="btn" href="#/dashboard">Back to dashboard</a></div></div>`); }
  refreshUnread();
}
window.addEventListener('hashchange', route);
(async () => {
  if (S.token) { try { setSession(null, await api('/auth/me')); } catch { setSession(null, null); } }
  route();
})();
