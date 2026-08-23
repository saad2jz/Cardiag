// Source unique des logos constructeur affiches dans l'identification et le PDF.
// Les fichiers sont servis localement pour préserver le mode hors ligne et la vie privée.
export const OFFICIAL_LOGOS = new Map([
  ['audi', 'assets/vehicle-brands/audi.svg'],
  ['bmw', 'assets/vehicle-brands/bmw.svg'],
  ['chevrolet', 'assets/vehicle-brands/chevrolet.svg'],
  ['citroen', 'assets/vehicle-brands/citroen.svg'],
  ['dacia', 'assets/vehicle-brands/dacia.svg'],
  ['ds automobiles', 'assets/vehicle-brands/ds_automobiles.svg'],
  ['fiat', 'assets/vehicle-brands/fiat.svg'],
  ['ford', 'assets/vehicle-brands/ford.svg'],
  ['hyundai', 'assets/vehicle-brands/hyundai.svg'],
  ['honda', 'assets/vehicle-brands/honda.svg'],
  ['jeep', 'assets/vehicle-brands/jeep.svg'],
  ['kia', 'assets/vehicle-brands/kia.svg'],
  ['mazda', 'assets/vehicle-brands/mazda.svg'],
  ['mercedes benz', 'assets/vehicle-brands/mercedes_benz.svg'],
  ['mini', 'assets/vehicle-brands/mini.svg'],
  ['mitsubishi', 'assets/vehicle-brands/mitsubishi.png'],
  ['nissan', 'assets/vehicle-brands/nissan.svg'],
  ['opel', 'assets/vehicle-brands/opel.svg'],
  ['peugeot', 'assets/vehicle-brands/peugeot.svg'],
  ['porsche', 'assets/vehicle-brands/porsche.svg'],
  ['renault', 'assets/vehicle-brands/renault.svg'],
  ['seat', 'assets/vehicle-brands/seat.svg'],
  ['skoda', 'assets/vehicle-brands/skoda.svg'],
  ['subaru', 'assets/vehicle-brands/subaru.svg'],
  ['suzuki', 'assets/vehicle-brands/suzuki.png'],
  ['tesla', 'assets/vehicle-brands/tesla.png'],
  ['toyota', 'assets/vehicle-brands/toyota.svg'],
  ['volkswagen', 'assets/vehicle-brands/volkswagen.svg'],
  ['volvo', 'assets/vehicle-brands/volvo.svg'],
]);

const BRAND_ALIASES = new Map([
  ['bmw alpina', 'bmw'],
  ['ford usa', 'ford'],
  ['mercedes', 'mercedes benz'],
  ['mercedesbenz', 'mercedes benz'],
  ['mini cooper', 'mini'],
  ['ds', 'ds automobiles'],
  ['vw', 'volkswagen'],
]);

const dataUrlCache = new Map();

export function normalizeVehicleBrand(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return BRAND_ALIASES.get(normalized) || normalized;
}

export function getVehicleBrandLogoPath(brand) {
  return OFFICIAL_LOGOS.get(normalizeVehicleBrand(brand)) || '';
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Logo illisible'));
    reader.readAsDataURL(blob);
  });
}

function svgBlobToPngDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 320;
        const context = canvas.getContext('2d');
        const ratio = Math.min(560 / image.naturalWidth, 240 / image.naturalHeight);
        const width = image.naturalWidth * ratio;
        const height = image.naturalHeight * ratio;
        context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        resolve(canvas.toDataURL('image/png', 0.92));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Logo SVG illisible'));
    };
    image.src = objectUrl;
  });
}

// jsPDF ne gère pas uniformément les SVG. Le même fichier que celui du
// sélecteur est donc converti en PNG en mémoire, sans envoi vers un tiers.
export async function getVehicleBrandLogoDataUrl(brand) {
  const path = getVehicleBrandLogoPath(brand);
  if (!path || typeof fetch !== 'function' || typeof FileReader === 'undefined') return '';
  if (!dataUrlCache.has(path)) {
    dataUrlCache.set(path, fetch(path)
      .then((response) => {
        if (!response.ok) throw new Error(`Logo indisponible (${response.status})`);
        return response.blob();
      })
      .then((blob) => blob.type.includes('svg') ? svgBlobToPngDataUrl(blob) : readBlobAsDataUrl(blob))
      .catch(() => ''));
  }
  return dataUrlCache.get(path);
}
