const API_BASE_URL = 'https://verisage-evolution.onrender.com/api';
let authToken = localStorage.getItem('authToken');
let currentUserData = null;

// ============================================================================
// Custom Alert System
// ============================================================================
const CustomAlert = {
  _createModalBase(id, innerHTML) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.id = id;
    overlay.style.zIndex = '10000'; // above everything
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '400px';
    modal.style.textAlign = 'center';
    modal.innerHTML = innerHTML;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    return { overlay, modal };
  },

  show(message, type = 'error') {
    const icon = type === 'success' ? '<i class="fas fa-check-circle" style="color: #28a745; font-size: 3rem; margin-bottom: 1rem;"></i>' :
                 type === 'warning' ? '<i class="fas fa-exclamation-triangle" style="color: #ffc107; font-size: 3rem; margin-bottom: 1rem;"></i>' :
                 '<i class="fas fa-times-circle" style="color: #dc3545; font-size: 3rem; margin-bottom: 1rem;"></i>';
    
    const { overlay } = this._createModalBase('customAlertModal', `
      ${icon}
      <h3 style="margin-bottom: 1rem; color: #333;">${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
      <p style="margin-bottom: 2rem; color: #666;">${message}</p>
      <button class="btn btn-primary" id="customAlertBtn" style="width: 100%;">OK</button>
    `);

    document.getElementById('customAlertBtn').onclick = () => overlay.remove();
  },

  confirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
      const { overlay } = this._createModalBase('customConfirmModal', `
        <i class="fas fa-question-circle" style="color: #17a2b8; font-size: 3rem; margin-bottom: 1rem;"></i>
        <h3 style="margin-bottom: 1rem; color: #333;">${title}</h3>
        <p style="margin-bottom: 2rem; color: #666; white-space: pre-wrap;">${message}</p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button class="btn btn-secondary" id="customConfirmCancel">Cancel</button>
          <button class="btn btn-primary" id="customConfirmOk">Confirm</button>
        </div>
      `);

      document.getElementById('customConfirmCancel').onclick = () => {
        overlay.remove();
        resolve(false);
      };
      document.getElementById('customConfirmOk').onclick = () => {
        overlay.remove();
        resolve(true);
      };
    });
  }
};

// Override native showAlert if exist, use CustomAlert for new things.
// For compatibility with old `showAlert(message, type)` calls:
window.showAlert = (message, type = 'error') => CustomAlert.show(message, type);

// ============================================================================
// Authentication & User
// ============================================================================
function checkAuth() {
  if (!authToken) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

async function logout() {
  try {
    if (authToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    }
  } catch (err) {
    console.error('Logout error', err);
  } finally {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  }
}

async function loadUserInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (response.ok) {
      const result = await response.json();
      currentUserData = result.user;
      
      const userNameEl = document.getElementById('userName');
      if (userNameEl) userNameEl.textContent = result.user.name;
      
      const dropdownNameEl = document.getElementById('dropdownUserName');
      if (dropdownNameEl) dropdownNameEl.textContent = result.user.name;
      
      const dropdownEmailEl = document.getElementById('dropdownUserEmail');
      if (dropdownEmailEl) dropdownEmailEl.textContent = result.user.email;
      
      const dropdownRoleEl = document.getElementById('dropdownUserRole');
      if (dropdownRoleEl) {
        dropdownRoleEl.innerHTML = result.user.role === 'admin' || result.user.role === 'superadmin'
          ? '<i class="fas fa-shield-alt"></i> ' + result.user.role.toUpperCase()
          : '<i class="fas fa-user"></i> ' + result.user.role.toUpperCase();
      }
      
      const profileNameEl = document.getElementById('profileName');
      if (profileNameEl) profileNameEl.value = result.user.name;
      
      const profileUsernameEl = document.getElementById('profileUsername');
      if (profileUsernameEl) profileUsernameEl.value = result.user.username;
      
      const profileEmailEl = document.getElementById('profileEmail');
      if (profileEmailEl) profileEmailEl.value = result.user.email;
    } else {
      logout();
    }
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

// ============================================================================
// Dropdown & Modal UI Logic
// ============================================================================
function toggleProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) dropdown.classList.toggle('show');
}

document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('profileDropdown');
  const userInfo = document.querySelector('.user-info');
  if (dropdown && userInfo && !userInfo.contains(event.target) && !dropdown.contains(event.target)) {
    dropdown.classList.remove('show');
  }
});

function openProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.add('show');
  toggleProfileDropdown();
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.remove('show');
}

function openPasswordModal() {
  const modal = document.getElementById('passwordModal');
  if (modal) modal.classList.add('show');
  toggleProfileDropdown();
}

function closePasswordModal() {
  const modal = document.getElementById('passwordModal');
  if (modal) modal.classList.remove('show');
  const form = document.getElementById('passwordForm');
  if (form) form.reset();
}

async function saveProfile(event) {
  event.preventDefault();
  const name = document.getElementById('profileName').value;
  const email = document.getElementById('profileEmail').value;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/update-details`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email })
    });

    const result = await response.json();

    if (result.success) {
      CustomAlert.show('Profile updated successfully', 'success');
      closeProfileModal();
      loadUserInfo();
    } else {
      CustomAlert.show(result.message || 'Error updating profile');
    }
  } catch (error) {
    CustomAlert.show('Server error');
  }
}

async function changePassword(event) {
  event.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    CustomAlert.show('New passwords do not match');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/update-password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const result = await response.json();

    if (result.success) {
      CustomAlert.show('Password changed successfully. Please login again.', 'success');
      closePasswordModal();
      setTimeout(() => logout(), 2000);
    } else {
      CustomAlert.show(result.message || 'Error changing password');
    }
  } catch (error) {
    CustomAlert.show('Server error');
  }
}
