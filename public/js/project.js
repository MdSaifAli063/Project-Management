const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

const projectName = document.getElementById('projectName');
const projectDesc = document.getElementById('projectDesc');

async function loadProject() {
  const { ok, data } = await api.get(`/api/v1/projects/${projectId}`);
  if (!ok) { window.location.href = '/dashboard.html'; return; }
  const p = data.project;
  projectName.textContent = p.name;
  projectDesc.textContent = p.description || '';
}

loadProject();