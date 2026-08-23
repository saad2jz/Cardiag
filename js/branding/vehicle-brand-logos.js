// Source unique des logos constructeur affichés dans l'identification et le PDF.
// Les PNG proviennent du catalogue car-logos-dataset et sont conservés tels quels :
// aucune recoloration, aucun filtre CSS et aucune conversion de couleur.
// Ils sont servis localement afin de préserver le fonctionnement hors-ligne.
export const OFFICIAL_LOGOS = new Map([
  ['abarth', 'assets/vehicle-brands/abarth.png'],
  ['acura', 'assets/vehicle-brands/acura.png'],
  ['aiways', 'assets/vehicle-brands/aiways.png'],
  ['alfa romeo', 'assets/vehicle-brands/alfa-romeo.png'],
  ['alpine', 'assets/vehicle-brands/alpine.png'],
  ['alpina', 'assets/vehicle-brands/alpina.png'],
  ['aston martin', 'assets/vehicle-brands/aston-martin.png'],
  ['audi', 'assets/vehicle-brands/audi.png'],
  ['bentley', 'assets/vehicle-brands/bentley.png'],
  ['bmw', 'assets/vehicle-brands/bmw.png'],
  ['bugatti', 'assets/vehicle-brands/bugatti.png'],
  ['buick', 'assets/vehicle-brands/buick.png'],
  ['byd', 'assets/vehicle-brands/byd.png'],
  ['cadillac', 'assets/vehicle-brands/cadillac.png'],
  ['chevrolet', 'assets/vehicle-brands/chevrolet.png'],
  ['chery', 'assets/vehicle-brands/chery.png'],
  ['chrysler', 'assets/vehicle-brands/chrysler.png'],
  ['citroen', 'assets/vehicle-brands/citroen.png'],
  ['cupra', 'assets/vehicle-brands/cupra.png'],
  ['dacia', 'assets/vehicle-brands/dacia.png'],
  ['daihatsu', 'assets/vehicle-brands/daihatsu.png'],
  ['de tomaso', 'assets/vehicle-brands/de-tomaso.png'],
  ['donkervoort', 'assets/vehicle-brands/donkervoort.png'],
  ['dodge', 'assets/vehicle-brands/dodge.png'],
  ['ds automobiles', 'assets/vehicle-brands/ds.png'],
  ['faraday future', 'assets/vehicle-brands/faraday-future.png'],
  ['ferrari', 'assets/vehicle-brands/ferrari.png'],
  ['fiat', 'assets/vehicle-brands/fiat.png'],
  ['fisker', 'assets/vehicle-brands/fisker.png'],
  ['ford', 'assets/vehicle-brands/ford.png'],
  ['geely', 'assets/vehicle-brands/geely.png'],
  ['genesis', 'assets/vehicle-brands/genesis.png'],
  ['gmc', 'assets/vehicle-brands/gmc.png'],
  ['hennessey', 'assets/vehicle-brands/hennessey.png'],
  ['honda', 'assets/vehicle-brands/honda.png'],
  ['hyundai', 'assets/vehicle-brands/hyundai.png'],
  ['infiniti', 'assets/vehicle-brands/infiniti.png'],
  ['isuzu', 'assets/vehicle-brands/isuzu.png'],
  ['iveco', 'assets/vehicle-brands/iveco.png'],
  ['jaguar', 'assets/vehicle-brands/jaguar.png'],
  ['jeep', 'assets/vehicle-brands/jeep.png'],
  ['kia', 'assets/vehicle-brands/kia.png'],
  ['koenigsegg', 'assets/vehicle-brands/koenigsegg.png'],
  ['lamborghini', 'assets/vehicle-brands/lamborghini.png'],
  ['land rover', 'assets/vehicle-brands/land-rover.png'],
  ['leapmotor', 'assets/vehicle-brands/leapmotor.png'],
  ['lexus', 'assets/vehicle-brands/lexus.png'],
  ['lincoln', 'assets/vehicle-brands/lincoln.png'],
  ['lotus', 'assets/vehicle-brands/lotus.png'],
  ['lucid', 'assets/vehicle-brands/lucid.png'],
  ['mahindra', 'assets/vehicle-brands/mahindra.png'],
  ['maserati', 'assets/vehicle-brands/maserati.png'],
  ['maybach', 'assets/vehicle-brands/maybach.png'],
  ['mazda', 'assets/vehicle-brands/mazda.png'],
  ['mclaren', 'assets/vehicle-brands/mclaren.png'],
  ['mercedes benz', 'assets/vehicle-brands/mercedes-benz.png'],
  ['mini', 'assets/vehicle-brands/mini.png'],
  ['mitsubishi', 'assets/vehicle-brands/mitsubishi.png'],
  ['morgan', 'assets/vehicle-brands/morgan.png'],
  ['nissan', 'assets/vehicle-brands/nissan.png'],
  ['nio', 'assets/vehicle-brands/nio.png'],
  ['opel', 'assets/vehicle-brands/opel.png'],
  ['pagani', 'assets/vehicle-brands/pagani.png'],
  ['peugeot', 'assets/vehicle-brands/peugeot.png'],
  ['polestar', 'assets/vehicle-brands/polestar.png'],
  ['porsche', 'assets/vehicle-brands/porsche.png'],
  ['ram', 'assets/vehicle-brands/ram.png'],
  ['renault', 'assets/vehicle-brands/renault.png'],
  ['rimac', 'assets/vehicle-brands/rimac.png'],
  ['rivian', 'assets/vehicle-brands/rivian.png'],
  ['rolls royce', 'assets/vehicle-brands/rolls-royce.png'],
  ['saleen', 'assets/vehicle-brands/saleen.png'],
  ['seat', 'assets/vehicle-brands/seat.png'],
  ['skoda', 'assets/vehicle-brands/skoda.png'],
  ['ssangyong', 'assets/vehicle-brands/ssangyong.png'],
  ['subaru', 'assets/vehicle-brands/subaru.png'],
  ['suzuki', 'assets/vehicle-brands/suzuki.png'],
  ['tesla', 'assets/vehicle-brands/tesla.png'],
  ['toyota', 'assets/vehicle-brands/toyota.png'],
  ['tvr', 'assets/vehicle-brands/tvr.png'],
  ['vauxhall', 'assets/vehicle-brands/vauxhall.png'],
  ['vinfast', 'assets/vehicle-brands/vinfast.png'],
  ['volkswagen', 'assets/vehicle-brands/volkswagen.png'],
  ['volvo', 'assets/vehicle-brands/volvo.png'],
  ['wiesmann', 'assets/vehicle-brands/wiesmann.png'],
  ['xpeng', 'assets/vehicle-brands/xpeng.png'],
  ['zeekr', 'assets/vehicle-brands/zeekr.png'],
]);

const BRAND_ALIASES = new Map([
  ['bmw alpina', 'bmw'],
  ['ford usa', 'ford'],
  ['mercedes', 'mercedes benz'],
  ['mercedesbenz', 'mercedes benz'],
  ['mini cooper', 'mini'],
  ['ds', 'ds automobiles'],
  ['vw', 'volkswagen'],
  ['ram trucks', 'ram'],
  ['lucid motors', 'lucid'],
  ['ssang yong', 'ssangyong'],
  ['kgm', 'ssangyong'],
  ['opel vauxhall', 'opel'],
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

// jsPDF ne gère pas uniformément les SVG. Les logos de ce catalogue sont des
// PNG natifs : ils sont donc intégrés dans le PDF sans modifier leurs couleurs.
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
