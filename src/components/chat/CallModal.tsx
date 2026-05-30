import { useEffect, useRef, useState } from 'react';

type CallState = 'calling' | 'incoming' | 'connected' | 'ended';

interface CallModalProps {
  callState: CallState;
  callType: 'audio' | 'video';
  partnerName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onSwitchToVideo?: () => void; // Thêm callback chuyển sang video
}

export default function CallModal({
  callState,
  callType,
  partnerName,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  onSwitchToVideo,
}: CallModalProps) {
  // Refs luôn tồn tại, không bị unmount
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [callingTimeout, setCallingTimeout] = useState(false);

  // Timeout 15s khi đang gọi chờ đối phương bắt máy
  useEffect(() => {
    if (callState !== 'calling') { setCallingTimeout(false); return; }
    const timer = setTimeout(() => {
      setCallingTimeout(true);
      onEnd(); // Tự động kết thúc sau 15s
    }, 15000);
    return () => clearTimeout(timer);
  }, [callState, onEnd]);

  // Reset mute state khi localStream thay đổi
  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        setIsMuted(!audioTrack.enabled);
      }
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        setIsCamOff(!videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Gán localStream vào video element ngay khi có
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (localStream) {
      el.srcObject = localStream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [localStream]);

  // Gán remoteStream vào video/audio element ngay khi có
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    const audioEl = remoteAudioRef.current;

    if (remoteStream) {
      if (videoEl) {
        videoEl.srcObject = remoteStream;
        videoEl.play().catch(() => {});
      }
      if (audioEl) {
        audioEl.srcObject = remoteStream;
        audioEl.play().catch(() => {});
      }
    } else {
      if (videoEl) videoEl.srcObject = null;
      if (audioEl) audioEl.srcObject = null;
    }
  }, [remoteStream]);

  // Đếm thời gian khi connected
  useEffect(() => {
    if (callState !== 'connected') return;
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [callState]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => (t.enabled = !t.enabled));
    setIsMuted(m => !m);
  };

  const toggleCam = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => (t.enabled = !t.enabled));
    setIsCamOff(c => !c);
  };

  const isVideoConnected = callType === 'video' && callState === 'connected';

  const statusText = {
    calling: 'Đang gọi...',
    incoming: `Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} đến`,
    connected: formatTime(elapsed),
    ended: 'Cuộc gọi đã kết thúc',
  }[callState];  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: isVideoConnected ? '#000' : 'rgba(10,10,20,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>

      {/* ===== VIDEO ELEMENTS - LUÔN TỒN TẠI TRONG DOM ===== */}

      {/* Remote video - full screen khi connected, ẩn khi chưa */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          display: isVideoConnected ? 'block' : 'none',
        }}
      />

      {/* Local video - PiP góc dưới phải khi connected, ẩn khi chưa */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          bottom: '100px', right: '24px',
          width: '160px', height: '100px',
          objectFit: 'cover',
          borderRadius: '12px',
          border: '2px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          display: isVideoConnected ? 'block' : 'none',
          zIndex: 100000,
        }}
      />

      {/* Audio element cho remote (luôn tồn tại) */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* ===== OVERLAY KHI VIDEO CONNECTED ===== */}
      {isVideoConnected && (
        <>
          {/* Tên + thời gian */}
          <div style={{
            position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
            color: '#fff', fontSize: '0.9rem',
            background: 'rgba(0,0,0,0.4)', padding: '6px 16px', borderRadius: '20px',
            zIndex: 100001,
          }}>
            {partnerName} · {formatTime(elapsed)}
          </div>

          {/* Controls */}
          <div style={{
            position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '20px', alignItems: 'center',
            zIndex: 100001,
          }}>
            <ControlBtn icon={isMuted ? micOffIcon : micIcon} onClick={toggleMute} active={isMuted} color="#374151" />
            <ControlBtn icon={isCamOff ? camOffIcon : camIcon} onClick={toggleCam} active={isCamOff} color="#374151" />
            <ControlBtn icon={endIcon} onClick={onEnd} color="#ef4444" size="lg" />
          </div>
        </>
      )}

      {/* ===== CARD UI KHI CHƯA CONNECTED (calling / incoming / audio) ===== */}
      {!isVideoConnected && (
        <div style={{
          background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
          borderRadius: '28px', padding: '48px 40px', width: '340px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          border: '1px solid rgba(139,92,246,0.3)',
          position: 'relative', zIndex: 100001,
        }}>
          {/* Avatar */}
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', color: '#fff', fontWeight: 'bold',
            boxShadow: '0 0 0 8px rgba(139,92,246,0.2)',
            animation: callState === 'calling' || callState === 'incoming' ? 'pulse 1.5s infinite' : 'none',
          }}>
            {partnerName.charAt(0).toUpperCase()}
          </div>

          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>{partnerName}</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0', fontSize: '0.95rem' }}>{statusText}</p>
          </div>

          {/* Buttons */}
          {callState === 'incoming' ? (
            <div style={{ display: 'flex', gap: '32px', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button onClick={onReject} style={rejectBtnStyle}>{endIcon}</button>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Từ chối</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button onClick={onAccept} style={acceptBtnStyle}>
                  {callType === 'video' ? camIcon : micIcon}
                </button>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Chấp nhận</span>
              </div>
            </div>
          ) : callState === 'connected' ? (
            <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
              <ControlBtn icon={isMuted ? micOffIcon : micIcon} onClick={toggleMute} active={isMuted} color="#374151" />
              {callType === 'audio' && onSwitchToVideo && (
                <ControlBtn icon={camIcon} onClick={onSwitchToVideo} color="#10b981" />
              )}
              <ControlBtn icon={endIcon} onClick={onEnd} color="#ef4444" size="lg" />
            </div>
          ) : (
            <button onClick={onEnd} style={rejectBtnStyle}>{endIcon}</button>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 8px rgba(139,92,246,0.2); }
          50% { box-shadow: 0 0 0 16px rgba(139,92,246,0.05); }
        }
      `}</style>
    </div>
  );
}

// ---- Sub-components & styles ----

function ControlBtn({ icon, onClick, active, color, size }: {
  icon: React.ReactNode; onClick: () => void;
  active?: boolean; color: string; size?: 'lg';
}) {
  const dim = size === 'lg' ? '64px' : '52px';
  return (
    <button onClick={onClick} style={{
      width: dim, height: dim, borderRadius: '50%', border: 'none', cursor: 'pointer',
      background: active ? 'rgba(239,68,68,0.2)' : color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: color === '#ef4444' ? '0 4px 16px rgba(239,68,68,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
      transition: 'transform 0.1s',
    }}
      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {icon}
    </button>
  );
}

const rejectBtnStyle: React.CSSProperties = {
  width: '64px', height: '64px', borderRadius: '50%', border: 'none',
  background: '#ef4444', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
};

const acceptBtnStyle: React.CSSProperties = {
  width: '64px', height: '64px', borderRadius: '50%', border: 'none',
  background: '#10b981', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
};

const micIcon = <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" /></svg>;
const micOffIcon = <svg width="24" height="24" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" /><line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" strokeWidth={2} /></svg>;
const camIcon = <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const camOffIcon = <svg width="24" height="24" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" strokeWidth={2} /></svg>;
const endIcon = <svg width="24" height="24" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a16.003 16.003 0 0114.995 14.5.75.75 0 01-.745.5H17a1 1 0 01-.98-.804l-.295-1.473a1 1 0 00-.704-.76l-3.522-1.057a1 1 0 00-1.052.352L9.5 15.5a11.035 11.035 0 01-4-4l1.742-.948a1 1 0 00.352-1.052L6.537 6.978a1 1 0 00-.76-.704L4.304 6.02A1 1 0 003.5 5.04V3.755A.75.75 0 014 3h1z" /></svg>;
