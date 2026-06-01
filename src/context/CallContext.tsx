import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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
      console.log('[CallContext] Routing: isGroup=', info.isGroup);
      if (info.isGroup) {
        groupCallRef.current.handleIncoming(info);
      } else {
        webrtcRef.current.handleIncoming(info);
      }
    };

    const onOffer = (data: any) => {
      console.log('[CallContext] Received offer, groupCall state:', groupCallRef.current.callState, ', callerId:', data.callerId);
      if (groupCallRef.current.callState !== 'idle' && groupCallRef.current.callState !== 'calling') {
        console.log('[CallContext] Routing offer to groupCall');
        groupCallRef.current.handleOffer(data);
      } else if (webrtcRef.current.callState !== 'idle') {
        console.log('[CallContext] Routing offer to webrtc');
        webrtcRef.current.handleOffer(data);
      } else {
        console.log('[CallContext] Routing offer to groupCall (default)');
        groupCallRef.current.handleOffer(data);
      }
    };

    const onWebRTCAnswer = (data: any) => {
      console.log('[CallContext] Received answer, data:', data, 'groupCall state:', groupCallRef.current.callState, ', webrtc state:', webrtcRef.current.callState);
      if (groupCallRef.current.callState !== 'idle' && groupCallRef.current.callState !== 'calling') {
        console.log('[CallContext] Routing answer to groupCall');
        groupCallRef.current.handleAnswer(data);
      } else if (webrtcRef.current.callState !== 'idle') {
        console.log('[CallContext] Routing answer to webrtc');
        webrtcRef.current.handleWebRTCAnswer(data);
      } else {
        console.log('[CallContext] Routing answer to groupCall (default)');
        groupCallRef.current.handleAnswer(data);
      }
    };

    const onIceCandidate = (data: any) => {
      if (groupCallRef.current.callState !== 'idle' && groupCallRef.current.callState !== 'calling') {
        groupCallRef.current.handleIceCandidate(data);
      } else if (webrtcRef.current.callState !== 'idle') {
        webrtcRef.current.handleIceCandidate(data);
      } else {
        groupCallRef.current.handleIceCandidate(data);
      }
    };

    const onCallEnded = (data: any) => {
      console.log('[CallContext] Call ended, groupCall state:', groupCallRef.current.callState, ', webrtc state:', webrtcRef.current.callState);
      if (groupCallRef.current.callState !== 'idle' && groupCallRef.current.callState !== 'calling') {
        groupCallRef.current.handleCallEnded(data);
      } else if (webrtcRef.current.callState !== 'idle') {
        webrtcRef.current.handleCallEnded();
      } else {
        groupCallRef.current.handleCallEnded(data);
      }
    };

    const onUserJoined = (data: any) => {
      console.log('[CallContext] User joined:', data, 'groupCall state:', groupCallRef.current.callState);
      groupCallRef.current.handleUserJoined(data);
    };

    const onCurrentParticipants = (data: any) => {
      console.log('[CallContext] Current participants:', data);
      groupCallRef.current.handleCurrentParticipants(data);
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
