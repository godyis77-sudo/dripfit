import { Plus, X, Shirt, AlignJustify, Layers, Footprints, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import type { WardrobeItem } from '@/pages/OutfitBuilder';
import type { LucideIcon } from 'lucide-react';

const SLOTS = ['top', 'bottom', 'outerwear', 'shoes', 'accessories'] as const;
type Slot = typeof SLOTS[number];

const SLOT_LABELS: Record<Slot, { label: string; icon: LucideIcon }> = {
  top: { label: 'Top', icon: Shirt },
  bottom: { label: 'Bottom', icon: AlignJustify },
  outerwear: { label: 'Layer', icon: Layers },
  shoes: { label: 'Shoes', icon: Footprints },
  accessories: { label: 'Acc.', icon: ShoppingBag },
};

interface OutfitCanvasProps {
  selectedItems: Record<Slot, WardrobeItem | null>;
  onSlotTap: (slot: Slot) => void;
  onRemoveSlot: (slot: Slot) => void;
}

export default function OutfitCanvas({ selectedItems, onSlotTap, onRemoveSlot }: OutfitCanvasProps) {
  return (
    <div className="space-y-2">
      {/* Main slots: top + bottom side by side */}
      <div className="grid grid-cols-2 gap-2">
        {(['top', 'bottom'] as Slot[]).map(slot => (
          <SlotCard key={slot} slot={slot} item={selectedItems[slot]} onTap={() => onSlotTap(slot)} onRemove={() => onRemoveSlot(slot)} />
        ))}
      </div>
      {/* Secondary slots row */}
      <div className="grid grid-cols-3 gap-2">
        {(['outerwear', 'shoes', 'accessories'] as Slot[]).map(slot => (
          <SlotCard key={slot} slot={slot} item={selectedItems[slot]} onTap={() => onSlotTap(slot)} onRemove={() => onRemoveSlot(slot)} small />
        ))}
      </div>
    </div>
  );
}

function SlotCard({ slot, item, onTap, onRemove, small }: {
  slot: Slot;
  item: WardrobeItem | null;
  onTap: () => void;
  onRemove: () => void;
  small?: boolean;
}) {
  const meta = SLOT_LABELS[slot];

  if (item) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative rounded-xl overflow-hidden border border-border bg-card"
      >
        <button onClick={onTap} className="w-full active:scale-[0.97] transition-transform">
          <div className={`relative ${small ? 'aspect-square' : 'aspect-[3/4]'}`}>
            <img src={item.image_url} alt={item.category} className="w-full h-full object-cover object-top" />
          </div>
          <div className="p-1.5">
            <p className="text-[10px] font-bold text-foreground truncate capitalize">{item.brand || item.category}</p>
          </div>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center"
        >
          <X className="h-3 w-3 text-foreground" />
        </button>
      </motion.div>
    );
  }

  const SlotIcon = meta.icon;
  return (
    <button
      onClick={onTap}
      className={`rounded-xl border-2 border-dashed border-[hsl(var(--drip-gold)/0.2)] bg-card/50 flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition-transform ${small ? 'aspect-square' : 'aspect-[3/4]'}`}
    >
      <SlotIcon className="h-6 w-6 text-[hsl(var(--drip-gold)/0.5)]" />
      <span className="text-[10px] font-medium text-muted-foreground">{meta.label}</span>
      <Plus className="h-3.5 w-3.5 text-muted-foreground/50" />
    </button>
  );
}
