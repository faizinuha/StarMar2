import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  RotateCcw,
} from 'lucide-react';
import { CallStatus } from '@/hooks/useVideoCall';

interface VideoCallUIProps {
  callState: {
    sessionId: string | null;
    status: CallStatus;
    callType: 'audio' | 'video';
    callerId: string | null;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
  };
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  callerProfile?: { display_name?: string; username?: string; avatar_url?: string } | null;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onFlipCamera: () => void;
  onToggleScreenShare: () => void;
  onInvite?: (userId: string) => void;
  currentUserId?: string;
}

// Wave animation for ringing
function WaveAnimation() {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-primary rounded-full animate-pulse"
          style={{
            height: `${12 + Math.sin(i) * 8}px`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.8s',
          }}
        />
      ))}
    </div>
  );
}

function VideoStream({ stream, muted = false, className = '' }: { stream: MediaStream | null; muted?: boolean; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      el.srcObject = stream;
    }
    return () => {
      if (el) {
        el.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`rounded-lg bg-black ${className}`}
    />
  );
}

export function VideoCallUI({
  callState,
  localStream,
  remoteStreams,
  callerProfile,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onFlipCamera,
  onToggleScreenShare,
  currentUserId,
}: VideoCallUIProps) {
  if (!callState.sessionId) return null;

  const isOutgoing = callState.status === 'ringing' && callState.callerId === currentUserId;
  const isIncoming = callState.status === 'ringing' && !isOutgoing;
  const isActive = callState.status === 'active' || callState.status === 'connecting';
  const isOpen = isIncoming || isOutgoing || isActive;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 bg-black border-0 overflow-hidden [&>button]:hidden">
        {/* Incoming call screen */}
        {isIncoming && (
          <div className="flex flex-col items-center justify-center h-full text-white gap-6">
            <Avatar className="h-24 w-24 border-4 border-white/20">
              <AvatarImage src={callerProfile?.avatar_url} />
              <AvatarFallback className="text-2xl bg-primary/20">
                {callerProfile?.display_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {callerProfile?.display_name || callerProfile?.username || 'Seseorang'}
              </h2>
              <p className="text-white/60 mt-1">
                {callState.callType === 'video' ? 'Video Call' : 'Voice Call'}
              </p>
            </div>

            <WaveAnimation />
            <p className="text-white/50 text-sm">Memanggil...</p>

            <div className="flex gap-8 mt-8">
              <Button
                size="lg"
                variant="destructive"
                className="h-16 w-16 rounded-full"
                onClick={onReject}
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
              <Button
                size="lg"
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
                onClick={onAccept}
              >
                <Phone className="h-7 w-7" />
              </Button>
            </div>
          </div>
        )}

        {/* Active call screen */}
        {isActive && (
          <div className="relative h-full flex flex-col">
            {/* Remote video(s) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-1 p-1">
              {remoteStreams.size === 0 ? (
                <div className="flex items-center justify-center text-white/50">
                  <div className="text-center">
                    <WaveAnimation />
                    <p className="mt-4">Menghubungkan...</p>
                  </div>
                </div>
              ) : (
                Array.from(remoteStreams.entries()).map(([userId, stream]) => (
                  <VideoStream
                    key={userId}
                    stream={stream}
                    className="w-full h-full object-cover"
                  />
                ))
              )}
            </div>

            {/* Local video (picture-in-picture) */}
            {localStream && callState.callType === 'video' && !callState.isVideoOff && (
              <div className="absolute top-4 right-4 w-32 h-44 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                <VideoStream
                  stream={localStream}
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex justify-center gap-4">
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-12 w-12 rounded-full ${callState.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}
                  onClick={onToggleMute}
                >
                  {callState.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                {callState.callType === 'video' && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-12 w-12 rounded-full ${callState.isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}
                      onClick={onToggleVideo}
                    >
                      {callState.isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-12 w-12 rounded-full bg-white/10 text-white"
                      onClick={onFlipCamera}
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-12 w-12 rounded-full ${callState.isScreenSharing ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white'}`}
                      onClick={onToggleScreenShare}
                    >
                      <Monitor className="h-5 w-5" />
                    </Button>
                  </>
                )}

                <Button
                  size="icon"
                  variant="destructive"
                  className="h-12 w-12 rounded-full"
                  onClick={onEnd}
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Outgoing call (waiting) */}
        {isOutgoing && (
          <div className="flex flex-col items-center justify-center h-full text-white gap-6">
            <Avatar className="h-24 w-24 border-4 border-white/20 animate-pulse">
              <AvatarFallback className="text-2xl bg-primary/20">
                <Phone className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <WaveAnimation />
            <p className="text-white/60">Memanggil...</p>
            <Button
              size="lg"
              variant="destructive"
              className="h-16 w-16 rounded-full mt-8"
              onClick={onEnd}
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Incoming call notification (floating)
export function IncomingCallNotification({
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject,
}: {
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-background border shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[320px] animate-in slide-in-from-top">
      <Avatar className="h-12 w-12">
        <AvatarImage src={callerAvatar} />
        <AvatarFallback>{callerName[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-semibold">{callerName}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {callType === 'video' ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
          <span>{callType === 'video' ? 'Video Call' : 'Voice Call'}</span>
          <WaveAnimation />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="icon" variant="destructive" className="rounded-full" onClick={onReject}>
          <PhoneOff className="h-4 w-4" />
        </Button>
        <Button size="icon" className="rounded-full bg-green-500 hover:bg-green-600" onClick={onAccept}>
          <Phone className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
