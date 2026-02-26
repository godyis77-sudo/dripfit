import { useState } from 'react';
import { Camera, X } from 'lucide-react';
import { motion } from 'framer-motion';
import AvatarUploadSheet from '@/components/profile/AvatarUploadSheet';

interface ProfilePhotoPromptProps {
  userId: string;
  onDismiss: () => void;
  onUploaded: (url: string) => void;
}

const ProfilePhotoPrompt = ({ userId, onDismiss, onUploaded }: ProfilePhotoPromptProps) => {
  const [showSheet, setShowSheet] = useState(false);

  const handleDismiss = () => {
    localStorage.setItem('profile_photo_prompted', 'true');
    onDismiss();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="bg-card border border-primary/20 rounded-xl p-3 mb-3"
      >
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Camera className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-foreground mb-0.5">Add a profile photo</p>
            <p className="text-[10px] text-muted-foreground mb-2">Personalize your Fit Check posts with a profile pic.</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSheet(true)}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform"
              >
                Add Photo
              </button>
              <button onClick={handleDismiss} className="text-[10px] text-muted-foreground">
                Skip
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground/50 p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
      <AvatarUploadSheet
        open={showSheet}
        onOpenChange={setShowSheet}
        userId={userId}
        onUploaded={(url) => {
          handleDismiss();
          onUploaded(url);
        }}
      />
    </>
  );
};

export default ProfilePhotoPrompt;
