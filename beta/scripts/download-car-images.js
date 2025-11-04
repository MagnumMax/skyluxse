import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { setTimeout } from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pexels API Access Key (получить мгновенно на https://www.pexels.com/api/)
const PEXELS_API_KEY = 'U3jgnMy3OjrqWD7Rd553mqcEHKj5fpl1pSws8FZYsN8HMHry2wdjYVio';

// Список автомобилей для поиска
const carList = [
  { brand: 'Ferrari', model: '488 Spider', searchQuery: 'Ferrari red sports car' },
  { brand: 'Lamborghini', model: 'Huracan', searchQuery: 'Lamborghini yellow supercar' },
  { brand: 'Rolls-Royce', model: 'Ghost', searchQuery: 'Rolls Royce luxury sedan' },
  { brand: 'Bentley', model: 'Continental GT', searchQuery: 'Bentley luxury coupe' },
  { brand: 'Mercedes-Benz', model: 'G63 AMG', searchQuery: 'Mercedes G-Class SUV' },
  { brand: 'Porsche', model: '911 Turbo S', searchQuery: 'Porsche 911 sports car' },
  { brand: 'BMW', model: 'X7 M50i', searchQuery: 'BMW X7 luxury SUV' },
  { brand: 'Audi', model: 'RS6 Avant', searchQuery: 'Audi RS6 wagon' },
  { brand: 'McLaren', model: '720S', searchQuery: 'McLaren orange supercar' },
  { brand: 'Land Rover', model: 'Range Rover Vogue', searchQuery: 'Range Rover luxury SUV' }
];

// Функция для поиска изображения через Pexels API
async function searchCarImage(query) {
  return new Promise((resolve, reject) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    
    const options = {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.photos && result.photos.length > 0) {
            resolve(result.photos[0].src.large);
          } else {
            reject(new Error(`No images found for query: ${query}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Функция для загрузки изображения
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Загружено: ${filename}`);
        resolve();
      });
      
      file.on('error', (error) => {
        fs.unlink(filename, () => {}); // Удаляем файл при ошибке
        reject(error);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Основная функция для загрузки всех изображений
async function downloadAllCarImages() {
  try {
    // Создаем папку для изображений
    const imagesDir = path.join(__dirname, '..', 'public', 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    console.log('🚗 Начинаю загрузку изображений автомобилей...');
    
    const carsData = [];
    
    for (const car of carList) {
      try {
        console.log(`🔍 Ищу изображение для ${car.brand} ${car.model}...`);
        
        // Поиск изображения через Unsplash API
        const imageUrl = await searchCarImage(car.searchQuery);
        
        // Создаем имя файла
        const filename = `${car.brand.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${car.model.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`;
        const filepath = path.join(imagesDir, filename);
        
        // Загружаем изображение
        await downloadImage(imageUrl, filepath);
        
        // Добавляем данные автомобиля
        carsData.push({
          id: `${car.brand.toLowerCase()}-${car.model.toLowerCase().replace(/\s+/g, '-')}`,
          brand: car.brand,
          model: car.model,
          imagePath: `/images/${filename}`,
          type: getCarType(car.brand, car.model),
          color: getRandomColor(),
          pricePerDay: getRandomPrice(),
          features: getCarFeatures(car.brand, car.model)
        });
        
        // Небольшая задержка между запросами
        await setTimeout(1000);
        
      } catch (error) {
        console.error(`❌ Ошибка при загрузке ${car.brand} ${car.model}:`, error.message);
        
        // Добавляем данные без изображения
        carsData.push({
          id: `${car.brand.toLowerCase()}-${car.model.toLowerCase().replace(/\s+/g, '-')}`,
          brand: car.brand,
          model: car.model,
          imagePath: '/images/placeholder-car.jpg',
          type: getCarType(car.brand, car.model),
          color: getRandomColor(),
          pricePerDay: getRandomPrice(),
          features: getCarFeatures(car.brand, car.model)
        });
      }
    }
    
    // Создаем JSON файл с данными автомобилей
    const dataDir = path.join(__dirname, '..', 'src', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const carsJsonPath = path.join(dataDir, 'cars.json');
    fs.writeFileSync(carsJsonPath, JSON.stringify(carsData, null, 2));
    
    console.log('✅ Все изображения загружены!');
    console.log(`📄 Создан файл: ${carsJsonPath}`);
    console.log(`📁 Изображения сохранены в: ${imagesDir}`);
    
  } catch (error) {
    console.error('❌ Ошибка при загрузке изображений:', error);
  }
}

// Вспомогательные функции
function getCarType(brand, model) {
  const sportsCarBrands = ['Ferrari', 'Lamborghini', 'McLaren', 'Porsche'];
  const suvBrands = ['Mercedes-Benz', 'BMW', 'Land Rover'];
  
  if (sportsCarBrands.includes(brand)) return 'sports';
  if (suvBrands.includes(brand) && (model.includes('G63') || model.includes('X7') || model.includes('Range'))) return 'suv';
  return 'sedan';
}

function getRandomColor() {
  const colors = ['Black', 'White', 'Silver', 'Red', 'Blue', 'Gray', 'Yellow', 'Orange'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomPrice() {
  return Math.floor(Math.random() * (2000 - 500 + 1)) + 500;
}

function getCarFeatures(brand, model) {
  const baseFeatures = ['GPS Navigation', 'Bluetooth', 'Air Conditioning', 'Leather Seats'];
  const luxuryFeatures = ['Massage Seats', 'Premium Sound System', 'Panoramic Roof', 'Adaptive Cruise Control'];
  
  // Добавляем специальные функции в зависимости от бренда и модели
  const specialFeatures = [];
  
  if (brand === 'Ferrari' || brand === 'Lamborghini' || brand === 'McLaren') {
    specialFeatures.push('Sport Mode', 'Carbon Fiber Interior');
  } else if (brand === 'Rolls-Royce' || brand === 'Bentley') {
    specialFeatures.push('Champagne Cooler', 'Starlight Headliner');
  } else if (model.includes('AMG') || model.includes('M50i') || model.includes('RS6')) {
    specialFeatures.push('Performance Package', 'Sport Exhaust');
  }
  
  return [...baseFeatures, ...luxuryFeatures.slice(0, 2), ...specialFeatures];
}

// Запуск скрипта
console.log('⚠️  ВНИМАНИЕ: Для работы скрипта нужно получить бесплатный API ключ от Pexels');
console.log('🔗 Зарегистрируйтесь на https://www.pexels.com/api/ (мгновенное получение ключа!)');
console.log('📝 Замените YOUR_PEXELS_API_KEY_HERE на ваш ключ');
console.log('');

if (PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY_HERE') {
  console.log('❌ Пожалуйста, установите ваш Pexels API ключ в переменную PEXELS_API_KEY');
  process.exit(1);
} else {
  downloadAllCarImages();
}