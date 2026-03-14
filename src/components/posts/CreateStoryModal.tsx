import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useCreateOptimizedStory } from '@/hooks/useOptimizedStories';
import { Camera, Loader2, Music, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { EffectsPicker } from './EffectsPicker';
import { LocationPicker } from './LocationPicker';
import { MusicPicker } from './MusicPicker';
import { applyEffect } from '@/lib/effects';
import { Track } from '@/lib/api/mymusic';

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
        alert('Tidak dapat mengakses kamera.');
        onClose();
      }
    };
    openCamera();
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
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
          if (blob) onCapture(new File([blob], 'story.jpg', { type: 'image/jpeg' }));
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
        <Button variant="ghost" size="icon" className="text-white bg-black/40 hover:bg-black/60 rounded-full h-12 w-12 border border-white/20" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
        <Button onClick={handleCapture} size="lg" className="rounded-full w-20 h-20 bg-white text-black hover:bg-gray-200 border-4 border-gray-300 ring-2 ring-white/50">
          <Camera className="h-8 w-8" />
        </Button>
        <div className="w-12" />
      </div>
    </div>
  );
};

export const CreateStoryModal = ({ isOpen, onClose }: CreateStoryModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<string>();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createStory, isPending } = useCreateOptimizedStory();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (isPending) {
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) { clearInterval(interval); return 90; }
          return prev + Math.random() * 15;
        });
      }, 200);
      return () => clearInterval(interval);
    } else {
      setUploadProgress(0);
    }
  }, [isPending]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({ title: 'Tipe file tidak valid', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'File terlalu besar', description: 'Maksimal 20MB', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = () => {
    if (!selectedFile) return;

    let storyCaption = caption || undefined;
    if (selectedTrack) {
      storyCaption = `${caption || ''}\n🎵 ${selectedTrack.name} - ${selectedTrack.artist}`.trim();
    }

    createStory(
      { file: selectedFile, mediaType: selectedFile.type, caption: storyCaption, location: locationEnabled ? location : undefined },
      {
        onSuccess: () => {
          setUploadProgress(100);
          toast({ title: 'Cerita berhasil dibuat!' });
          setTimeout(handleClose, 300);
        },
        onError: (error) => {
          toast({ title: 'Gagal membuat cerita', description: error.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setIsCameraOpen(false);
    setCaption('');
    setLocation('');
    setLocationEnabled(false);
    setSelectedEffect(undefined);
    setUploadProgress(0);
    setSelectedTrack(null);
    onClose();
  };

  const handleApplyEffect = (effectId: string) => {
    if (!preview || selectedFile?.type.startsWith('video/')) return;
    setSelectedEffect(effectId);
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
    img.src = URL.createObjectURL(selectedFile!);
  };

  const isVideo = selectedFile?.type.startsWith('video/');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md w-full max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl">
          <DialogHeader className="p-4 pb-2 shrink-0 border-b border-border">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold">
                {isCameraOpen ? 'Ambil Foto' : selectedFile ? 'Edit Cerita' : 'Buat Cerita'}
              </DialogTitle>
              {selectedFile && !isPending && (
                <Button size="sm" onClick={handleSubmit} className="gap-1">
                  <Upload className="h-4 w-4" /> Bagikan
                </Button>
              )}
            </div>
            {isPending && (
              <div className="pt-2">
                <Progress value={uploadProgress} className="h-1" />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Mengunggah...
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {isCameraOpen ? (
              <div className="h-[60vh]">
                <CameraView onCapture={(f) => { setSelectedFile(f); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />
              </div>
            ) : selectedFile && preview ? (
              <div className="space-y-4 p-4">
                <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center max-h-[40vh]">
                  {isVideo ? (
                    <video src={preview} className="w-full h-full object-contain max-h-[40vh]" controls />
                  ) : (
                    <img src={preview} alt="Preview" className="w-full h-full object-contain max-h-[40vh]" />
                  )}
                  {!isPending && (
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/50 text-white rounded-full h-8 w-8 hover:bg-black/70" onClick={() => { setSelectedFile(null); setPreview(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {!isVideo && (
                  <div>
                    <Label className="text-xs font-medium mb-2 block">Filter</Label>
                    <EffectsPicker selectedEffect={selectedEffect} onSelectEffect={handleApplyEffect} />
                  </div>
                )}

                {/* Music selector */}
                <div>
                  <Label className="text-xs font-medium mb-1 block">Music (Optional)</Label>
                  {selectedTrack ? (
                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/10">
                      {selectedTrack.image_url && <img src={selectedTrack.image_url} className="h-8 w-8 rounded object-cover" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">🎵 {selectedTrack.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{selectedTrack.artist}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedTrack(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowMusicPicker(true)}>
                      <Music className="h-4 w-4" /> Add Music
                    </Button>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium mb-1 block">Teks (Opsional)</Label>
                  <Textarea placeholder="Tulis sesuatu..." value={caption} onChange={(e) => setCaption(e.target.value)} className="min-h-[50px] text-sm resize-none" disabled={isPending} />
                </div>

                <LocationPicker value={location} onChange={setLocation} onEnableChange={setLocationEnabled} enabled={locationEnabled} />
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all group" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-lg font-semibold mb-1">Pilih Media</p>
                  <p className="text-sm text-muted-foreground">Foto atau video dari perangkat Anda</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" /> Pilih File
                  </Button>
                  <Button className="h-12" onClick={() => setIsCameraOpen(true)}>
                    <Camera className="h-4 w-4 mr-2" /> Kamera
                  </Button>
                </div>
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); if (e.target) e.target.value = ''; }} className="hidden" />
        </DialogContent>
      </Dialog>

      <MusicPicker isOpen={showMusicPicker} onClose={() => setShowMusicPicker(false)} onSelect={setSelectedTrack} selectedTrack={selectedTrack} />
    </>
  );
};
