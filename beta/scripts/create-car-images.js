import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функция для создания SVG изображения автомобиля
function createCarSVG(brand, model, color, type = 'sedan') {
  const svgTemplates = {
    sports: `
      <svg width="400" height="200" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="carGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${adjustColor(color, -30)};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        
        <!-- Car body -->
        <path d="M50 120 Q50 100 80 100 L320 100 Q350 100 350 120 L350 140 Q350 160 320 160 L80 160 Q50 160 50 140 Z" 
              fill="url(#carGradient)" filter="url(#shadow)"/>
        
        <!-- Windshield -->
        <path d="M90 100 Q90 80 120 80 L280 80 Q310 80 310 100" 
              fill="rgba(135,206,235,0.7)" stroke="${adjustColor(color, -50)}" stroke-width="2"/>
        
        <!-- Wheels -->
        <circle cx="100" cy="160" r="25" fill="#2c3e50" stroke="#34495e" stroke-width="3"/>
        <circle cx="300" cy="160" r="25" fill="#2c3e50" stroke="#34495e" stroke-width="3"/>
        <circle cx="100" cy="160" r="15" fill="#95a5a6"/>
        <circle cx="300" cy="160" r="15" fill="#95a5a6"/>
        
        <!-- Headlights -->
        <ellipse cx="340" cy="125" rx="8" ry="12" fill="#f1c40f"/>
        <ellipse cx="60" cy="125" rx="8" ry="12" fill="#e74c3c"/>
        
        <!-- Brand text -->
        <text x="200" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#2c3e50">${brand}</text>
        <text x="200" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#7f8c8d">${model}</text>
      </svg>
    `,
    
    suv: `
      <svg width="400" height="220" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="carGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${adjustColor(color, -30)};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        
        <!-- Car body -->
        <rect x="60" y="90" width="280" height="80" rx="10" ry="10" 
              fill="url(#carGradient)" filter="url(#shadow)"/>
        
        <!-- Roof -->
        <rect x="80" y="70" width="240" height="30" rx="5" ry="5" 
              fill="url(#carGradient)"/>
        
        <!-- Windows -->
        <rect x="90" y="75" width="220" height="20" rx="3" ry="3" 
              fill="rgba(135,206,235,0.7)" stroke="${adjustColor(color, -50)}" stroke-width="2"/>
        
        <!-- Wheels -->
        <circle cx="110" cy="180" r="30" fill="#2c3e50" stroke="#34495e" stroke-width="3"/>
        <circle cx="290" cy="180" r="30" fill="#2c3e50" stroke="#34495e" stroke-width="3"/>
        <circle cx="110" cy="180" r="18" fill="#95a5a6"/>
        <circle cx="290" cy="180" r="18" fill="#95a5a6"/>
        
        <!-- Headlights -->
        <rect x="330" y="110" width="12" height="20" rx="6" ry="6" fill="#f1c40f"/>
        <rect x="58" y="110" width="12" height="20" rx="6" ry="6" fill="#e74c3c"/>
        
        <!-- Brand text -->
        <text x="200" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#2c3e50">${brand}</text>
        <text x="200" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#7f8c8d">${model}</text>
      </svg>
    `,
    
    sedan: `
      <svg width="400" height="200" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="carGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${adjustColor(color, -30)};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="3" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        
        <!-- Car body -->
        <path d="M70 130 Q70 110 90 110 L310 110 Q330 110 330 130 L330 150 Q330 170 310 170 L90 170 Q70 170 70 150 Z" 
              fill="url(#carGradient)" filter="url(#shadow)"/>
        
        <!-- Roof -->
        <path d="M100 110 Q100 90 130 90 L270 90 Q300 90 300 110" 
              fill="url(#carGradient)"/>
        
        <!-- Windows -->
        <path d="M110 110 Q110 95 135 95 L265 95 Q290 95 290 110" 
              fill="rgba(135,206,235,0.7)" stroke="${adjustColor(color, -50)}" stroke-width="2"/>
        
        <!-- Wheels -->
        <circle cx="120" cy="170" r="25" fill="#2c3e50" stroke="#34495e" stroke-width="3"/>
        <circle cx="280" cy="170" r="25" fill="#2c3e50" stroke="#34495e" stroke-width="3"/>
        <circle cx="120" cy="170" r="15" fill="#95a5a6"/>
        <circle cx="280" cy="170" r="15" fill="#95a5a6"/>
        
        <!-- Headlights -->
        <ellipse cx="320" cy="135" rx="8" ry="12" fill="#f1c40f"/>
        <ellipse cx="80" cy="135" rx="8" ry="12" fill="#e74c3c"/>
        
        <!-- Brand text -->
        <text x="200" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#2c3e50">${brand}</text>
        <text x="200" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#7f8c8d">${model}</text>
      </svg>
    `
  };
  
  return svgTemplates[type] || svgTemplates.sedan;
}

