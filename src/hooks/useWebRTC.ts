import { useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import ICE_SERVERS from '../config/webrtc';

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface IncomingCallInfo {
  callerId: number;
  callerName: string;
  callType: 'audio' | 'video';
  conversationId: number;
}

export function useWebRTC(socket: Socket | null) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [partnerName, setPartnerName] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const partnerIdRef = useRef<number | null>(null);
  const incomingCallRef = useRef<IncomingCallInfo | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const callStateRef = useRef<CallState>('idle');

  const setCallStateSynced = useCallback((state: CallState) => {
    callStateRef.current = state;
    setCallState(state);
  }, []);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    pendingOfferRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallStateSynced('idle');
    incomingCallRef.current = null;
    partnerIdRef.current = null;
  }, [setCallStateSynced]);

  const createPC = useCallback((partnerId: number) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('call:ice-candidate', {
          targetUserId: partnerId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      console.log('[WebRTC] ontrack', e.track.kind, e.streams.length);
      if (e.streams && e.streams[0]) {
        setRemoteStream(e.streams[0]);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallStateSynced('connected');
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, setCallStateSynced]);

  const getMedia = useCallback(async (type: 'audio' | 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ---- CALLER ----
  const startCall = useCallback(async (
    targetUserId: number,
    targetName: string,
    type: 'audio' | 'video',
    conversationId: number,
    myName: string,
  ) => {
    if (!socket) return;

    partnerIdRef.current = targetUserId;
    setCallType(type);
    setPartnerName(targetName);
    setCallStateSynced('calling');

    try {
      const stream = await getMedia(type);
      const pc = createPC(targetUserId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      socket.emit('call:initiate', { targetUserId, callType: type, callerName: myName, conversationId });

      socket.once('call:answered', async ({ accepted }: { accepted: boolean }) => {
        if (!accepted) { setCallStateSynced('ended'); setTimeout(cleanup, 2000); return; }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:offer', { targetUserId, offer });
      });

      socket.once('call:unavailable', () => { setCallStateSynced('ended'); setTimeout(cleanup, 2000); });

    } catch {
      alert('Không thể truy cập camera/microphone');
      cleanup();
    }
  }, [socket, cleanup, createPC, getMedia, setCallStateSynced]);

  // ---- CALLEE: nhận cuộc gọi đến ----
  const handleIncoming = useCallback((info: IncomingCallInfo) => {
    incomingCallRef.current = info;
    setCallType(info.callType);
    setPartnerName(info.callerName);
    partnerIdRef.current = info.callerId;
    setCallStateSynced('incoming');
  }, [setCallStateSynced]);

  // ---- CALLEE: chấp nhận ----
  const acceptCall = useCallback(async () => {
    const info = incomingCallRef.current;
    if (!socket || !info) {
      console.log('[WebRTC] acceptCall: missing socket or info', { socket: !!socket, info });
      return;
    }
    console.log('[WebRTC] acceptCall: accepting call from', info.callerId, 'callType:', info.callType);

    try {
      const stream = await getMedia(info.callType);
      const pc = createPC(info.callerId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      // Gửi answer cho caller
      socket.emit('call:answer', { callerId: info.callerId, accepted: true, conversationId: info.conversationId });

      if (pendingOfferRef.current) {
        // Offer đã đến trước khi accept - xử lý ngay
        const offer = pendingOfferRef.current;
        pendingOfferRef.current = null;
        console.log('[WebRTC] Processing pending offer immediately');
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:webrtc-answer', { callerId: info.callerId, answer });
      } else {
        // Chờ offer đến từ caller
        console.log('[WebRTC] Waiting for offer from caller...');
        const waitForOffer = async (data: { offer: RTCSessionDescriptionInit; callerId: number }) => {
          console.log('[WebRTC] waitForOffer triggered, data.callerId:', data.callerId, 'info.callerId:', info.callerId);
          if (data.callerId !== info.callerId) {
            // Không phải từ caller này, bỏ qua
            console.log('[WebRTC] Ignoring offer from different caller');
            return;
          }
          console.log('[WebRTC] Got offer, creating answer...');
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('call:webrtc-answer', { callerId: info.callerId, answer });
            console.log('[WebRTC] Answer sent');
          } catch (err) {
            console.error('[WebRTC] Error processing offer:', err);
          }
        };
        socket.once('call:offer', waitForOffer);
        setTimeout(() => socket.off('call:offer', waitForOffer), 15000);
      }

    } catch (err) {
      console.error('[WebRTC] acceptCall error:', err);
      alert('Không thể truy cập camera/microphone');
      rejectCall();
    }
  }, [socket, createPC, getMedia]);

  // ---- CALLEE: nhận offer (từ CallContext listener - dùng cho renegotiation) ----
  const handleOffer = useCallback(async ({ offer, callerId }: { offer: RTCSessionDescriptionInit; callerId: number }) => {
    const pc = pcRef.current;
    const callerIdNum = Number(callerId);

    // Nếu đang connected -> renegotiation (switch to video)
    if (callStateRef.current === 'connected' && pc && partnerIdRef.current === callerIdNum) {
      console.log('[WebRTC] Renegotiation offer received');
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit('call:webrtc-answer', { callerId: callerIdNum, answer });
      return;
    }

    // Nếu đang incoming nhưng PC chưa sẵn sàng -> lưu pending
    if (callStateRef.current === 'incoming' && !pc) {
      console.log('[WebRTC] Offer arrived before PC ready, storing as pending');
      pendingOfferRef.current = offer;
      return;
    }

    // Nếu PC đã sẵn sàng (đang trong acceptCall flow)
    if (pc && incomingCallRef.current?.callerId === callerIdNum) {
      console.log('[WebRTC] handleOffer: PC ready, processing offer');
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit('call:webrtc-answer', { callerId: callerIdNum, answer });
      console.log('[WebRTC] Answer sent via handleOffer');
    } else {
      console.log('[WebRTC] handleOffer: PC not ready or callerId mismatch. pc:', !!pc, 'incomingCall:', incomingCallRef.current?.callerId, 'offerCallerId:', callerIdNum, 'callState:', callStateRef.current);
    }
  }, [socket]);

  // ---- CALLEE: từ chối ----
  const rejectCall = useCallback(() => {
    const info = incomingCallRef.current;
    if (!socket || !info) return;
    socket.emit('call:answer', { callerId: info.callerId, accepted: false });
    cleanup();
  }, [socket, cleanup]);

  // ---- Kết thúc cuộc gọi ----
  const endCall = useCallback((targetUserId?: number) => {
    const target = targetUserId ?? partnerIdRef.current;
    if (socket && target) socket.emit('call:end', { targetUserId: target });
    setCallStateSynced('ended');
    setTimeout(cleanup, 1500);
  }, [socket, cleanup, setCallStateSynced]);

  // ---- Caller nhận answer ----
  const handleWebRTCAnswer = useCallback(async ({ answer, answererId }: { answer: RTCSessionDescriptionInit; answererId?: number }) => {
    const pc = pcRef.current;
    if (!pc) { console.log('[WebRTC] handleWebRTCAnswer: no PC'); return; }
    console.log('[WebRTC] Received answer, answererId:', answererId, 'signalingState:', pc.signalingState);
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[WebRTC] Remote description set successfully');
      } else {
        console.warn('[WebRTC] Unexpected signalingState:', pc.signalingState);
      }
    } catch (error) {
      console.error('[WebRTC] Error setting remote description:', error);
    }
  }, []);

  // ---- ICE candidate ----
  const handleIceCandidate = useCallback(async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
    try {
      if (pcRef.current) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch { /* ignore */ }
  }, []);

  // ---- Đối phương kết thúc ----
  const handleCallEnded = useCallback(() => {
    setCallStateSynced('ended');
    setTimeout(cleanup, 1500);
  }, [cleanup, setCallStateSynced]);

  // ---- Chuyển từ audio sang video — chỉ thêm video track, GIỮ NGUYÊN audio track cũ ----
  const switchToVideo = useCallback(async () => {
    if (callType !== 'audio' || !pcRef.current || !socket || !partnerIdRef.current) return;
    try {
      // Chỉ xin quyền camera, KHÔNG xin lại mic để tránh mất audio track hiện tại
      const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      const pc = pcRef.current;
      const newVideoTrack = videoOnlyStream.getVideoTracks()[0];

      // Thêm video track vào PC (không replaceTrack audio)
      if (newVideoTrack) pc.addTrack(newVideoTrack, localStreamRef.current!);

      // Ghép video track mới vào stream hiện tại thay vì tạo stream mới
      const currentStream = localStreamRef.current!;
      currentStream.addTrack(newVideoTrack);

      // Cập nhật state để UI render video
      setLocalStream(new MediaStream(currentStream.getTracks()));
      setCallType('video');

      // Renegotiate với peer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call:offer', { targetUserId: partnerIdRef.current, offer });
      socket.emit('call:switch-to-video', { targetUserId: partnerIdRef.current });
      console.log('[WebRTC] Switched to video, audio track preserved');
    } catch (error) {
      console.error('Failed to switch to video:', error);
      alert('Không thể bật camera. Hãy kiểm tra quyền truy cập.');
    }
  }, [callType, socket]);

  // ---- Đối phương chuyển sang video — chỉ thêm video track, GIỮ NGUYÊN audio track cũ ----
  const handleSwitchToVideo = useCallback(async () => {
    console.log('[WebRTC] Partner switched to video');
    setCallType('video');
    if (localStreamRef.current && localStreamRef.current.getVideoTracks().length === 0) {
      try {
        // Chỉ xin camera, không xin lại mic
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        const pc = pcRef.current;
        const newVideoTrack = videoOnlyStream.getVideoTracks()[0];
        if (pc && socket && partnerIdRef.current && newVideoTrack) {
          pc.addTrack(newVideoTrack, localStreamRef.current);
          localStreamRef.current.addTrack(newVideoTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:offer', { targetUserId: partnerIdRef.current, offer });
        }
      } catch (error) {
        console.error('Failed to add video:', error);
      }
    }
  }, [socket]);

  return {
    callState, callType, partnerName, localStream, remoteStream,
    startCall, acceptCall, rejectCall, endCall, switchToVideo,
    handleIncoming, handleOffer, handleWebRTCAnswer, handleIceCandidate, handleCallEnded, handleSwitchToVideo,
  };
}
