// Navbar initialization - simplified and robust
function initNavbar() {
  const navLinks = document.querySelector(".nav-links");
  const navRight = document.querySelector(".nav-right");
  
  if (!navLinks || !navRight) {
    console.warn("Navbar elements not found");
    return;
  }

  // Get auth state from localStorage (instant, no API call)
  const token = localStorage.getItem("pc_access");
  const userJson = localStorage.getItem("pc_user");
  
  let user = null;
  if (token && userJson) {
    try {
      user = JSON.parse(userJson);
    } catch (e) {
      console.warn("Failed to parse user:", e.message);
    }
  }

  if (user && token) {
    // User is authenticated - show dashboard nav
    navLinks.innerHTML = `
      <a href="/">Home</a>
      <a href="/dashboard.html">Dashboard</a>
      <a href="/dashboard.html">Projects</a>
    `;
    navRight.innerHTML = `
      <span style="color:var(--gray); margin-right:12px;">${user.name || 'User'} (${user.role || 'member'})</span>
      <a href="/dashboard.html" class="btn btn-outline">Dashboard</a>
      <button id="logoutBtn" class="btn btn-outline">Logout</button>
    `;
    
    // Setup logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.onclick = async (e) => {
        e.preventDefault();
        try {
          await api.post("/api/v1/auth/logout");
        } catch (e) {}
        api.setToken(null);
        api.setUser(null);
        window.location.href = "/";
      };
    }
  } else {
    // User is NOT authenticated - show login nav
    navLinks.innerHTML = `
      <a href="#features">Features</a>
      <a href="#about">About</a>
    `;
    navRight.innerHTML = `
      <a href="/login.html" class="btn btn-outline">Login</a>
      <a href="/register.html" class="btn btn-primary">Sign Up</a>
    `;
  }
}

// Call immediately when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavbar);
} else {
  initNavbar();
}
