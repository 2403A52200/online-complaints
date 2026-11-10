const Pages = {};
Pages.home = () => view(`
<section class="hero"><div class="wrap grid"><div>
  <p style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b5500;margin-bottom:8px">College Complaint Portal</p><h1>Report it. Track it. See it fixed.</h1>
  <p>Every complaint about hostels, classrooms, Wi-Fi, fees or safety goes to the admin, who assigns it to the department that can fix it &mdash; and shows you each step until it is resolved.</p>
  <a class="btn alt" href="#/register">Register as a student</a> </div>
  <div class="tracker"><h3>Login</h3><div style="display:grid;gap:10px"><a class="btn" href="#/login/student">Student login</a><a class="btn ghost" href="#/login/admin">Admin login</a><a class="btn ghost" href="#/login/department">Department login</a><span class="hint">New student? <a href="#/register">Register here</a></span></div></div></div></section>
<section class="sec"><div class="wrap"><h2>How it works</h2><div class="cols">
  <div class="card step"><span class="n">1</span><div><h3>Submit</h3>Describe the problem, set a priority and attach a photo. You can stay anonymous.</div></div>
  <div class="card step"><span class="n">2</span><div><h3>Admin assigns</h3>The admin reviews it and assigns it to the right department.</div></div>
  <div class="card step"><span class="n">3</span><div><h3>Resolved &amp; rated</h3>The department updates the status and you are notified at every step.</div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap cols">
  <div class="card"><h3>${icon('file')}Students</h3>Submit with evidence, track progress, view history and give feedback.</div>
  <div class="card"><h3>${icon('shield')}Department staff</h3>See only the complaints assigned to your department, post progress updates and mark them resolved.</div>
  <div class="card"><h3>${icon('chart')}Administrators</h3>Receive every new complaint, assign it to a department, manage users and download reports. Overdue complaints escalate automatically.</div></div></section>`);
forms.quicktrack = (d) => { const code = d.code.trim().toUpperCase(); if (!/^CMP-\d{4}-\d{4}$/.test(code)) throw new Error('Enter an ID like CMP-2026-0001'); go('#/complaint/' + code); };

Pages.about = () => view(`<div class="wrap page"><h1>About the College Complaint Portal</h1><div class="detail"><div class="card">
  <p>This portal is an Online Campus Complaint Management System built for a Software Engineering and System Design project. It replaces paper forms and word-of-mouth with one traceable process.</p>
  <p>Every complaint gets a unique ID, a priority, a due date and a full status history. If a complaint is not handled before its due date, it is escalated automatically and the administrators are notified.</p></div>
  <div class="card"><h3>Built with</h3><dl><dt>Frontend</dt><dd>HTML, CSS, JavaScript</dd><dt>Backend</dt><dd>Node.js REST API</dd><dt>Database</dt><dd>SQLite</dd><dt>Security</dt><dd>scrypt hashing, signed tokens, role checks</dd></dl></div></div></div>`);

Pages.contact = () => view(`<div class="wrap page"><h1>Contact</h1><div class="cols">
  <div class="card"><h3>Grievance Cell</h3><p>Administration Block, Room 12<br>Open Monday to Saturday, 9:00 am &ndash; 5:00 pm</p></div>
  <div class="card"><h3>Email &amp; phone</h3><p>grievance@yourcollege.edu<br>+91 00000 00000</p></div>
  <div class="card"><h3>Urgent or safety issues</h3><p>For emergencies, contact campus security directly. Do not wait for a complaint to be processed.</p></div></div>
  <p class="hint" style="margin-top:14px">Replace these placeholder details with your college&rsquo;s real contact information.</p></div>`);
Pages.notFound = () => view('<div class="wrap page"><div class="card empty"><h2>Page not found</h2><a class="btn" href="#/">Go home</a></div></div>');

const loginCards = () => `<a class="card lc" href="#/login/student"><h3>${icon('file')}Student login</h3><p>Submit complaints and track their progress.</p><span class="btn">Student login</span></a>
<a class="card lc" href="#/login/admin"><h3>${icon('shield')}Admin login</h3><p>Review new complaints and assign them to departments.</p><span class="btn">Admin login</span></a>
<a class="card lc" href="#/login/department"><h3>${icon('users')}Department login</h3><p>Choose your department to see the complaints assigned to it.</p><span class="btn">Department login</span></a>`;
