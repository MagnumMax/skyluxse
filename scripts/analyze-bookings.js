import puppeteer from 'puppeteer';
import fs from 'fs';

async function analyzeBookingsPage() {
  const port = process.env.PORT || '6767';
  let browser;
  try {
    // Создание директории для скриншотов
    fs.mkdirSync('screenshots', { recursive: true });

    // 1. Запуск браузера в headless режиме
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // 2. Переход на главную страницу http://localhost:6767 (по умолчанию)
    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle2' });

    // 3. Выполнение авторизации как Sales manager
    // Выбор роли "sales"
    await page.select('#login-role', 'sales');
    // Ввод email (предполагаем стандартный для sales manager)
    await page.type('#login-email', 'sales@skyluxse.ae');
    // Нажатие кнопки входа
    await page.click('button[type="submit"]');
    // Ожидание перенаправления после авторизации
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 4. Переход на /bookings после авторизации
    await page.goto(`http://localhost:${port}/bookings`, { waitUntil: 'networkidle2' });

    // 5. Ожидание полной загрузки страницы
    await page.waitForSelector('body', { timeout: 10000 });

    // 6. Создание скриншота страницы бронирований
    await page.screenshot({ path: 'screenshots/bookings-page.png' });

    // 7. Извлечение и анализ ключевых элементов
    const analysis = await page.evaluate(() => {
      const result = {
        pageTitle: document.title,
        hasForms: document.querySelectorAll('form').length > 0,
        buttonsCount: document.querySelectorAll('button').length,
        hasTables: document.querySelectorAll('table').length > 0,
        bookingsList: [],
        errors: [],
        messages: [],
        screenshotPath: 'screenshots/bookings-page.png'
      };

      // Поиск списков бронирований (предполагаем, что они в ul, ol или div с классом содержащим 'booking')
      const bookingElements = document.querySelectorAll('ul, ol, div[class*="booking"], div[class*="list"]');
      bookingElements.forEach(el => {
        if (el.children.length > 0) {
          result.bookingsList.push({
            type: el.tagName.toLowerCase(),
            className: el.className,
            itemsCount: el.children.length
          });
        }
      });

      // Поиск ошибок (элементы с классами error, alert, danger)
      const errorElements = document.querySelectorAll('[class*="error"], [class*="alert"], [class*="danger"]');
      errorElements.forEach(el => {
        result.errors.push({
          text: el.textContent.trim(),
          className: el.className
        });
      });

      // Поиск сообщений (элементы с классами message, notification, success)
      const messageElements = document.querySelectorAll('[class*="message"], [class*="notification"], [class*="success"]');
      messageElements.forEach(el => {
        result.messages.push({
          text: el.textContent.trim(),
          className: el.className
        });
      });

      return result;
    });

    // 8. Вывод результатов анализа в консоль в JSON формате
    console.log(JSON.stringify(analysis, null, 2));

  } catch (error) {
    console.error('Ошибка при анализе страницы:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Запуск анализа
analyzeBookingsPage();
