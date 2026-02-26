import { useState } from 'react';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvatarUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onUploaded: (url: string) => void;
}

const AvatarUploadSheet = ({ open, onOpenChange, userId, onUploaded }: AvatarUploadSheetProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/profile.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', userId);
      onUploaded(publicUrl);
      toast({ title: 'Profile photo updated!' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const openPicker = (capture?: boolean) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.capture = 'user';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl bg-card border-border pb-8">
        <SheetHeader>
          <SheetTitle className="text-foreground text-[15px]">Profile Photo</SheetTitle>
        </SheetHeader>
        {uploading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => openPicker(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-border active:scale-[0.98] transition-transform"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Camera className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-bold text-foreground">Take Photo</p>
                <p className="text-[10px] text-muted-foreground">Use your camera</p>
              </div>
            </button>
            <button
              onClick={() => openPicker(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-border active:scale-[0.98] transition-transform"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-bold text-foreground">Choose from Gallery</p>
                <p className="text-[10px] text-muted-foreground">Pick an existing photo</p>
              </div>
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AvatarUploadSheet;
