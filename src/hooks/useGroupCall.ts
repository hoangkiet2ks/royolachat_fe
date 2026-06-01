import { useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import ICE_SERVERS from '../config/webrtc';

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface Participant {
  userId: number;
  name: string;
  avatar?: string | null;
  stream: MediaStream | null;
  pc: RTCPeerConnection | null;
  isJoined: boolean;
  isSpeaking: boolean;
}

interface IncomingCallInfo {
  callerId: number;
  callerName: string;
  callType: 'audio' | 'video';
  conversationId: number;
  isGroup: boolean;
}

type ParticipantInfo = { userId: number; name: string; avatar?: string | null };

export function useGroupCall(socket: Socket | null, myUserId: number | undefined) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<number, Participant>>(new Map());
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const participantsRef = useRef<Map<number, Participant>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callStateRef = useRef<CallState>('idle');
  // Buffer: lưu current-participants data nếu stream chưa sẵn sàng
  const pendingCurrentParticipantsRef = useRef<ParticipantInfo[] | null>(null);

  const updateParticipants = useCallback((updater: (prev: Map<number, Participant>) => Map<number, Participant>) => {
    const newMap = updater(new Map(participantsRef.current));
    participantsRef.current = newMap;
    setParticipants(newMap);
  }, []);

  const setCallStateSynced = useCallback((state: CallState) => {
    callStateRef.current = state;
    setCallState(state);
  }, []);

  const cleanup = useCallback(() => {
    participantsRef.current.forEach(p => {
      p.pc?.close();
      p.stream?.getTracks().forEach(t => t.stop());
    });
    participantsRef.current.clear();
    setParticipants(new Map());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pendingCurrentParticipantsRef.current = null;
    setLocalStream(null);
    setCallStateSynced('idle');
    setIncomingCall(null);
    setConversationId(null);
    setIsSpeaking(false);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, [setCallStateSynced]);

  // Voice detection cho remote streams - khai báo trước createPC
  const setupRemoteVoiceDetection = useCallback((userId: number, stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        const participant = participantsRef.current.get(userId);
        if (!participant) { audioContext.close(); return; }
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const wasSpeaking = participant.isSpeaking;
        const nowSpeaking = average > 20;
        if (wasSpeaking !== nowSpeaking) {
          updateParticipants(prev => {
            const p = prev.get(userId);
            if (p) p.isSpeaking = nowSpeaking;
            return new Map(prev);
          });
        }
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err) {
      console.error(`[VoiceDetection] Error for user ${userId}:`, err);
    }
  }, [updateParticipants]);

  const createPC = useCallback((userId: number) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('call:ice-candidate', { targetUserId: userId, candidate: e.candidate.toJSON() });
      }
    };
    pc.ontrack = (e) => {
      console.log(`[GroupCall] Received track from user ${userId}`);
      updateParticipants(prev => {
        const p = prev.get(userId);
        if (p) {
          p.stream = e.streams[0];
          setupRemoteVoiceDetection(userId, e.streams[0]);
        }
        return new Map(prev);
      });
    };
    pc.oniceconnectionstatechange = () => {
      console.log(`[GroupCall] ICE state with ${userId}:`, pc.iceConnectionState);
    };
    return pc;
  }, [socket, updateParticipants, setupRemoteVoiceDetection]);

  // Voice Activity Detection cho local stream - khai báo trước getMedia
  const setupVoiceDetection = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setIsSpeaking(average > 20);
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err) {
      console.error('[VoiceDetection] Error:', err);
    }
  }, []);

  // Helper: xử lý current-participants list với stream đã sẵn sàng
  const applyCurrentParticipants = useCallback((list: ParticipantInfo[], stream: MediaStream) => {
    // Xóa toàn bộ map cũ, rebuild từ server list
    updateParticipants(prev => {
      prev.forEach(p => p.pc?.close());
      return new Map();
    });

    list.forEach(({ userId, name, avatar }) => {
      if (userId === myUserId) return;
      const pc = createPC(userId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      updateParticipants(prev => {
        prev.set(userId, { userId, name, avatar: avatar || null, stream: null, pc, isJoined: true, isSpeaking: false });
        return new Map(prev);
      });
      // Gửi offer cho người đã có trong call
      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('call:offer', { targetUserId: userId, offer });
          console.log(`[GroupCall] Sent offer to existing participant ${userId}`);
        } catch (err) {
          console.error(`[GroupCall] Error creating offer for ${userId}:`, err);
        }
      })();
    });
  }, [myUserId, createPC, updateParticipants, socket]);

  const getMedia = useCallback(async (type: 'audio' | 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    localStreamRef.current = stream;
    setLocalStream(stream);
    setupVoiceDetection(stream);

    // Nếu call:current-participants đã đến trước khi stream sẵn sàng → xử lý ngay
    if (pendingCurrentParticipantsRef.current) {
      console.log('[GroupCall] Processing buffered current-participants');
      applyCurrentParticipants(pendingCurrentParticipantsRef.current, stream);
      pendingCurrentParticipantsRef.current = null;
    }

    return stream;
  }, [setupVoiceDetection, applyCurrentParticipants]);

  const startGroupCall = useCallback(async (
    convId: number,
    members: Array<{ id: number; name: string; avatar?: string | null }>,
    type: 'audio' | 'video',
    myName: string,
  ) => {
    if (!socket || !myUserId) return;
    setConversationId(convId);
    setCallType(type);
    setCallStateSynced('calling');
    socket.emit('call:initiate', { conversationId: convId, callType: type, callerName: myName, isGroup: true });
    try {
      const stream = await getMedia(type);
      members.forEach(member => {
        if (member.id === myUserId) return;
        const pc = createPC(member.id);
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        updateParticipants(prev => {
          prev.set(member.id, {
            userId: member.id, name: member.name, avatar: member.avatar,
            stream: null, pc, isJoined: false, isSpeaking: false,
          });
          return new Map(prev);
        });
      });
      setCallStateSynced('connected');
    } catch (err) {
      console.error('[GroupCall] Error:', err);
      cleanup();
    }
  }, [socket, myUserId, getMedia, createPC, updateParticipants, cleanup, setCallStateSynced]);

  const handleIncoming = useCallback((info: IncomingCallInfo) => {
    if (info.callerId === myUserId) return;
    setIncomingCall(info);
    setCallType(info.callType);
    setConversationId(info.conversationId);
    setCallStateSynced('incoming');
  }, [myUserId, setCallStateSynced]);

  const rejectGroupCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    socket.emit('call:answer', {
      callerId: incomingCall.callerId,
      accepted: false,
      conversationId: incomingCall.conversationId,
      isGroup: true,
    });
    cleanup();
  }, [socket, incomingCall, cleanup]);

  const acceptGroupCall = useCallback(async (members: Array<{ id: number; name: string; avatar?: string | null }>, myName?: string) => {
    if (!socket || !incomingCall || !myUserId) return;
    console.log('[GroupCall] Accepting call, members:', members);
    try {
      // getMedia trước → localStreamRef.current sẵn sàng
      // Nếu call:current-participants đến trong lúc getMedia đang chạy,
      // nó sẽ được buffer vào pendingCurrentParticipantsRef và xử lý sau khi getMedia xong
      await getMedia(incomingCall.callType);
      socket.emit('call:answer', {
        callerId: incomingCall.callerId,
        accepted: true,
        conversationId: incomingCall.conversationId,
        answererName: myName || `User ${myUserId}`,
        isGroup: true,
      });
      setCallStateSynced('connected');
      console.log('[GroupCall] Accepted, waiting for current-participants event');
    } catch (err) {
      console.error('[GroupCall] Accept error:', err);
      rejectGroupCall();
    }
  }, [socket, incomingCall, myUserId, getMedia, rejectGroupCall, setCallStateSynced]);

  const endGroupCall = useCallback(() => {
    if (socket && conversationId) {
      participantsRef.current.forEach((_, userId) => {
        socket.emit('call:end', { targetUserId: userId, conversationId });
      });
    }
    setCallStateSynced('ended');
    setTimeout(cleanup, 1500);
  }, [socket, conversationId, cleanup, setCallStateSynced]);

  // Người mới join gửi offer → người đang trong call nhận và gửi answer
  // Cũng xử lý renegotiation khi peer bật camera (PC đã tồn tại)
  const handleOffer = useCallback(async ({ offer, callerId }: { offer: RTCSessionDescriptionInit; callerId: number }) => {
    const stream = localStreamRef.current;
    if (!stream) {
      console.warn(`[GroupCall] localStream null when receiving offer from ${callerId}`);
      return;
    }

    const existing = participantsRef.current.get(callerId);

    // --- RENEGOTIATION: PC đã tồn tại và đang connected → không tạo PC mới ---
    if (existing?.pc && existing.pc.signalingState !== 'closed') {
      console.log(`[GroupCall] Renegotiation offer from ${callerId}`);
      try {
        await existing.pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await existing.pc.createAnswer();
        await existing.pc.setLocalDescription(answer);
        socket?.emit('call:webrtc-answer', { callerId, answer });

        // Kiểm tra nếu offer có video track → cập nhật callType để UI hiện video
        const hasVideoTrack = offer.sdp?.includes('m=video');
        if (hasVideoTrack) {
          setCallType('video');
          console.log(`[GroupCall] Peer ${callerId} enabled camera, switching to video UI`);
        }
      } catch (err) {
        console.error(`[GroupCall] Renegotiation error from ${callerId}:`, err);
      }
      return;
    }

    // --- NEW CONNECTION: PC chưa tồn tại → tạo mới (người mới join) ---
    if (existing?.pc) existing.pc.close();

    const pc = createPC(callerId);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    updateParticipants(prev => {
      const p = prev.get(callerId);
      if (p) { p.pc = pc; p.isJoined = true; }
      else {
        prev.set(callerId, { userId: callerId, name: `Người dùng ${callerId}`, avatar: null, stream: null, pc, isJoined: true, isSpeaking: false });
      }
      return new Map(prev);
    });
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit('call:webrtc-answer', { callerId, answer });
      console.log(`[GroupCall] Sent answer to ${callerId}`);
    } catch (err) {
      console.error(`[GroupCall] Error handling offer from ${callerId}:`, err);
    }
  }, [socket, createPC, updateParticipants]);

  const handleAnswer = useCallback(async ({ answer, answererId }: { answer: RTCSessionDescriptionInit; answererId: number }) => {
    const participant = participantsRef.current.get(answererId);
    if (!participant?.pc) return;
    // Chỉ set remote description nếu đang chờ answer (have-local-offer)
    if (participant.pc.signalingState === 'have-local-offer') {
      await participant.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } else {
      console.warn(`[GroupCall] handleAnswer: unexpected signalingState ${participant.pc.signalingState} for ${answererId}`);
    }
  }, []);

  const handleIceCandidate = useCallback(async ({ candidate, fromUserId }: { candidate: RTCIceCandidateInit; fromUserId: number }) => {
    const participant = participantsRef.current.get(fromUserId);
    if (!participant?.pc) return;
    try { await participant.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
  }, []);

  const handleCallEnded = useCallback(({ fromUserId }: { fromUserId: number }) => {
    updateParticipants(prev => {
      const p = prev.get(fromUserId);
      if (p) { p.pc?.close(); p.stream?.getTracks().forEach(t => t.stop()); prev.delete(fromUserId); }
      return new Map(prev);
    });
    if (participantsRef.current.size === 0) {
      setCallStateSynced('ended');
      setTimeout(cleanup, 1500);
    }
  }, [updateParticipants, cleanup, setCallStateSynced]);

  // Nhận danh sách người đang trong call khi mình vừa join
  const handleCurrentParticipants = useCallback(({ participants: currentList }: { participants: ParticipantInfo[] }) => {
    console.log('[GroupCall] Received current participants:', currentList);
    const stream = localStreamRef.current;
    if (!stream) {
      // Stream chưa sẵn sàng (video call đang xin quyền camera) → buffer lại
      console.warn('[GroupCall] Stream not ready, buffering current-participants');
      pendingCurrentParticipantsRef.current = currentList;
      return;
    }
    applyCurrentParticipants(currentList, stream);
  }, [applyCurrentParticipants]);

  // Người đang trong call nhận event khi có người join/từ chối
  const handleUserJoined = useCallback(({ userId, accepted, name, avatar }: { userId: number; accepted: boolean; name?: string; avatar?: string | null }) => {
    if (userId === myUserId) return;
    // Bỏ qua nếu mình chưa join (incoming/idle) - tránh tạo participant sai
    if (callStateRef.current !== 'connected' && callStateRef.current !== 'calling') return;

    console.log(`[GroupCall] User ${userId} joined, accepted: ${accepted}`);

    if (!accepted) {
      // Từ chối → xóa hẳn khỏi map
      updateParticipants(prev => {
        const existing = prev.get(userId);
        if (existing) { existing.pc?.close(); prev.delete(userId); }
        return new Map(prev);
      });
      return;
    }

    const stream = localStreamRef.current;
    if (!stream) {
      console.warn(`[GroupCall] localStream is null when user ${userId} joined`);
      return;
    }

    updateParticipants(prev => {
      const existing = prev.get(userId);
      if (existing) {
        existing.isJoined = true;
        if (name) existing.name = name;
        if (avatar) existing.avatar = avatar;
      } else {
        const pc = createPC(userId);
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        prev.set(userId, { userId, name: name || `Người dùng ${userId}`, avatar: avatar || null, stream: null, pc, isJoined: true, isSpeaking: false });
      }
      return new Map(prev);
    });
  }, [myUserId, updateParticipants, createPC]);

  const createOffersForAll = useCallback(async () => {
    for (const [userId, participant] of participantsRef.current.entries()) {
      if (!participant.pc) continue;
      try {
        const offer = await participant.pc.createOffer();
        await participant.pc.setLocalDescription(offer);
        socket?.emit('call:offer', { targetUserId: userId, offer });
      } catch (err) {
        console.error(`[GroupCall] Error creating offer for ${userId}:`, err);
      }
    }
  }, [socket]);

  // ---- Bật camera trong audio call nhóm (chỉ người ấn mới bật) ----
  const enableCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    try {
      // Chỉ xin camera, KHÔNG xin lại mic để giữ nguyên audio track
      const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      const newVideoTrack = videoOnlyStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      // Thêm video track vào stream hiện tại
      localStreamRef.current.addTrack(newVideoTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setCallType('video');

      // Gửi offer renegotiate cho tất cả participants
      for (const [userId, participant] of participantsRef.current.entries()) {
        if (!participant.pc) continue;
        try {
          participant.pc.addTrack(newVideoTrack, localStreamRef.current);
          const offer = await participant.pc.createOffer();
          await participant.pc.setLocalDescription(offer);
          socket?.emit('call:offer', { targetUserId: userId, offer });
        } catch (err) {
          console.error(`[GroupCall] enableCamera offer error for ${userId}:`, err);
        }
      }
      console.log('[GroupCall] Camera enabled, audio preserved');
    } catch (err) {
      console.error('[GroupCall] enableCamera error:', err);
      alert('Không thể bật camera. Hãy kiểm tra quyền truy cập.');
    }
  }, [socket]);

  return {
    callState,
    callType,
    localStream,
    participants: Array.from(participants.values()),
    isSpeaking,
    groupName: incomingCall?.callerName || 'Nhóm',
    startGroupCall,
    acceptGroupCall,
    rejectGroupCall,
    endGroupCall,
    enableCamera,
    handleIncoming,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    handleCallEnded,
    handleUserJoined,
    handleCurrentParticipants,
    createOffersForAll,
    incomingCall,
  };
}
