// Simulate browser flow with localStorage
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

async function simulateBrowserFlow() {
  console.log('=== Simulating Browser Flow ===\n');
  
  // Create JSDOM with localStorage support
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:5000',
    pretendToBeVisual: true,
  });

  const window = dom.window;
  const localStorage = window.localStorage;

  // Fake API responses for testing
  window.api = {
    setToken(token) {
      localStorage.setItem("pc_access", token);
    },
    setUser(user) {
      localStorage.setItem("pc_user", JSON.stringify(user));
    },
    getToken() {
      return localStorage.getItem("pc_access");
    },
    async whoami() {
      // Simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: '699371e5a0b378ffe13ffebb',
            name: 'Admin',
            email: 'admin@test.com',
            role: 'admin'
          });
        }, 100);
      });
    }
  };

  // Simulate login response
  const loginResponse = {
    success: true,
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTkzNzFlNWEwYjM3OGZmZTEzZmZlYmIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzEyNzA2NDYsImV4cCI6MTc3MTI3MTU0Nn0.T_HoD80Cc1N-Tr8_FNJoMnJb_giNJ2C_PkRb97rf6X4',
    user: {
      id: '699371e5a0b378ffe13ffebb',
      name: 'Admin',
      email: 'admin@test.com',
      role: 'admin'
    }
  };

  try {
    console.log('1. Simulating login...');
    // This is what auth.js does
    window.api.setToken(loginResponse.accessToken);
    if (loginResponse.user) {
      window.api.setUser(loginResponse.user);
    }
    console.log('   ✓ Token set in localStorage');
    console.log('   ✓ User set in localStorage');

    console.log('\n2. Checking localStorage...');
    const token = localStorage.getItem('pc_access');
    const user = localStorage.getItem('pc_user');
    console.log('   - Token exists:', !!token);
    console.log('   - User exists:', !!user);
    if (user) {
      try {
        const userObj = JSON.parse(user);
        console.log('   - User parsed OK:', userObj.name);
      } catch (e) {
        console.log('   - ERROR parsing user:', e.message);
      }
    }

    console.log('\n3. Simulating initRole()...');
    const pc_token = localStorage.getItem("pc_access");
    if (!pc_token) {
      console.log('   ✗ No token - would redirect to login');
      return;
    }
    console.log('   ✓ Token found');

    // Try to get user from API
    let user_obj = null;
    try {
      user_obj = await Promise.race([
        window.api.whoami(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      console.log('   ✓ User from API:', user_obj.name);
    } catch (e) {
      console.warn('   ⚠ whoami() failed:', e.message);
      user_obj = { name: "User", role: "member" };
      console.log('   ✓ Using fallback:', user_obj.name);
    }

    console.log('\n4. Simulating render (navbar.js)...');
    // Create a fake dashboard page structure
    const dashHTML = `
      <header>
        <nav class="container">
          <div class="nav-brand">📋 Project Camp</div>
          <div class="nav-links">
            <a href="/">Home</a>
          </div>
          <div class="nav-right">
            <span id="userInfo">placeholder</span>
          </div>
        </nav>
      </header>
    `;
    
    dom.window.document.body.innerHTML = dashHTML;
    
    const navLinks = dom.window.document.querySelector(".nav-links");
    const navRight = dom.window.document.querySelector(".nav-right");
    
    console.log('   - nav-links found:', !!navLinks);
    console.log('   - nav-right found:', !!navRight);
    
    if (navLinks && navRight) {
      const token2 = localStorage.getItem("pc_access");
      const userJson = localStorage.getItem("pc_user");
      let user2 = null;
      
      console.log('   - Checking localStorage from navbar.js perspective...');
      console.log('   - Token:', !!token2);
      console.log('   - User JSON:', !!userJson);
      
      if (token2 && userJson) {
        try {
          user2 = JSON.parse(userJson);
          console.log('   ✓ User from localStorage:', user2.name);
        } catch (e) {
          console.log('   ✗ Failed to parse user:', e.message);
        }
      }
      
      if (user2) {
        navLinks.innerHTML = '<a href="/">Dashboard</a>';
        navRight.innerHTML = `<span>${user2.name} (${user2.role})</span>`;
        console.log('   ✓ Navbar would show:', user2.name);
      } else {
        console.log('   ✗ No user - navbar would show login');
      }
    }

    console.log('\n✓ Flow simulation complete');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

simulateBrowserFlow();
