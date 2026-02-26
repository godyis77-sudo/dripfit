const RETAILERS: Record<string, string> = {
  'zara': 'Zara',
  'hm': 'H&M',
  'shein': 'SHEIN',
  'lululemon': 'Lululemon',
  'nordstrom': 'Nordstrom',
  'macys': "Macy's",
  'gap': 'Gap',
  'aritzia': 'Aritzia',
  'jcpenney': 'JCPenney',
  'simons': 'Simons',
};

export function detectRetailer(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const [key, label] of Object.entries(RETAILERS)) {
      if (hostname.includes(key)) return label;
    }
    return 'Shop';
  } catch {
    return null;
  }
}
