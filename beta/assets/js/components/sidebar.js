/* global confirm, alert */

// Sidebar component - Enhanced with profile menu functionality

/**
 * Profile Menu Management
 */
class ProfileMenu {
  constructor() {
    this.isOpen = false;
    this.profileData = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadProfileData();
  }

  bindEvents() {
    const profileTrigger = document.getElementById('profile-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutButton = document.getElementById('logout-button');
    const profileSettings = document.getElementById('profile-settings');

    if (profileTrigger) {
      profileTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMenu();
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleLogout();
      });
    }

    if (profileSettings) {
      profileSettings.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleProfileSettings();
      });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && profileDropdown && !profileDropdown.contains(e.target) && !profileTrigger.contains(e.target)) {
        this.closeMenu();
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMenu();
        profileTrigger?.focus();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.isOpen && window.innerWidth < 768) {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    this.isOpen ? this.closeMenu() : this.openMenu();
  }

  openMenu() {
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileTrigger = document.getElementById('profile-trigger');
    
    if (profileDropdown && profileTrigger) {
      profileDropdown.classList.remove('hidden');
      profileTrigger.setAttribute('aria-expanded', 'true');
      this.isOpen = true;

      // Focus first menu item for accessibility
      const firstMenuItem = profileDropdown.querySelector('button');
      if (firstMenuItem) {
        setTimeout(() => firstMenuItem.focus(), 100);
      }
    }
  }

  closeMenu() {
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileTrigger = document.getElementById('profile-trigger');
    
    if (profileDropdown && profileTrigger) {
      profileDropdown.classList.add('hidden');
      profileTrigger.setAttribute('aria-expanded', 'false');
      this.isOpen = false;
    }
  }

  async loadProfileData() {
    try {
      // Load user data from localStorage or API
      const userData = this.getUserDataFromStorage() || this.getDefaultUserData();
      this.profileData = userData;
      this.updateProfileDisplay();
    } catch (error) {
      console.error('Error loading profile data:', error);
      this.updateProfileDisplay(this.getDefaultUserData());
    }
  }

  getUserDataFromStorage() {
    try {
      const stored = localStorage.getItem('skyluxse_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Could not parse user data from localStorage:', error);
    }
    return null;
  }

  getDefaultUserData() {
    return {
      name: 'Пользователь',
      email: 'user@skyluxse.ae',
      role: 'Fleet Manager',
      avatar: null
    };
  }

  updateProfileDisplay(data = this.profileData) {
    if (!data) return;

    const elements = {
      profileName: document.getElementById('profile-name'),
      profileRole: document.getElementById('profile-role'),
      dropdownProfileName: document.getElementById('dropdown-profile-name'),
      dropdownProfileEmail: document.getElementById('dropdown-profile-email'),
      profileAvatar: document.getElementById('profile-avatar')
    };

    // Update profile trigger
    if (elements.profileName) {
      elements.profileName.textContent = data.name || 'Неизвестный пользователь';
    }
    if (elements.profileRole) {
      elements.profileRole.textContent = data.role || 'Роль не указана';
    }

    // Update dropdown
    if (elements.dropdownProfileName) {
      elements.dropdownProfileName.textContent = data.name || 'Неизвестный пользователь';
    }
    if (elements.dropdownProfileEmail) {
      elements.dropdownProfileEmail.textContent = data.email || 'email@skyluxse.ae';
    }

    // Update avatar
    this.updateAvatar(data.avatar);
  }

  updateAvatar(avatarUrl) {
    const avatarContainer = document.getElementById('profile-avatar');
    if (!avatarContainer) return;

    if (avatarUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = 'Profile avatar';
      img.onerror = () => {
        // If image fails to load, show fallback icon
        avatarContainer.innerHTML = this.getAvatarFallback();
        avatarContainer.classList.remove('loading');
      };
      img.onload = () => {
        avatarContainer.classList.remove('loading');
      };
      avatarContainer.innerHTML = '';
      avatarContainer.appendChild(img);
      avatarContainer.classList.add('loading');
    } else {
      avatarContainer.innerHTML = this.getAvatarFallback();
      avatarContainer.classList.remove('loading');
    }
  }

  getAvatarFallback() {
    return `
      <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
    `;
  }

  handleLogout() {
    // Show confirmation dialog
    const confirmed = confirm('Вы уверены, что хотите выйти из системы?');
    
    if (confirmed) {
      this.performLogout();
    }
  }

  async performLogout() {
    try {
      // Show loading state
      this.showLogoutLoading();

      // Clear user data from localStorage
      localStorage.removeItem('skyluxse_user');
      localStorage.removeItem('skyluxse_session');
      localStorage.removeItem('skyluxse_auth_token');

      // Clear any other application-specific data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('skyluxse_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Show success message
      this.showLogoutSuccess();

      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error during logout:', error);
      this.showLogoutError();
    }
  }

  showLogoutLoading() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.innerHTML = `
        <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Выход...
      `;
      logoutButton.disabled = true;
    }
  }

  showLogoutSuccess() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Выполнено
      `;
      logoutButton.classList.add('text-green-600');
    }
  }

  showLogoutError() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Ошибка
      `;
      logoutButton.disabled = false;
      
      // Reset after delay
      setTimeout(() => {
        this.resetLogoutButton();
      }, 2000);
    }
  }

  resetLogoutButton() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
        </svg>
        Выйти из системы
      `;
      logoutButton.disabled = false;
      logoutButton.classList.remove('text-green-600');
    }
  }

  handleProfileSettings() {
    // Close menu first
    this.closeMenu();
    
    // Here you would typically open a settings modal or navigate to settings page
    console.log('Profile settings clicked');
    
    // For now, show a simple alert - in a real app this would open settings
    alert('Настройки профиля будут доступны в следующей версии.');
  }
}

/**
 * Sidebar Management Class
 */
class SidebarManager {
  constructor() {
    this.isCollapsed = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.initializeSidebar();
  }

  bindEvents() {
    const sidebarCollapse = document.getElementById('sidebar-collapse');
    const sidebarClose = document.getElementById('sidebar-close');
    const burgerMenu = document.getElementById('burger-menu');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (sidebarCollapse) {
      sidebarCollapse.addEventListener('click', () => this.toggleCollapse());
    }

    if (sidebarClose) {
      sidebarClose.addEventListener('click', () => this.closeSidebar());
    }

    if (burgerMenu) {
      burgerMenu.addEventListener('click', () => this.openSidebar());
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => this.closeSidebar());
    }

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSidebar();
      }
    });
  }

  initializeSidebar() {
    // Check if sidebar is collapsed on load
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth >= 768) {
      this.isCollapsed = sidebar.classList.contains('sidebar-collapsed');
      this.updateCollapseButton();
    }
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    const sidebar = document.getElementById('sidebar');
    
    if (sidebar) {
      sidebar.classList.toggle('sidebar-collapsed', this.isCollapsed);
      this.updateCollapseButton();
      
      // Save preference
      localStorage.setItem('skyluxse_sidebar_collapsed', this.isCollapsed);
    }
  }

  updateCollapseButton() {
    const collapseBtn = document.getElementById('sidebar-collapse');
    if (collapseBtn) {
      if (this.isCollapsed) {
        collapseBtn.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        `;
        collapseBtn.setAttribute('title', 'Развернуть панель');
      } else {
        collapseBtn.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        `;
        collapseBtn.setAttribute('title', 'Свернуть панель');
      }
    }
  }

  openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
    }
    
    if (sidebarOverlay) {
      sidebarOverlay.classList.remove('hidden');
    }
  }

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && window.innerWidth < 768) {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
    }
    
    if (sidebarOverlay) {
      sidebarOverlay.classList.add('hidden');
    }
  }
}

// Initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 [Sidebar] Initializing sidebar components...');
  
  // Initialize profile menu
  window.profileMenu = new ProfileMenu();
  
  // Initialize sidebar manager
  window.sidebarManager = new SidebarManager();
  
  // Load saved sidebar state
  const savedCollapsed = localStorage.getItem('skyluxse_sidebar_collapsed');
  if (savedCollapsed === 'true' && window.sidebarManager) {
    window.sidebarManager.isCollapsed = true;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.add('sidebar-collapsed');
      window.sidebarManager.updateCollapseButton();
    }
  }
  
  console.log('✅ [Sidebar] Sidebar components initialized successfully');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProfileMenu, SidebarManager };
}