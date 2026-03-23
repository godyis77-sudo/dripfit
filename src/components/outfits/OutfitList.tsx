import { Button } from '@/components/ui/button';
import { Layers, Plus, Trash2, Pencil } from 'lucide-react';

interface OutfitListProps {
  outfits: any[];
  loading: boolean;
  wardrobeCount: number;
  onEdit: (outfit: any) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export default function OutfitList({ outfits, loading, wardrobeCount, onEdit, onDelete, onNew }: OutfitListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (outfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <Layers className="h-7 w-7 text-primary/60" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">No outfits yet</h2>
        <p className="text-sm text-muted-foreground max-w-[240px] mb-5">
          {wardrobeCount < 2
            ? 'Add at least 2 items to your wardrobe to start building outfits.'
            : 'Combine your wardrobe pieces into complete looks.'}
        </p>
        <Button className="btn-luxury gap-1.5" onClick={onNew} disabled={wardrobeCount < 2}>
          <Plus className="h-3.5 w-3.5" /> Build First Outfit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {outfits.map(outfit => {
        const items = outfit.items || [];
        const previewImages = items.slice(0, 4).map((i: any) => i.clothing_wardrobe?.image_url).filter(Boolean);
        return (
          <div key={outfit.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex gap-3">
              {/* Preview grid */}
              <div className="grid grid-cols-2 gap-0.5 w-20 h-20 rounded-lg overflow-hidden shrink-0">
                {previewImages.map((url: string, i: number) => (
                  <img key={i} src={url} alt="" className="w-full h-full object-cover" />
                ))}
                {previewImages.length < 4 && Array.from({ length: 4 - previewImages.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-muted" />
                ))}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{outfit.name}</p>
                <p className="text-[11px] text-muted-foreground">{items.length} pieces</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(outfit.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => onEdit(outfit)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-[11px] font-bold text-primary active:scale-95 transition-transform"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(outfit.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 text-[11px] font-bold text-destructive active:scale-95 transition-transform"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
