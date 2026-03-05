export const SHARE_PREF_KEY = 'drip_default_share_preference';
export const SHARE_PREF_TS_KEY = 'drip_default_share_preference_ts';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function getDefaultSharePreference(): boolean {
  const saved = localStorage.getItem(SHARE_PREF_KEY);
  if (saved === null) return true;
  const ts = localStorage.getItem(SHARE_PREF_TS_KEY);
  if (ts && Date.now() - Number(ts) > SEVEN_DAYS_MS) return true;
  return saved === 'true';
}

export function saveSharePreference(value: boolean) {
  localStorage.setItem(SHARE_PREF_KEY, String(value));
  localStorage.setItem(SHARE_PREF_TS_KEY, String(Date.now()));
}

export const CATEGORIES = [
  { key: 'activewear', label: 'Activewear' },
  { key: 'bags', label: 'Bags' },
  { key: 'belts', label: 'Belts' },
  { key: 'blazers', label: 'Blazers' },
  { key: 'boots', label: 'Boots' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'coats', label: 'Coats' },
  { key: 'dress', label: 'Dress' },
  { key: 'full', label: 'Full Look' },
  { key: 'hats', label: 'Hats' },
  { key: 'heels', label: 'Heels' },
  { key: 'hoodies', label: 'Hoodies' },
  { key: 'jackets', label: 'Jackets' },
  { key: 'jeans', label: 'Jeans' },
  { key: 'jewelry', label: 'Jewelry' },
  { key: 'jumpsuits', label: 'Jumpsuits' },
  { key: 'leggings', label: 'Leggings' },
  { key: 'loafers', label: 'Loafers' },
  { key: 'loungewear', label: 'Loungewear' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'pants', label: 'Pants' },
  { key: 'polos', label: 'Polos' },
  { key: 'sandals', label: 'Sandals' },
  { key: 'scarves', label: 'Scarves' },
  { key: 'shirts', label: 'Shirts' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'shorts', label: 'Shorts' },
  { key: 'skirts', label: 'Skirts' },
  { key: 'sneakers', label: 'Sneakers' },
  { key: 'sunglasses', label: 'Sunglasses' },
  { key: 'sweaters', label: 'Sweaters' },
  { key: 'swimwear', label: 'Swimwear' },
  { key: 't-shirts', label: 'T-Shirts' },
  { key: 'top', label: 'Top' },
  { key: 'underwear', label: 'Underwear' },
  { key: 'vests', label: 'Vests' },
] as const;

export const ACCESSORY_CATEGORIES = [
  { key: 'shoes', label: '👟 Shoes', icon: '👟' },
  { key: 'hats', label: '🧢 Hats', icon: '🧢' },
  { key: 'necklace', label: '📿 Necklace', icon: '📿' },
  { key: 'earrings', label: '✨ Earrings', icon: '✨' },
  { key: 'bracelet', label: '⌚ Bracelet', icon: '⌚' },
  { key: 'watch', label: '⌚ Watch', icon: '⌚' },
  { key: 'jewelry', label: '💎 Jewelry', icon: '💎' },
  { key: 'bags', label: '👜 Bags', icon: '👜' },
  { key: 'sunglasses', label: '🕶️ Sunglasses', icon: '🕶️' },
] as const;

export const ALL_PRODUCT_CATEGORIES = [
  { key: 'activewear', label: '🏃 Activewear' },
  { key: 'bags', label: '👜 Bags' },
  { key: 'belts', label: '👔 Belts' },
  { key: 'blazers', label: '🤵 Blazers' },
  { key: 'boots', label: '🥾 Boots' },
  { key: 'bottoms', label: '👖 Bottoms' },
  { key: 'coats', label: '🧥 Coats' },
  { key: 'dresses', label: '👗 Dresses' },
  { key: 'hats', label: '🧢 Hats' },
  { key: 'heels', label: '👠 Heels' },
  { key: 'hoodies', label: '🧥 Hoodies' },
  { key: 'jackets', label: '🧥 Jackets' },
  { key: 'jeans', label: '👖 Jeans' },
  { key: 'jewelry', label: '💎 Jewelry' },
  { key: 'jumpsuits', label: '🩱 Jumpsuits' },
  { key: 'leggings', label: '🦵 Leggings' },
  { key: 'loafers', label: '👞 Loafers' },
  { key: 'loungewear', label: '🛋️ Loungewear' },
  { key: 'outerwear', label: '🧥 Outerwear' },
  { key: 'pants', label: '👖 Pants' },
  { key: 'polos', label: '👕 Polos' },
  { key: 'sandals', label: '🩴 Sandals' },
  { key: 'scarves', label: '🧣 Scarves' },
  { key: 'shirts', label: '👔 Shirts' },
  { key: 'shoes', label: '👟 Shoes' },
  { key: 'shorts', label: '🩳 Shorts' },
  { key: 'skirts', label: '👗 Skirts' },
  { key: 'sneakers', label: '👟 Sneakers' },
  { key: 'sunglasses', label: '🕶️ Sunglasses' },
  { key: 'sweaters', label: '🧶 Sweaters' },
  { key: 'swimwear', label: '🏊 Swimwear' },
  { key: 't-shirts', label: '👕 T-Shirts' },
  { key: 'tops', label: '👕 Tops' },
  { key: 'underwear', label: '🩲 Underwear' },
  { key: 'vests', label: '🦺 Vests' },
] as const;

const CAPTION_SUGGESTIONS: Record<string, string[]> = {
  outerwear: ['Spring wardrobe essential?', 'Office ready?', 'Worth the price?'],
  formal: ['Spring wardrobe essential?', 'Office ready?', 'Worth the price?'],
  dress: ['Spring wardrobe essential?', 'Office ready?', 'Worth the price?'],
  activewear: ['Gym or street?', 'Too loud for the gym?', 'Would you wear this out?'],
  top: ['Date night fit?', 'Too casual for work?', 'Should I buy this?'],
  casual: ['Date night fit?', 'Too casual for work?', 'Should I buy this?'],
  bottom: ['Date night fit?', 'Too casual for work?', 'Should I buy this?'],
  shoes: ['Statement or subtle?', 'Go with anything?', 'Worth it?'],
  default: ['Should I buy this for work?', 'Date night — yes or no?', 'Too bold?'],
};

export function getCaptionSuggestions(category: string): string[] {
  return CAPTION_SUGGESTIONS[category] || CAPTION_SUGGESTIONS.default;
}

export const FREE_MONTHLY_LIMIT = 3;

export function getMonthlyTryOnCount(): number {
  const now = new Date();
  const key = `drip_tryons_${now.getFullYear()}_${now.getMonth()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

export function incrementTryOnCount() {
  const now = new Date();
  const key = `drip_tryons_${now.getFullYear()}_${now.getMonth()}`;
  localStorage.setItem(key, String(getMonthlyTryOnCount() + 1));
}

export function imageUrlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function compressImage(file: File, maxDim = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Failed to load image')); };
    img.src = URL.createObjectURL(file);
  });
}
