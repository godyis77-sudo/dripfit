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
  'farfetch': 'Farfetch',
  'ssense': 'SSENSE',
  'mrporter': 'Mr Porter',
  'net-a-porter': 'Net-a-Porter',
  'revolve': 'Revolve',
  'asos': 'ASOS',
  'uniqlo': 'Uniqlo',
  'nike': 'Nike',
  'adidas': 'Adidas',
  'amazon': 'Amazon',
  'fashionnova': 'Fashion Nova',
  'prettylittlething': 'PrettyLittleThing',
  'boohoo': 'Boohoo',
  'urbanoutfitters': 'Urban Outfitters',
  'forever21': 'Forever 21',
  'mango': 'Mango',
  'target': 'Target',
  'walmart': 'Walmart',
  'oldnavy': 'Old Navy',
  'bananarepublic': 'Banana Republic',
  'jcrew': 'J.Crew',
  'abercrombie': 'Abercrombie',
  'puma': 'Puma',
  'timex': 'Timex',
  'dior': 'Dior',
  'gucci': 'Gucci',
  'louisvuitton': 'Louis Vuitton',
  'chanel': 'Chanel',
  'prada': 'Prada',
  'burberry': 'Burberry',
  'balenciaga': 'Balenciaga',
  'ebay': 'eBay',
  'depop': 'Depop',
  'grailed': 'Grailed',
  'therealreal': 'The RealReal',
  'vestiaire': 'Vestiaire',
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
