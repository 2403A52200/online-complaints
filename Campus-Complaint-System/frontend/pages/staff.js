Pages.staffDashboard = async () => {
  view('<div class="wrap page spin">Loading…</div>');
  const list = await api('/complaints');
  view(`<div class="wrap page"><h1 style="font-size:1.8rem">${esc(S.user.department)} department</h1><p class="hint">Only complaints the admin has assigned to your department appear here. Open one to post an update or mark it resolved.</p>${statCards(list)}<div id="box"></div></div>`);
  await complaintList($('#box'), { showStudent: true });
};
