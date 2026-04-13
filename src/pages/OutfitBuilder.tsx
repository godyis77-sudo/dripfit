import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2, Save, Layers, Shirt, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';
import OutfitCanvas from '@/components/outfits/OutfitCanvas';
import OutfitItemPicker from '@/components/outfits/OutfitItemPicker';
import OutfitList from '@/components/outfits/OutfitList';

const SLOTS = ['top', 'bottom', 'outerwear', 'shoes', 'accessories'] as const;
type Slot = typeof SLOTS[number];

export interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  brand: string | null;
  retailer: string | null;
  notes: string | null;
  product_link: string | null;
}

const OutfitBuilder = () => {
  usePageMeta({ title: 'Outfit Builder', description: 'Build outfits from your closet items.', path: '/outfits' });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'list' | 'build'>('list');
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [outfitName, setOutfitName] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<Slot, WardrobeItem | null>>({
    top: null, bottom: null, outerwear: null, shoes: null, accessories: null,
  });
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null);

  // Fetch wardrobe items
  const { data: wardrobeItems = [] } = useQuery({
    queryKey: ['wardrobe', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('clothing_wardrobe')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data || []) as WardrobeItem[];
    },
    enabled: !!user?.id,
  });

  // Fetch saved outfits
  const { data: outfits = [], isLoading: outfitsLoading } = useQuery({
    queryKey: ['outfits', user?.id],
    queryFn: async () => {
      const { data: outfitRows } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (!outfitRows?.length) return [];

      const ids = outfitRows.map(o => o.id);
      const { data: items } = await supabase
        .from('outfit_items')
        .select('*, clothing_wardrobe(*)')
        .in('outfit_id', ids);

      return outfitRows.map(o => ({
        ...o,
        items: (items || []).filter(i => i.outfit_id === o.id),
      }));
    },
    enabled: !!user?.id,
  });

  // Save outfit mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const filledSlots = Object.entries(selectedItems).filter(([, item]) => item !== null);
      if (filledSlots.length < 2) throw new Error('Add at least 2 items');

      let outfitId = editingOutfitId;

      if (outfitId) {
        await supabase.from('outfits').update({ name: outfitName || `Fit ${new Date().toLocaleDateString()}`, updated_at: new Date().toISOString() }).eq('id', outfitId);
        await supabase.from('outfit_items').delete().eq('outfit_id', outfitId);
      } else {
        const { data, error } = await supabase.from('outfits').insert({ user_id: user!.id, name: outfitName || `Fit ${new Date().toLocaleDateString()}` }).select('id').single();
        if (error) throw error;
        outfitId = data.id;
      }

      const rows = filledSlots.map(([slot, item], i) => ({
        outfit_id: outfitId!,
        wardrobe_item_id: item!.id,
        slot,
        sort_order: i,
      }));
      const { error: itemsError } = await supabase.from('outfit_items').insert(rows);
      if (itemsError) throw itemsError;

      return outfitId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      toast({ title: 'Outfit saved ✨' });
      trackEvent('outfit_saved');
      resetBuilder();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('outfits').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
      toast({ title: 'Outfit deleted' });
    },
  });

  const resetBuilder = useCallback(() => {
    setMode('list');
    setEditingOutfitId(null);
    setOutfitName('');
    setSelectedItems({ top: null, bottom: null, outerwear: null, shoes: null, accessories: null });
  }, []);

  const handleEditOutfit = useCallback((outfit: any) => {
    setEditingOutfitId(outfit.id);
    setOutfitName(outfit.name);
    const slots: Record<Slot, WardrobeItem | null> = { top: null, bottom: null, outerwear: null, shoes: null, accessories: null };
    outfit.items?.forEach((item: any) => {
      const slot = item.slot as Slot;
      if (SLOTS.includes(slot) && item.clothing_wardrobe) {
        slots[slot] = item.clothing_wardrobe as WardrobeItem;
      }
    });
    setSelectedItems(slots);
    setMode('build');
    trackEvent('outfit_edit_started');
  }, []);

  const mapCategoryToSlot = useCallback((category: string): Slot => {
    const c = category.toLowerCase();
    if (['top', 'shirt', 'tee', 't-shirt', 'blouse', 'sweater', 'hoodie', 'tank'].some(k => c.includes(k))) return 'top';
    if (['bottom', 'pant', 'jean', 'short', 'skirt', 'trouser'].some(k => c.includes(k))) return 'bottom';
    if (['jacket', 'coat', 'outerwear', 'blazer', 'vest'].some(k => c.includes(k))) return 'outerwear';
    if (['shoe', 'sneaker', 'boot', 'sandal', 'heel', 'footwear'].some(k => c.includes(k))) return 'shoes';
    if (['accessory', 'hat', 'bag', 'watch', 'jewelry', 'belt', 'scarf', 'sunglasses'].some(k => c.includes(k))) return 'accessories';
    return 'top';
  }, []);

  const filledCount = useMemo(() => Object.values(selectedItems).filter(Boolean).length, [selectedItems]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background px-4 py-4 flex items-center justify-center">
        <div className="text-center">
          <Layers className="h-10 w-10 text-primary/40 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Sign in to build outfits</h2>
          <p className="text-sm text-muted-foreground mb-4">Create outfits from your closet items.</p>
          <Button className="btn-luxury" onClick={() => navigate('/auth?returnTo=/outfits')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-safe-tab">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => mode === 'build' ? resetBuilder() : navigate(-1)} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground uppercase">
            {mode === 'build' ? (editingOutfitId ? 'Edit Outfit' : 'New Outfit') : 'Outfits'}
          </h1>
        </div>
        {mode === 'list' && (
          <Button
            size="sm"
            className="btn-luxury gap-1.5"
            onClick={() => {
              setMode('build');
              trackEvent('outfit_build_started');
            }}
            disabled={wardrobeItems.length < 2}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        )}
      </div>

      {mode === 'list' ? (
        <OutfitList
          outfits={outfits}
          loading={outfitsLoading}
          wardrobeCount={wardrobeItems.length}
          onEdit={handleEditOutfit}
          onDelete={(id) => deleteMutation.mutate(id)}
          onNew={() => { setMode('build'); trackEvent('outfit_build_started'); }}
        />
      ) : (
        <>
          {/* Outfit name */}
          <input
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            placeholder="Name this fit..."
            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm font-medium text-foreground placeholder:italic placeholder:text-[rgba(255,255,255,0.3)] mb-3 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />

          {/* Visual canvas */}
          <OutfitCanvas
            selectedItems={selectedItems}
            onSlotTap={(slot) => setPickerSlot(slot)}
            onRemoveSlot={(slot) => setSelectedItems(prev => ({ ...prev, [slot]: null }))}
          />

          {/* Save button */}
          <Button
            className="w-full h-11 btn-luxury gap-2 mt-3"
            disabled={filledCount < 2 || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Outfit'}
          </Button>
        </>
      )}

      {/* Item picker sheet */}
      <AnimatePresence>
        {pickerSlot && (
          <OutfitItemPicker
            slot={pickerSlot}
            wardrobeItems={wardrobeItems}
            mapCategoryToSlot={mapCategoryToSlot}
            onSelect={(item) => {
              setSelectedItems(prev => ({ ...prev, [pickerSlot]: item }));
              setPickerSlot(null);
            }}
            onClose={() => setPickerSlot(null)}
          />
        )}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  );
};

export default OutfitBuilder;
