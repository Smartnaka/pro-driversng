export const AVATAR_PRESETS = [
  {
    label: 'Portrait 1',
    url: '/src/assets/images/driver_chinedu_okafor_1795309128141.jpg',
  },
  {
    label: 'Portrait 2',
    url: '/src/assets/images/driver_amaka_nwosu_1795309128080.jpg',
  },
  {
    label: 'Portrait 3',
    url: '/src/assets/images/driver_tunde_balogun_1795309128396.jpg',
  },
  {
    label: 'Portrait 4',
    url: '/src/assets/images/driver_ibrahim_musa_1795309128443.jpg',
  },
];

export const FLEET_PHOTO_PRESETS = [
  {
    label: 'Luxury SUV (Range Rover)',
    url: '/src/assets/images/vehicle_luxury_suv_1795309127017.jpg',
  },
  {
    label: 'Executive Sedan (Mercedes E-Class)',
    url: '/src/assets/images/vehicle_exec_sedan_1795309126661.jpg',
  },
  {
    label: 'Economy Sedan (Toyota Corolla)',
    url: '/src/assets/images/vehicle_economy_compact_1795309127763.jpg',
  },
  {
    label: 'Executive Van / Shuttle',
    url: '/src/assets/images/vehicle_executive_van_1795309127419.jpg',
  },
];

export async function readImageFileAsDataUrl(file: File, maxSide = 960): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
    throw new Error('Please choose a PNG, JPEG, or WEBP image.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected image.'));
    reader.readAsDataURL(file);
  });

  if (rawDataUrl.length <= 500_000) {
    return rawDataUrl;
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Unable to process image file.'));
    el.src = rawDataUrl;
  });

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Image compression unavailable in this browser.');
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const compressed = canvas.toDataURL('image/jpeg', 0.82);
  if (compressed.length > 850_000) {
    throw new Error('Image is still too large after compression. Please select a smaller photo.');
  }
  return compressed;
}

export async function readDocumentFileAsDataUrl(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    if (file.size > 600_000) {
      throw new Error('PDF documents must be under 600KB.');
    }
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read PDF file.'));
      reader.readAsDataURL(file);
    });
  }
  return readImageFileAsDataUrl(file, 1280);
}
