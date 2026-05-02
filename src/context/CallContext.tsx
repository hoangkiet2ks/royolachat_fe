import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useChatSocket } from '../hooks/useChatSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useGroupCall } from '../hooks/useGroupCall';

interface CallContextValue {
  socket: ReturnType<typeof useChatSocket>;
  webrtc: ReturnType<typeof useWebRTC>;
  groupCall: ReturnType<typeof useGroupCall>;
  // Cho phép ChatRoom set groupName khi đang mở
  setActiveGroupName: (name: string) => void;
  activeGroupName: string;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const token = session?.accessToken || null;
  const socket = useChatSocket(token);

  const webrtc = useWebRTC(socket);
  const groupCall = useGroupCall(socket, session?.userId);

  const webrtcRef = useRef(webrtc);
  const groupCallRef = useRef(groupCall);

  const [activeGroupName, setActiveGroupName] = useState('Nhóm');

  useEffect(() => { webrtcRef.current = webrtc; }, [webrtc]);
  useEffect(() => { groupCallRef.current = groupCall; }, [groupCall]);

  // Setup tất cả socket listeners ở đây - 1 lần duy nhất
  useEffect(() => {
    if (!socket) return;

    const onCallIncoming = (info: any) => {
      console.log('[CallContext] Incoming call:', info);
      if (info.isGroup) {
        groupCallRef.current.handleIncoming(info);
      } else {
        webrtcRef.current.handleIncoming(info);
      }
    };

    const onUserJoined = (data: any) => groupCallRef.current.handleUserJoined(data);

    const onCurrentParticipants = (data: any) => groupCallRef.current.handleCurrentParticipants(data);

    const onWebRTCAnswer = (data: any) => {
      if (groupCallRef.current.callState !== 'idle') {
        groupCallRef.current.handleAnswer(data);
      } else {
        webrtcRef.current.handleWebRTCAnswer(data);
      }
    };

    const onIceCandidate = (data: any) => {
      if (groupCallRef.current.callState !== 'idle') {
        groupCallRef.current.handleIceCandidate(data);
      } else {
        webrtcRef.current.handleIceCandidate(data);
      }
    };

    const onCallEnded = (data: any) => {
      if (groupCallRef.current.callState !== 'idle') {
        groupCallRef.current.handleCallEnded(data);
      } else {
        webrtcRef.current.handleCallEnded();
      }
    };

    const onOffer = (data: any) => {
      if (groupCallRef.current.callState !== 'idle') {
        groupCallRef.current.handleOffer(data);
      } else {
        webrtcRef.current.handleOffer(data);
      }
    };

    const onSwitchToVideo = () => webrtcRef.current.handleSwitchToVideo();

    socket.on('call:incoming', onCallIncoming);
    socket.on('call:user-joined', onUserJoined);
    socket.on('call:current-participants', onCurrentParticipants);
    socket.on('call:webrtc-answer', onWebRTCAnswer);
    socket.on('call:ice-candidate', onIceCandidate);
    socket.on('call:ended', onCallEnded);
    socket.on('call:offer', onOffer);
    socket.on('call:switch-to-video', onSwitchToVideo);

    return () => {
      socket.off('call:incoming', onCallIncoming);
      socket.off('call:user-joined', onUserJoined);
      socket.off('call:current-participants', onCurrentParticipants);
      socket.off('call:webrtc-answer', onWebRTCAnswer);
      socket.off('call:ice-candidate', onIceCandidate);
      socket.off('call:ended', onCallEnded);
      socket.off('call:offer', onOffer);
      socket.off('call:switch-to-video', onSwitchToVideo);
    };
  }, [socket]);

  return (
    <CallContext.Provider value={{ socket, webrtc, groupCall, setActiveGroupName, activeGroupName }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