// Функция для изменения яркости цвета
function adjustColor(color, amount) {
  const usePound = color[0] === '#';
  const col = usePound ? color.slice(1) : color;
  
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = (num >> 8 & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  
  return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

// Список автомобилей для создания
const carData = [
  {
    brand: 'Ferrari',
    model: '488 Spider',
    color: '#DC143C',
    type: 'sports',
    filename: 'ferrari-488-spider.svg'
  },
  {
    brand: 'Lamborghini',
    model: 'Huracan',
    color: '#FFD700',
    type: 'sports',
    filename: 'lamborghini-huracan.svg'
  },
  {
    brand: 'Rolls-Royce',
    model: 'Ghost',
    color: '#F8F8FF',
    type: 'sedan',
    filename: 'rolls-royce-ghost.svg'
  },
  {
    brand: 'Bentley',
    model: 'Continental GT',
    color: '#4169E1',
    type: 'sedan',
    filename: 'bentley-continental.svg'
  },
  {
    brand: 'Mercedes-Benz',
    model: 'G63 AMG',
    color: '#2F4F4F',
    type: 'suv',
    filename: 'mercedes-g-class.svg'
  },
  {
    brand: 'Porsche',
    model: '911 Turbo S',
    color: '#C0C0C0',
    type: 'sports',
    filename: 'porsche-911-turbo.svg'
  },
  {
    brand: 'BMW',
    model: 'X7 M50i',
    color: '#FFFFFF',
    type: 'suv',
    filename: 'bmw-x7.svg'
  },
  {
    brand: 'Audi',
    model: 'RS6 Avant',
    color: '#000000',
    type: 'sedan',
    filename: 'audi-rs6.svg'
  },
  {
    brand: 'McLaren',
    model: '720S',
    color: '#FF4500',
    type: 'sports',
    filename: 'mclaren-720s.svg'
  },
  {
    brand: 'Land Rover',
    model: 'Range Rover Vogue',
    color: '#708090',
    type: 'suv',
    filename: 'range-rover-vogue.svg'
  }
];

async function createAllCarImages() {
  const imagesDir = path.join(__dirname, '..', 'public', 'images');
  
  // Создаем папку если её нет
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  console.log('🎨 Создаю SVG изображения автомобилей...');
  
  for (const car of carData) {
    const svgContent = createCarSVG(car.brand, car.model, car.color, car.type);
    const filePath = path.join(imagesDir, car.filename);
    
    try {
      fs.writeFileSync(filePath, svgContent);
      console.log(`✅ Создан: ${car.brand} ${car.model} - ${car.filename}`);
    } catch (error) {
      console.error(`❌ Ошибка создания ${car.brand} ${car.model}:`, error.message);
    }
  }
  
  console.log('✨ Создание изображений завершено!');
  
  // Создаем JSON файл с информацией об автомобилях
  const carsDataForJson = carData.map(car => ({
    id: car.filename.replace('.svg', ''),
    brand: car.brand,
    model: car.model,
    image: `/images/${car.filename}`,
    type: car.type,
    color: car.color,
    pricePerDay: Math.floor(Math.random() * 2000) + 500, // Случайная цена от 500 до 2500 AED
    features: getCarFeatures(car.brand, car.type),
    available: true
  }));
  
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const dataPath = path.join(dataDir, 'cars.json');
  fs.writeFileSync(dataPath, JSON.stringify(carsDataForJson, null, 2));
  console.log('📄 Создан файл с данными автомобилей: src/data/cars.json');
}

// Функция для получения характеристик автомобиля
function getCarFeatures(brand, type) {
  const baseFeatures = ['GPS Navigation', 'Bluetooth', 'Air Conditioning'];
  
  const luxuryFeatures = ['Leather Seats', 'Premium Sound System', 'Sunroof'];
  const sportsFeatures = ['Sport Mode', 'Performance Tires', 'Racing Seats'];
  const suvFeatures = ['4WD', 'Roof Rails', 'Towing Package'];
  
  let features = [...baseFeatures];
  
  if (['Ferrari', 'Lamborghini', 'McLaren', 'Porsche'].includes(brand)) {
    features = [...features, ...sportsFeatures];
  }
  
  if (['Rolls-Royce', 'Bentley'].includes(brand)) {
    features = [...features, ...luxuryFeatures, 'Chauffeur Service', 'Premium Interior'];
  }
  
  if (type === 'suv') {
    features = [...features, ...suvFeatures];
  }
  
  return features;
}

// Запускаем создание изображений
createAllCarImages().catch(console.error);