const auth = require('../controllers/auth'), cx = require('../controllers/complaints'), admin = require('../controllers/admin');
const routes = [];
// roles: null = public, [] = any signed-in user, ['admin'] = listed roles only
const add = (method, pattern, roles, handler) =>
  routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), roles, handler });

add('POST', '/api/auth/register', null, auth.register);
add('POST', '/api/auth/login', null, auth.login);
add('GET', '/api/auth/me', [], auth.me);
add('PUT', '/api/auth/profile', [], auth.updateProfile);
add('GET', '/api/departments', null, admin.departments);
add('GET', '/api/meta', [], admin.meta);

add('POST', '/api/complaints', ['student'], cx.create);
add('GET', '/api/complaints', [], cx.list);
add('GET', '/api/complaints/:id', [], cx.get);
add('PATCH', '/api/complaints/:id/status', ['staff', 'admin'], cx.updateStatus);
add('POST', '/api/complaints/:id/assign', ['admin'], cx.assign);
add('POST', '/api/complaints/:id/feedback', ['student'], cx.feedback);
add('GET', '/api/files/:name', [], cx.file);
add('GET', '/api/notifications', [], cx.notifications);
add('POST', '/api/notifications/read', [], cx.readNotifications);

add('GET', '/api/admin/stats', ['admin'], admin.stats);
add('GET', '/api/admin/users', ['admin'], admin.users);
add('POST', '/api/admin/users', ['admin'], admin.createUser);
add('PATCH', '/api/admin/users/:id', ['admin'], admin.setActive);
add('POST', '/api/admin/categories', ['admin'], admin.addCategory);
add('GET', '/api/admin/report', ['admin'], admin.report);
module.exports = routes;
