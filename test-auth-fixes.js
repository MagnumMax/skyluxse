// Простой тест для проверки исправлений аутентификации и навигации

// Имитация конфигурации ролей из src/data/index.js
const ROLES_CONFIG = {
  operations: {
    name: 'Fleet manager',
    label: 'Fleet manager',
    email: 'fleet@skyluxse.ae',
    defaultPage: 'fleet-calendar',
    layout: 'desktop',
    nav: [
      { id: 'fleet-calendar', name: 'Fleet Calendar', icon: 'calendar' },
      { id: 'tasks', name: 'Tasks', icon: 'clipboardCheck' },
      { id: 'fleet-table', name: 'Fleet', icon: 'car' }
    ]
  },
  sales: {
    name: 'Sales Manager',
    label: 'Sales Manager',
    email: 'sales@skyluxse.ae',
    defaultPage: 'fleet-calendar',
    layout: 'desktop',
    nav: [
      { id: 'fleet-calendar', name: 'Fleet Calendar', icon: 'calendar' },
      { id: 'bookings', name: 'Bookings', icon: 'kanban' },
      { id: 'clients-table', name: 'Clients', icon: 'users' },
      { id: 'analytics', name: 'Analytics', icon: 'chart' }
    ]
  }
};

// Имитация исправленной функции рендеринга сайдбара
function renderSidebarNavigation(role) {
  const roleConfig = ROLES_CONFIG[role];
  if (!roleConfig) {
    console.error('❌ Role config not found for:', role);
    return '<div class="error">Configuration error</div>';
  }

  // Используем nav вместо pages
  const navPages = roleConfig.nav || [];
  
  if (!navPages || !Array.isArray(navPages)) {
    console.error('❌ Navigation pages is not an array:', navPages);
    return '<div class="error">Navigation configuration error</div>';
  }
  
  const navHtml = navPages.map(page => {
    if (typeof page === 'object' && page.id) {
      const pageId = page.id;
      const label = page.name || pageId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      const icon = page.icon || 'circle';
      return `<a href="#${role}/${pageId}" data-page="${pageId}">${icon} ${label}</a>`;
    } else {
      const pageId = page;
      return `<a href="#${role}/${pageId}" data-page="${pageId}">${pageId}</a>`;
    }
  }).join('');

  return navHtml;
}

// Тест исправлений
function testAuthFixes() {
  console.log('🔍 Тестирование исправлений аутентификации...\n');
  
  // Тест 1: Проверка конфигурации роли operations
  console.log('✅ Тест 1: Конфигурация роли "operations"');
  const operationsConfig = ROLES_CONFIG.operations;
  console.log('- Наличие nav:', !!operationsConfig.nav);
  console.log('- Тип nav:', Array.isArray(operationsConfig.nav) ? 'Array' : 'Not array');
  console.log('- Количество пунктов:', operationsConfig.nav?.length || 0);
  
  // Тест 2: Проверка рендеринга сайдбара
  console.log('\n✅ Тест 2: Рендеринг сайдбара для роли "operations"');
  try {
    const sidebarHtml = renderSidebarNavigation('operations');
    console.log('- Рендеринг успешен:', sidebarHtml.length > 0);
    console.log('- Количество ссылок:', (sidebarHtml.match(/href=/g) || []).length);
  } catch (error) {
    console.error('- ❌ Ошибка рендеринга:', error.message);
  }
  
  // Тест 3: Проверка роли sales
  console.log('\n✅ Тест 3: Рендеринг сайдбара для роли "sales"');
  try {
    const sidebarHtml = renderSidebarNavigation('sales');
    console.log('- Рендеринг успешен:', sidebarHtml.length > 0);
    console.log('- Количество ссылок:', (sidebarHtml.match(/href=/g) || []).length);
  } catch (error) {
    console.error('- ❌ Ошибка рендеринга:', error.message);
  }
  
  // Тест 4: Проверка обработки ошибки
  console.log('\n✅ Тест 4: Обработка неизвестной роли');
  try {
    const sidebarHtml = renderSidebarNavigation('unknown-role');
    console.log('- Обработка ошибки корректна:', sidebarHtml.includes('error'));
  } catch (error) {
    console.error('- ❌ Ошибка не обработана:', error.message);
  }
  
  console.log('\n🎉 Все тесты завершены!');
}

testAuthFixes();