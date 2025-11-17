import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useCreateStory } from '@/hooks/useStories';
import { Camera, Loader2, Upload, X, Zap, Sun, Contrast, Wind } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CameraView = ({ onCapture, onClose }) => {
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
        alert('Could not access the camera. Please check permissions and try again.');
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
    <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <Button onClick={handleCapture} size="lg" className="rounded-full w-20 h-20 bg-white text-black hover:bg-gray-200">
          <Camera className="h-8 w-8" />
        </Button>
      </div>
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const EditView = ({ file, onSave, onCancel }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [filter, setFilter] = useState('none');

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const filters = [
    { name: 'None', value: 'none', icon: <X className="h-4 w-4" /> },
    { name: 'Clarendon', value: 'contrast(1.2) saturate(1.3)', icon: <Zap className="h-4 w-4" /> },
    { name: 'Gingham', value: 'brightness(1.05) hue-rotate(-10deg)', icon: <Sun className="h-4 w-4" /> },
    { name: 'Moon', value: 'grayscale(1) contrast(1.1) brightness(0.9)', icon: <Contrast className="h-4 w-4" /> },
    { name: 'Lark', value: 'contrast(.9) brightness(1.1) saturate(1.1)', icon: <Wind className="h-4 w-4" /> },
  ];

  const handleSave = () => {
    // In a real app, you would apply the filter to the image data itself.
    // For simplicity, we are not doing that here.
    onSave(file);
  }

  if (!preview) return null;

  return (
    <div className="space-y-4">
      <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
        <img src={preview} alt="Story preview" className="w-full h-full object-cover" style={{ filter: filter }} />
        <Button variant="ghost" size="icon" className="absolute top-2 left-2 text-white bg-black/50 hover:bg-black/70" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-center">Filters</p>
        <div className="flex justify-center gap-2 overflow-x-auto pb-2">
          {filters.map(f => (
            <button key={f.name} onClick={() => setFilter(f.value)} className={`flex flex-col items-center gap-1 p-1 rounded-md ${filter === f.value ? 'bg-primary/20' : ''}`}>
              <div className="w-16 h-16 rounded-md overflow-hidden">
                <img src={preview} alt={f.name} className="w-full h-full object-cover" style={{ filter: f.value }} />
              </div>
              <span className="text-xs">{f.name}</span>
            </button>
          ))}
        </div>
      </div>
      <Button onClick={handleSave} className="w-full">Share Story</Button>
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createStory, isPending } = useCreateStory();
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image or video file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setIsEditing(true);
    } else {
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  };

  const handleSubmit = (fileToSubmit?: File) => {
    const finalFile = fileToSubmit || selectedFile;
    if (!finalFile) return;

    createStory(
      {
        file: finalFile,
        mediaType: finalFile.type,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Story created!',
            description: 'Your story has been shared successfully',
          });
          handleClose();
        },
        onError: (error) => {
          toast({
            title: 'Error creating story',
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

    if (isEditing) {
      return <EditView file={selectedFile} onSave={handleSubmit} onCancel={() => { setIsEditing(false); setSelectedFile(null); }} />
    }

    if (preview) {
      return (
        <div className="space-y-4">
          <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
            {selectedFile?.type.startsWith('image/') ? (
              <img
                src={preview}
                alt="Story preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={preview}
                className="w-full h-full object-cover"
                controls
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
              onClick={() => {
                setPreview(null);
                setSelectedFile(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setPreview(null);
                setSelectedFile(null);
              }}
            >
              Change
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleSubmit()}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...
                </>
              ) : (
                'Share Story'
              )}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Upload Media</p>
          <p className="text-sm text-muted-foreground">
            Click to select an image or video
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-12"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose File
          </Button>
          <Button
            variant="outline"
            className="h-12"
            onClick={() => setIsCameraOpen(true)}
          >
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        {renderContent()}

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
