import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';


export type CallStatus = 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';

interface CallState {
  sessionId: string | null;
  status: CallStatus;
  callType: 'audio' | 'video';
  conversationId: string | null;
  callerId: string | null;
  isScreenSharing: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  facingMode: 'user' | 'environment';
}

export function useVideoCall() {
  const { user } = useAuth();
  
  const [callState, setCallState] = useState<CallState>({
    sessionId: null,
    status: 'idle',
    callType: 'video',
    conversationId: null,
    callerId: null,
    isScreenSharing: false,
    isMuted: false,
    isVideoOff: false,
    facingMode: 'user',
  });

  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalChannelRef = useRef<any>(null);
  const ringtoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`calls-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_participants',
        filter: `user_id=eq.${user.id}`,
      }, async (payload: any) => {
        const participant = payload.new;
        if (participant.status === 'invited') {
          // Fetch call session details
          const { data: session } = await supabase
            .from('call_sessions')
            .select('*')
            .eq('id', participant.session_id)
            .single();

          if (session && session.status === 'ringing') {
            setCallState(prev => ({
              ...prev,
              sessionId: session.id,
              status: 'ringing',
              callType: session.call_type as 'audio' | 'video',
              conversationId: session.conversation_id,
              callerId: session.caller_id,
            }));

            // Auto-cancel after 30s
            ringtoneTimeoutRef.current = setTimeout(() => {
              if (callState.status === 'ringing') {
                rejectCall();
              }
            }, 30000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Listen for WebRTC signals
  useEffect(() => {
    if (!callState.sessionId || !user) return;

    const channel = supabase
      .channel(`signals-${callState.sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `to_user_id=eq.${user.id}`,
      }, async (payload: any) => {
        const signal = payload.new;
        if (signal.session_id !== callState.sessionId) return;
        await handleSignal(signal);
      })
      .subscribe();

    signalChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callState.sessionId, user]);

  function cleanup() {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);
  }

  async function getLocalStream(callType: 'audio' | 'video', facingMode: string = 'user'): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: callType === 'video' ? { facingMode } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    return stream;
  }

  function createPeerConnection(remoteUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(remoteUserId, event.streams[0]);
        return newMap;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && user) {
        await supabase.from('call_signals').insert({
          session_id: callState.sessionId,
          from_user_id: user.id,
          to_user_id: remoteUserId,
          signal_type: 'ice-candidate',
          signal_data: { candidate: event.candidate.toJSON() },
        } as any);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(remoteUserId);
          return newMap;
        });
      }
    };

    peerConnectionsRef.current.set(remoteUserId, pc);
    return pc;
  }

  async function handleSignal(signal: any) {
    const { from_user_id, signal_type, signal_data } = signal;

    if (signal_type === 'offer') {
      const pc = createPeerConnection(from_user_id);
      await pc.setRemoteDescription(new RTCSessionDescription(signal_data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (user) {
        await supabase.from('call_signals').insert({
          session_id: callState.sessionId,
          from_user_id: user.id,
          to_user_id: from_user_id,
          signal_type: 'answer',
          signal_data: { sdp: answer },
        } as any);
      }
    } else if (signal_type === 'answer') {
      const pc = peerConnectionsRef.current.get(from_user_id);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal_data.sdp));
      }
    } else if (signal_type === 'ice-candidate') {
      const pc = peerConnectionsRef.current.get(from_user_id);
      if (pc && signal_data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal_data.candidate));
      }
    } else if (signal_type === 'hangup') {
      endCall();
    }
  }

  const startCall = useCallback(async (conversationId: string, callType: 'audio' | 'video', participantIds: string[]) => {
    if (!user) return;

    try {
      await getLocalStream(callType);

      // Create call session
      const { data: session, error } = await supabase
        .from('call_sessions')
        .insert({
          conversation_id: conversationId,
          caller_id: user.id,
          call_type: callType,
          status: 'ringing',
        })
        .select()
        .single();

      if (error) throw error;

      // Add participants
      const participants = participantIds
        .filter(id => id !== user.id)
        .map(userId => ({
          session_id: session.id,
          user_id: userId,
          status: 'invited',
        }));

      if (participants.length > 0) {
        await supabase.from('call_participants').insert(participants);
      }

      // Add self as joined
      await supabase.from('call_participants').insert({
        session_id: session.id,
        user_id: user.id,
        status: 'joined',
        joined_at: new Date().toISOString(),
      });

      setCallState({
        sessionId: session.id,
        status: 'ringing',
        callType,
        conversationId,
        callerId: user.id,
        isScreenSharing: false,
        isMuted: false,
        isVideoOff: false,
        facingMode: 'user',
      });

      // Auto-cancel after 30s if no one answers
      ringtoneTimeoutRef.current = setTimeout(async () => {
        const { data: currentSession } = await supabase
          .from('call_sessions')
          .select('status')
          .eq('id', session.id)
          .single();

        if (currentSession?.status === 'ringing') {
          await supabase.from('call_sessions')
            .update({ status: 'missed', ended_at: new Date().toISOString() })
            .eq('id', session.id);
          cleanup();
          setCallState(prev => ({ ...prev, status: 'ended', sessionId: null }));
        }
      }, 30000);

    } catch (error) {
      console.error('Failed to start call:', error);
      cleanup();
    }
  }, [user]);

  const acceptCall = useCallback(async () => {
    if (!user || !callState.sessionId) return;

    try {
      if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);

      await getLocalStream(callState.callType, callState.facingMode);

      // Update participation status
      await supabase.from('call_participants')
        .update({ status: 'joined', joined_at: new Date().toISOString() })
        .eq('session_id', callState.sessionId)
        .eq('user_id', user.id);

      // Update session status
      await supabase.from('call_sessions')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', callState.sessionId);

      setCallState(prev => ({ ...prev, status: 'connecting' }));

      // Create peer connection with caller and send offer
      const { data: participants } = await supabase
        .from('call_participants')
        .select('user_id')
        .eq('session_id', callState.sessionId)
        .eq('status', 'joined')
        .neq('user_id', user.id);

      for (const p of (participants || [])) {
        const pc = createPeerConnection(p.user_id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await supabase.from('call_signals').insert({
          session_id: callState.sessionId,
          from_user_id: user.id,
          to_user_id: p.user_id,
          signal_type: 'offer',
          signal_data: { sdp: offer },
        } as any);
      }

      setCallState(prev => ({ ...prev, status: 'active' }));
    } catch (error) {
      console.error('Failed to accept call:', error);
      cleanup();
    }
  }, [user, callState]);

  const rejectCall = useCallback(async () => {
    if (!user || !callState.sessionId) return;
    if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);

    await supabase.from('call_participants')
      .update({ status: 'rejected' })
      .eq('session_id', callState.sessionId)
      .eq('user_id', user.id);

    cleanup();
    setCallState(prev => ({ ...prev, status: 'idle', sessionId: null }));
  }, [user, callState]);

  const endCall = useCallback(async () => {
    if (!user || !callState.sessionId) return;
    if (ringtoneTimeoutRef.current) clearTimeout(ringtoneTimeoutRef.current);

    // Send hangup signal to all peers
    peerConnectionsRef.current.forEach(async (_, peerId) => {
      await supabase.from('call_signals').insert({
        session_id: callState.sessionId,
        from_user_id: user.id,
        to_user_id: peerId,
        signal_type: 'hangup',
        signal_data: {},
      } as any);
    });

    await supabase.from('call_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', callState.sessionId);

    await supabase.from('call_participants')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('session_id', callState.sessionId)
      .eq('user_id', user.id);

    cleanup();
    setCallState({
      sessionId: null,
      status: 'idle',
      callType: 'video',
      conversationId: null,
      callerId: null,
      isScreenSharing: false,
      isMuted: false,
      isVideoOff: false,
      facingMode: 'user',
    });
  }, [user, callState]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCallState(prev => ({ ...prev, isVideoOff: !prev.isVideoOff }));
  }, []);

  const flipCamera = useCallback(async () => {
    const newFacing = callState.facingMode === 'user' ? 'environment' : 'user';
    
    // Stop old video tracks
    localStreamRef.current?.getVideoTracks().forEach(t => t.stop());
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: false,
      });
      
      const newTrack = newStream.getVideoTracks()[0];
      
      // Replace track in all peer connections
      peerConnectionsRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newTrack);
      });
      
      // Replace in local stream
      const oldTracks = localStreamRef.current?.getVideoTracks() || [];
      oldTracks.forEach(t => localStreamRef.current?.removeTrack(t));
      localStreamRef.current?.addTrack(newTrack);
      
      setCallState(prev => ({ ...prev, facingMode: newFacing }));
    } catch (error) {
      console.error('Failed to flip camera:', error);
    }
  }, [callState.facingMode]);

  const toggleScreenShare = useCallback(async () => {
    if (callState.isScreenSharing) {
      // Stop screen sharing
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      
      // Restore camera
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: callState.facingMode } });
      const cameraTrack = cameraStream.getVideoTracks()[0];
      
      peerConnectionsRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(cameraTrack);
      });
      
      screenStreamRef.current = null;
      setCallState(prev => ({ ...prev, isScreenSharing: false }));
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          toggleScreenShare();
        };
        
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        
        setCallState(prev => ({ ...prev, isScreenSharing: true }));
      } catch (error) {
        console.error('Failed to share screen:', error);
      }
    }
  }, [callState]);

  const inviteToCall = useCallback(async (userId: string) => {
    if (!callState.sessionId || !user) return;

    await supabase.from('call_participants').insert({
      session_id: callState.sessionId,
      user_id: userId,
      status: 'invited',
    });
  }, [callState.sessionId, user]);

  return {
    callState,
    localStream: localStreamRef.current,
    remoteStreams,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    flipCamera,
    toggleScreenShare,
    inviteToCall,
  };
}
