const email = document.getElementById('email');
const password = document.getElementById('password');
const msg = document.getElementById('msg');

document.getElementById('loginBtn').onclick = async () => {
  const { ok, data, error } = await api.post('/api/v1/auth/login', {
    email: email.value.trim(),
    password: password.value
  });
  if (!ok) {
    msg.textContent = error?.message || 'Login failed';
    return;
  }
  api.setToken(data.accessToken);
  window.location.href = '/dashboard.html';
};

document.getElementById('forgotBtn').onclick = async () => {
  const { ok, data, error } = await api.post('/api/v1/auth/forgot-password', { email: email.value.trim() });
  msg.textContent = ok ? data.message : (error?.message || 'Error');
};