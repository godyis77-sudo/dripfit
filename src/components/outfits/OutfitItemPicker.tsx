import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { WardrobeItem } from '@/pages/OutfitBuilder';

type Slot = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessories';

interface OutfitItemPickerProps {
  slot: Slot;
  wardrobeItems: WardrobeItem[];
  mapCategoryToSlot: (category: string) => Slot;
  onSelect: (item: WardrobeItem) => void;
  onClose: () => void;
}

const SLOT_TITLES: Record<Slot, string> = {
  top: 'Pick a Top',
  bottom: 'Pick Bottoms',
  outerwear: 'Pick a Layer',
  shoes: 'Pick Shoes',
  accessories: 'Pick an Accessory',
};

export default function OutfitItemPicker({ slot, wardrobeItems, mapCategoryToSlot, onSelect, onClose }: OutfitItemPickerProps) {
  const filtered = useMemo(() => {
    // Show items matching the slot, plus all items as fallback
    const matched = wardrobeItems.filter(i => mapCategoryToSlot(i.category) === slot);
    return matched.length > 0 ? matched : wardrobeItems;
  }, [wardrobeItems, slot, mapCategoryToSlot]);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-bold text-foreground">{SLOT_TITLES[slot]}</h2>
        <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <X className="h-4 w-4 text-foreground" />
        </button>
      </div>
      <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 56px)' }}>
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No items in your wardrobe yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="rounded-xl overflow-hidden border border-border bg-card active:scale-[0.95] transition-transform"
              >
                <div className="aspect-[3/4]">
                  <img src={item.image_url} alt={item.category} className="w-full h-full object-cover object-top" />
                </div>
                <div className="p-1.5">
                  <p className="text-[10px] font-bold text-foreground truncate capitalize">{item.brand || item.category}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
