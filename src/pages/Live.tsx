import { Navigation } from "@/components/layout/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveStreams, useCreateStream, useEndStream, LiveStream } from "@/hooks/useLiveStreams";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera,
  Eye,
  Loader2,
  MessageCircle,
  Monitor,
  Radio,
  Send,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const GENRES = [
  'General', 'Gaming', 'Music', 'Art', 'Education', 'Technology',
  'Cooking', 'Sports', 'Talk Show', 'Other'
];

interface ChatMessage {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  timestamp: number;
  userId?: string;
}

// Helper to render chat messages with avatars
const ChatMessageItem = ({ msg }: { msg: ChatMessage }) => (
  <div className="flex gap-2 text-sm items-start">
    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
      <AvatarImage src={msg.avatar || ""} />
      <AvatarFallback className="text-[10px]">{msg.user?.[0] || "?"}</AvatarFallback>
    </Avatar>
    <div>
      <span className="font-semibold text-primary">{msg.user}</span>
      <span className="text-foreground ml-1 break-words">{msg.text}</span>
    </div>
  </div>
);

// ── Broadcaster Component ──
const BroadcasterView = ({
  stream,
  onEnd,
}: {
  stream: any;
  onEnd: () => void;
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const endStreamHook = useEndStream();

  const replaceTrackForAllPeers = useCallback((newTrack: MediaStreamTrack) => {
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track?.kind === newTrack.kind);
      if (sender) sender.replaceTrack(newTrack);
    });
  }, []);

  const startBroadcast = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true,
      });
      localStreamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsLive(true);

      const channel = supabase.channel(`live-${stream.id}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "viewer-join" }, async ({ payload }) => {
          const viewerId = payload.viewerId;
          const pc = new RTCPeerConnection(ICE_SERVERS);
          peersRef.current.set(viewerId, pc);

          mediaStream.getTracks().forEach((track) => {
            pc.addTrack(track, mediaStream);
          });

          pc.onicecandidate = (e) => {
            if (e.candidate) {
              channel.send({
                type: "broadcast",
                event: "ice-candidate",
                payload: { candidate: e.candidate, targetId: viewerId, fromId: "broadcaster" },
              });
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          channel.send({
            type: "broadcast",
            event: "offer",
            payload: { sdp: offer, targetId: viewerId },
          });

          setViewerCount((c) => c + 1);
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          const pc = peersRef.current.get(payload.fromId);
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (payload.targetId === "broadcaster") {
            const pc = peersRef.current.get(payload.fromId);
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        })
        .on("broadcast", { event: "viewer-leave" }, ({ payload }) => {
          const pc = peersRef.current.get(payload.viewerId);
          if (pc) { pc.close(); peersRef.current.delete(payload.viewerId); }
          setViewerCount((c) => Math.max(0, c - 1));
        })
        .on("broadcast", { event: "chat" }, ({ payload }) => {
          setChatMessages((prev) => [...prev, payload as ChatMessage]);
        })
        .subscribe();

      channelRef.current = channel;
    } catch (err) {
      console.error("Failed to start broadcast:", err);
    }
  }, [stream.id]);

  useEffect(() => {
    startBroadcast();

    // Auto-end stream on page unload
    const handleBeforeUnload = () => {
      endStreamHook.mutate(stream.id);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((pc) => pc.close());
      if (channelRef.current) {
        // Notify viewers that stream ended
        channelRef.current.send({
          type: "broadcast",
          event: "stream-ended",
          payload: {},
        });
        supabase.removeChannel(channelRef.current);
      }
      // Auto-end the stream when broadcaster leaves
      endStreamHook.mutate(stream.id);
    };
  }, [startBroadcast]);

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Switch back to camera
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
        });
        const videoTrack = cameraStream.getVideoTracks()[0];
        
        // Replace in local stream
        const oldTrack = localStreamRef.current?.getVideoTracks()[0];
        if (oldTrack) {
          localStreamRef.current?.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current?.addTrack(videoTrack);
        if (videoRef.current) videoRef.current.srcObject = localStreamRef.current;
        
        replaceTrackForAllPeers(videoTrack);
        setIsScreenSharing(false);
      } else {
        // Share screen
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          // When user stops sharing via browser UI
          toggleScreenShare();
        };

        const oldTrack = localStreamRef.current?.getVideoTracks()[0];
        if (oldTrack) {
          localStreamRef.current?.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current?.addTrack(screenTrack);
        if (videoRef.current) videoRef.current.srcObject = localStreamRef.current;
        
        replaceTrackForAllPeers(screenTrack);
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const EMOJI_LIST = ['😀','😂','❤️','🔥','👏','🎉','😍','🤣','😭','💯','👀','🙏','💪','✨','🎵','😎','🥳','😱','💀','🤯','👋','🫶','💜','🩷','🩵'];

  const sendChat = () => {
    if (!chatInput.trim() || !channelRef.current) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      user: user?.user_metadata?.username || "Streamer",
      avatar: user?.user_metadata?.avatar_url || "",
      text: chatInput.trim(),
      timestamp: Date.now(),
    };
    channelRef.current.send({ type: "broadcast", event: "chat", payload: msg });
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");
    setShowEmojiPicker(false);
  };

  const handleEnd = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peersRef.current.forEach((pc) => pc.close());
    if (channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "stream-ended", payload: {} });
      supabase.removeChannel(channelRef.current);
    }
    onEnd();
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] md:h-screen gap-0">
      <div className="flex-1 bg-black relative flex items-center justify-center">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" style={{ transform: isScreenSharing ? 'none' : 'scaleX(-1)' }} />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-1">
                <Radio className="w-3 h-3" /> LIVE
              </span>
            )}
            <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <Eye className="w-3 h-3" /> {viewerCount}
            </span>
            {stream.genre && stream.genre !== 'General' && (
              <Badge variant="secondary" className="text-xs">{stream.genre}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleScreenShare}
              variant="ghost"
              size="sm"
              className={`rounded-full text-white ${isScreenSharing ? 'bg-primary/80' : 'bg-black/50'}`}
            >
              <Monitor className="w-4 h-4 mr-1" />
              {isScreenSharing ? 'Stop Share' : 'Share Screen'}
            </Button>
            <Button onClick={handleEnd} variant="destructive" size="sm" className="rounded-full">
              <VideoOff className="w-4 h-4 mr-1" /> End
            </Button>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <h3 className="text-white font-bold text-lg drop-shadow-lg">{stream.title}</h3>
          <p className="text-white/70 text-sm">{new Date(stream.started_at || stream.created_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-full lg:w-80 bg-card border-l border-border flex flex-col h-64 lg:h-full">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Live Chat</span>
          <span className="text-xs text-muted-foreground ml-auto">{chatMessages.length} messages</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatMessages.map((msg) => (
            <ChatMessageItem key={msg.id} msg={msg} />
          ))}
        </div>
        <div className="p-3 border-t border-border space-y-2">
          {showEmojiPicker && (
            <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg">
              {EMOJI_LIST.map(e => (
                <button key={e} className="text-lg hover:scale-125 transition-transform p-0.5" onClick={() => setChatInput(prev => prev + e)}>{e}</button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="shrink-0 text-lg">😀</Button>
            <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Say something..." className="text-sm" />
            <Button size="icon" onClick={sendChat} className="shrink-0"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Viewer Component ──
const ViewerView = ({
  stream,
  onLeave,
}: {
  stream: LiveStream;
  onLeave: () => void;
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const viewerIdRef = useRef(crypto.randomUUID());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(true);
  const [streamEnded, setStreamEnded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const viewerId = viewerIdRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (videoRef.current && e.streams[0]) {
        videoRef.current.srcObject = e.streams[0];
        setIsConnecting(false);
      }
    };

    const channel = supabase.channel(`live-${stream.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.targetId !== viewerId) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({ type: "broadcast", event: "answer", payload: { sdp: answer, fromId: viewerId } });
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.targetId === viewerId) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setChatMessages((prev) => [...prev, payload as ChatMessage]);
      })
      .on("broadcast", { event: "stream-ended" }, () => {
        setStreamEnded(true);
        toast({ title: "Live telah berakhir", description: "Host telah mengakhiri siaran langsung." });
      })
      .subscribe(() => {
        channel.send({ type: "broadcast", event: "viewer-join", payload: { viewerId } });
      });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channel.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: e.candidate, targetId: "broadcaster", fromId: viewerId },
        });
      }
    };

    channelRef.current = channel;

    return () => {
      channel.send({ type: "broadcast", event: "viewer-leave", payload: { viewerId } });
      pc.close();
      supabase.removeChannel(channel);
    };
  }, [stream.id]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const EMOJI_LIST = ['😀','😂','❤️','🔥','👏','🎉','😍','🤣','😭','💯','👀','🙏','💪','✨','🎵','😎','🥳','😱','💀','🤯','👋','🫶','💜','🩷','🩵'];

  const sendChat = () => {
    if (!chatInput.trim() || !channelRef.current) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      user: user?.user_metadata?.username || "Viewer",
      avatar: user?.user_metadata?.avatar_url || "",
      text: chatInput.trim(),
      timestamp: Date.now(),
    };
    channelRef.current.send({ type: "broadcast", event: "chat", payload: msg });
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] md:h-screen gap-0">
      <div className="flex-1 bg-black relative flex items-center justify-center">
        {streamEnded ? (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/90">
            <div className="text-center text-white">
              <VideoOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">Siaran Telah Berakhir</h3>
              <p className="text-sm text-muted-foreground mb-4">Host telah mengakhiri live streaming ini.</p>
              <Button onClick={onLeave} variant="secondary">Kembali ke Lobby</Button>
            </div>
          </div>
        ) : isConnecting ? (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Connecting to stream...</p>
            </div>
          </div>
        ) : null}
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
              <Avatar className="h-6 w-6">
                <AvatarImage src={stream.user?.avatar_url || ""} />
                <AvatarFallback>{stream.user?.username?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-medium">{stream.user?.display_name || stream.user?.username}</span>
            </div>
            {!streamEnded && (
              <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                <Radio className="w-3 h-3" /> LIVE
              </span>
            )}
            {stream.genre && stream.genre !== 'General' && (
              <Badge variant="secondary" className="text-xs">{stream.genre}</Badge>
            )}
          </div>
          <Button onClick={onLeave} variant="ghost" size="icon" className="text-white bg-black/50 rounded-full hover:bg-black/70">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <h3 className="text-white font-bold text-lg drop-shadow-lg">{stream.title}</h3>
          <p className="text-white/70 text-sm">{new Date(stream.started_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Chat */}
      <div className="w-full lg:w-80 bg-card border-l border-border flex flex-col h-64 lg:h-full">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Live Chat</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatMessages.map((msg) => (
            <ChatMessageItem key={msg.id} msg={msg} />
          ))}
        </div>
        <div className="p-3 border-t border-border space-y-2">
          {showEmojiPicker && (
            <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg">
              {EMOJI_LIST.map(e => (
                <button key={e} className="text-lg hover:scale-125 transition-transform p-0.5" onClick={() => setChatInput(prev => prev + e)}>{e}</button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="shrink-0 text-lg">😀</Button>
            <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Say something..." className="text-sm" />
            <Button size="icon" onClick={sendChat} className="shrink-0"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Live Page ──
const Live = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: streams = [], isLoading } = useActiveStreams();
  const createStream = useCreateStream();
  const endStream = useEndStream();

  const [mode, setMode] = useState<"lobby" | "broadcasting" | "watching">("lobby");
  const [activeStream, setActiveStream] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("General");
  const [showGoLive, setShowGoLive] = useState(false);

  const handleGoLive = async () => {
    if (!title.trim()) {
      toast({ title: "Masukkan judul stream", variant: "destructive" });
      return;
    }
    try {
      const stream = await createStream.mutateAsync({ title: title.trim(), description: description.trim(), genre });
      setActiveStream(stream);
      setMode("broadcasting");
      setShowGoLive(false);
    } catch {
      toast({ title: "Gagal memulai live", variant: "destructive" });
    }
  };

  const handleEndStream = async () => {
    if (activeStream) {
      await endStream.mutateAsync(activeStream.id);
    }
    setMode("lobby");
    setActiveStream(null);
  };

  const handleWatch = (stream: LiveStream) => {
    setActiveStream(stream);
    setMode("watching");
  };

  if (mode === "broadcasting" && activeStream) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="md:ml-64">
          <BroadcasterView stream={activeStream} onEnd={handleEndStream} />
        </main>
      </div>
    );
  }

  if (mode === "watching" && activeStream) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="md:ml-64">
          <ViewerView stream={activeStream} onLeave={() => { setMode("lobby"); setActiveStream(null); }} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="md:ml-64 p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="w-6 h-6 text-primary" />
              NekoPaw Live
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Siaran langsung P2P • Cocok untuk grup kecil</p>
          </div>
          {user && (
            <Button onClick={() => setShowGoLive(!showGoLive)} className="bg-red-500 hover:bg-red-600 text-white rounded-full gap-2">
              <Radio className="w-4 h-4" /> Go Live
            </Button>
          )}
        </div>

        {showGoLive && (
          <Card className="p-4 mb-6 border-primary/20 bg-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" /> Mulai Siaran Langsung
            </h3>
            <div className="space-y-3">
              <div>
                <Label>Judul</Label>
                <Input placeholder="Judul stream..." value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Deskripsi (opsional)</Label>
                <Textarea placeholder="Deskripsi stream..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" />
              </div>
              <div>
                <Label>Genre / Kategori</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGoLive} disabled={createStream.isPending} className="bg-red-500 hover:bg-red-600 text-white">
                  {createStream.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Radio className="w-4 h-4 mr-1" />}
                  Mulai Live
                </Button>
                <Button variant="outline" onClick={() => setShowGoLive(false)}>Batal</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              ⚠️ WebRTC P2P — terbaik untuk 5-10 penonton. Butuh izin kamera & mikrofon.
            </p>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : streams.length === 0 ? (
          <div className="text-center py-20">
            <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Belum ada siaran langsung</h3>
            <p className="text-muted-foreground text-sm">Jadilah yang pertama Go Live! 🎬</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {streams.map((stream) => (
              <Card key={stream.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group" onClick={() => handleWatch(stream)}>
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative flex items-center justify-center">
                  <Video className="w-12 h-12 text-primary/50 group-hover:scale-110 transition-transform" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
                      <Radio className="w-3 h-3" /> LIVE
                    </span>
                    <span className="bg-black/60 text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                      <Users className="w-3 h-3" /> {stream.viewer_count}
                    </span>
                  </div>
                  {stream.genre && stream.genre !== 'General' && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="text-xs">{stream.genre}</Badge>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate">{stream.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={stream.user?.avatar_url || ""} />
                      <AvatarFallback>{stream.user?.username?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{stream.user?.display_name || stream.user?.username}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(stream.started_at).toLocaleString()}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Live;
