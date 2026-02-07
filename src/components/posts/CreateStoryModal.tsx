import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useCreateOptimizedStory } from '@/hooks/useOptimizedStories';
import { Camera, Upload, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { EffectsPicker } from './EffectsPicker';
import { LocationPicker } from './LocationPicker';
import { applyEffect } from '@/lib/effects';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CameraView = ({ onCapture, onClose }: { onCapture: (file: File) => void, onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stream: MediaStream;
    const openCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        alert('Tidak dapat mengakses kamera. Harap periksa izin dan coba lagi.');
        onClose();
      }
    };

    openCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onClose]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], 'story.jpg', { type: 'image/jpeg' });
            onCapture(file);
          }
        }, 'image/jpeg');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-black rounded-lg overflow-hidden relative">
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6">
        {/* Cancel Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white bg-black/40 hover:bg-black/60 rounded-full h-12 w-12 border border-white/20"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Capture Button */}
        <Button
          onClick={handleCapture}
          size="lg"
          className="rounded-full w-20 h-20 bg-white text-black hover:bg-gray-200 border-4 border-gray-300 ring-2 ring-white/50"
        >
          <Camera className="h-8 w-8" />
        </Button>

        {/* Placeholder for symmetry or flash toggle */}
        <div className="w-12" />
      </div>
    </div>
  );
};

const EditView = ({ 
  file, 
  onSave, 
  onCancel,
  onCaptionChange,
  onLocationChange,
  onLocationEnable,
  caption,
  location,
  locationEnabled
}: { 
  file: File, 
  onSave: (file: File, caption?: string, location?: string) => void, 
  onCancel: () => void,
  onCaptionChange: (caption: string) => void,
  onLocationChange: (location: string) => void,
  onLocationEnable: (enabled: boolean) => void,
  caption: string,
  location: string,
  locationEnabled: boolean
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<string>();
  const isVideo = file.type.startsWith('video/');

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleApplyEffect = async (effectId: string) => {
    if (!preview || isVideo) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      applyEffect(effectId, canvas);
      setPreview(canvas.toDataURL());
    };
    img.src = preview;
  };

  const handleSave = () => {
    onSave(file, caption, locationEnabled ? location : undefined);
  }

  if (!preview) return null;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Preview Area */}
      <div className="flex-1 min-h-0 relative bg-black rounded-lg overflow-hidden flex items-center justify-center border border-border/50">
        {isVideo ? (
          <video
            src={preview}
            className="h-full w-full object-contain max-h-[60vh] md:max-h-[500px]"
            controls
          />
        ) : (
          <img
            src={preview}
            alt="Story preview"
            className="h-full w-full object-contain max-h-[60vh] md:max-h-[500px]"
          />
        )}

        {/* X button removed - Dialog provides its own close button */}
      </div>

      {/* Effects and Content Controls */}
      <div className="flex flex-col gap-4 bg-background pt-2 space-y-3">
        {!isVideo && (
          <div>
            <Label className="text-xs font-medium mb-2 block">Effect</Label>
            <EffectsPicker
              selectedEffect={selectedEffect}
              onSelectEffect={(effectId) => {
                setSelectedEffect(effectId);
                handleApplyEffect(effectId);
              }}
            />
          </div>
        )}

        <div>
          <Label className="text-xs font-medium mb-2 block">Caption (Optional)</Label>
          <Textarea
            placeholder="Add text to your story..."
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            className="min-h-[60px] text-sm"
          />
        </div>

        <LocationPicker
          value={location}
          onChange={onLocationChange}
          onEnableChange={onLocationEnable}
          enabled={locationEnabled}
        />

        <Button 
          onClick={handleSave} 
          className="w-full h-12 text-base font-semibold shadow-lg"
        >
          <Upload className="mr-2 h-4 w-4" /> Bagikan Cerita
        </Button>
      </div>
    </div>
  );
}

export const CreateStoryModal = ({
  isOpen,
  onClose,
}: CreateStoryModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createStory, isPending } = useCreateOptimizedStory();
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: 'Tipe file tidak valid',
        description: 'Silakan pilih file gambar atau video',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: 'File terlalu besar',
        description: 'Silakan pilih file yang lebih kecil dari 20MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setIsEditing(true);
  };

  const handleSubmit = (fileToSubmit?: File, newCaption?: string, newLocation?: string) => {
    const finalFile = fileToSubmit || selectedFile;
    if (!finalFile) return;

    createStory(
      {
        file: finalFile,
        mediaType: finalFile.type,
        caption: newCaption,
        location: newLocation,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Cerita berhasil dibuat!',
            description: 'Cerita Anda telah berhasil dibagikan.',
          });
          handleClose();
        },
        onError: (error) => {
          toast({
            title: 'Gagal membuat cerita',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setIsCameraOpen(false);
    setIsEditing(false);
    setCaption('');
    setLocation('');
    setLocationEnabled(false);
    onClose();
  };

  const handleCapturedFile = (file: File) => {
    setSelectedFile(file);
    setIsCameraOpen(false);
    setIsEditing(true);
  };

  const renderContent = () => {
    if (isCameraOpen) {
      return <CameraView onCapture={handleCapturedFile} onClose={() => setIsCameraOpen(false)} />;
    }

    if (isEditing && selectedFile) {
      return (
        <EditView 
          file={selectedFile} 
          onSave={handleSubmit} 
          onCancel={() => { setIsEditing(false); setSelectedFile(null); }}
          onCaptionChange={setCaption}
          onLocationChange={setLocation}
          onLocationEnable={setLocationEnabled}
          caption={caption}
          location={location}
          locationEnabled={locationEnabled}
        />
      );
    }

    return (
      <div className="flex flex-col h-full space-y-6 justify-center py-4">
        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xl font-semibold mb-2">Unggah Media</p>
          <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
            Klik untuk memilih foto atau video dari perangkat Anda
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-14 text-base hover:bg-muted/50 border-input"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-5 w-5 mr-2" />
            Pilih File
          </Button>
          <Button
            variant="default"
            className="h-14 text-base shadow-md"
            onClick={() => setIsCameraOpen(true)}
          >
            <Camera className="h-5 w-5 mr-2" />
            Kamera
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full max-h-[90vh] h-[800px] flex flex-col p-6 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="mb-2 shrink-0">
          <DialogTitle className="text-xl font-bold">
            {isCameraOpen ? 'Ambil Foto' : isEditing ? 'Edit Cerita' : 'Buat Cerita Baru'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-1">
          {renderContent()}
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelect(file);
            }
          }}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
};
