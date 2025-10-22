import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функция для загрузки изображения
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${filename}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filename, () => {}); // Удаляем файл при ошибке
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Список изображений автомобилей с сайта Sky Luxse
const carImages = [
  {
    url: 'https://skyluxse.ae/wp-content/uploads/2024/01/ferrari-488-spider-red.jpg',
    filename: 'ferrari-488-spider.jpg',
    brand: 'Ferrari',
    model: '488 Spider'
  },
  {
    url: 'https://skyluxse.ae/wp-content/uploads/2024/01/lamborghini-huracan-yellow.jpg',
    filename: 'lamborghini-huracan.jpg',
    brand: 'Lamborghini',
    model: 'Huracan'
  },
  {
    url: 'https://skyluxse.ae/wp-content/uploads/2024/01/rolls-royce-ghost-white.jpg',
    filename: 'rolls-royce-ghost.jpg',
    brand: 'Rolls-Royce',
    model: 'Ghost'
  },
  {
    url: 'https://skyluxse.ae/wp-content/uploads/2024/01/bentley-continental-gt-blue.jpg',
    filename: 'bentley-continental.jpg',
    brand: 'Bentley',
    model: 'Continental GT'
  },
  {
    url: 'https://skyluxse.ae/wp-content/uploads/2024/01/mercedes-g63-amg-black.jpg',
    filename: 'mercedes-g-class.jpg',
    brand: 'Mercedes-Benz',
    model: 'G63 AMG'
  },
  {
    url: 'https://skyluxse.ae/wp-content/uploads/2024/01/porsche-911-turbo-s-silver.jpg',
    filename: 'porsche-911-turbo.jpg',
    brand: 'Porsche',
    model: '911 Turbo S'
  },
  {
    url: 'https://skyluxse.ae/wp-content/uploads/2024/01/bmw-x7-m50i-white.jpg',
    filename: 'bmw-x7.jpg',
    brand: 'BMW',
    model: 'X7 M50i'
  },
  {
    url: 'https://skyluxse.ae/wp-content/uploads/2024/01/audi-rs6-avant-black.jpg',
    filename: 'audi-rs6.jpg',
    brand: 'Audi',
    model: 'RS6 Avant'
  },
  {
    url: 'https://skyluxse.ae/wp-content/uploads/2024/01/mclaren-720s-orange.jpg',
    filename: 'mclaren-720s.jpg',
    brand: 'McLaren',
    model: '720S'
  },
  {
    url: 'https://skyluxse.ae/wp-content/uploads/2024/01/range-rover-vogue-grey.jpg',
    filename: 'range-rover-vogue.jpg',
    brand: 'Land Rover',
    model: 'Range Rover Vogue'
  }
];

async function downloadAllImages() {
  const imagesDir = path.join(__dirname, '..', 'public', 'images');
  
  // Создаем папку если её нет
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  console.log('🚀 Начинаю загрузку изображений автомобилей...');
  
  for (const car of carImages) {
    const filePath = path.join(imagesDir, car.filename);
    
    try {
      await downloadImage(car.url, filePath);
      console.log(`📸 ${car.brand} ${car.model} - загружен`);
    } catch (error) {
      console.error(`❌ Ошибка загрузки ${car.brand} ${car.model}:`, error.message);
    }
  }
  
  console.log('✨ Загрузка завершена!');
  
  // Создаем JSON файл с информацией об автомобилях
  const carsData = carImages.map(car => ({
    brand: car.brand,
    model: car.model,
    image: `/images/${car.filename}`,
    filename: car.filename
  }));
  
  const dataPath = path.join(__dirname, '..', 'src', 'data', 'cars.json');
  fs.writeFileSync(dataPath, JSON.stringify(carsData, null, 2));
  console.log('📄 Создан файл с данными автомобилей: src/data/cars.json');
}

// Запускаем загрузку
downloadAllImages().catch(console.error);