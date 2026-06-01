import { useEffect, useRef, useState } from 'react';

type CallState = 'calling' | 'incoming' | 'connected' | 'ended';

interface Participant {
  userId: number;
  name: string;
  avatar?: string | null;
  stream: MediaStream | null;
  isJoined: boolean;
  isSpeaking: boolean;
}

interface GroupCallModalProps {
  callState: CallState;
  callType: 'audio' | 'video';
  localStream: MediaStream | null;
  participants: Participant[];
  isSpeaking: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onEnableCamera?: () => void; // Bật cam trong audio call nhóm
  groupName: string;
}

export default function GroupCallModal({
  callState,
  callType,
  localStream,
  participants,
  isSpeaking,
  onAccept,
  onReject,
  onEnd,
  onEnableCamera,
  groupName,
}: GroupCallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Track userId nào đã hết timeout 15s (chưa tham gia) → ẩn tile
  const [timedOutUsers, setTimedOutUsers] = useState<Set<number>>(new Set());

  // Sync isCamOff khi callType thay đổi (audio → video khi bật camera)
  useEffect(() => {
    if (callType === 'video') setIsCamOff(false);
  }, [callType]);

  // Sync isCamOff với trạng thái thực của video tracks
  useEffect(() => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      setIsCamOff(false); // Không có camera
    } else {
      // Video track tồn tại → sync với trạng thái thực
      const allDisabled = videoTracks.every(t => !t.enabled);
      setIsCamOff(allDisabled);
    }
  }, [localStream]);

  // Timeout 15s: tự động từ chối nếu không tham gia
  useEffect(() => {
    if (callState !== 'incoming') { return; }
    const timer = setTimeout(() => {
      onReject();
    }, 15000);
    return () => clearTimeout(timer);
  }, [callState, onReject]);

  // Timeout 15s cho từng pending participant — xóa tile nếu không tham gia
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    participants.forEach(p => {
      if (!p.isJoined && !timedOutUsers.has(p.userId)) {
        const t = setTimeout(() => {
          setTimedOutUsers(prev => new Set(prev).add(p.userId));
        }, 15000);
        timers.push(t);
      }
    });
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants.map(p => p.userId).join(',')]);

  // Reset timedOut khi participant thực sự join
  useEffect(() => {
    participants.forEach(p => {
      if (p.isJoined && timedOutUsers.has(p.userId)) {
        setTimedOutUsers(prev => { const s = new Set(prev); s.delete(p.userId); return s; });
      }
    });
  }, [participants, timedOutUsers]);

  const joinedParticipants = participants.filter(p => p.isJoined);
  const totalParticipants = joinedParticipants.length + 1; // +1 là bản thân
  // Ẩn tile của người đã hết 15s mà không tham gia
  const allParticipants = participants.filter(p => !timedOutUsers.has(p.userId));

  // Debug log
  useEffect(() => {
    console.log('[GroupCallModal] Participants:', participants);
    console.log('[GroupCallModal] Joined:', joinedParticipants);
  }, [participants, joinedParticipants]);

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

  const statusText = {
    calling: 'Đang gọi nhóm...',
    incoming: `Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} nhóm`,
    connected: formatTime(elapsed),
    ended: 'Cuộc gọi đã kết thúc',
  }[callState];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', background: 'rgba(0,0,0,0.7)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        zIndex: 1,
      }}>
        <div>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>{groupName}</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0', fontSize: '0.85rem' }}>
            {statusText} · {totalParticipants} người
          </p>
        </div>
        {callState === 'connected' && (
          <button onClick={onEnd} style={{
            background: '#ef4444', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.9rem',
          }}>
            Rời khỏi
          </button>
        )}
      </div>

      {/* Incoming UI */}
      {callState === 'incoming' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
            borderRadius: '28px', padding: '48px 40px', width: '340px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #2dd4bf)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', color: '#fff', fontWeight: 'bold',
              animation: 'pulse 1.5s infinite',
            }}>
              {groupName.charAt(0).toUpperCase()}
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '1.4rem' }}>{groupName}</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0' }}>{statusText}</p>
            </div>
            <div style={{ display: 'flex', gap: '32px', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button onClick={onReject} style={rejectBtnStyle}>
                  {endIcon}
                </button>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Từ chối</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button onClick={onAccept} style={acceptBtnStyle}>
                  {callType === 'video' ? camIcon : micIcon}
                </button>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Tham gia</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid - chỉ hiện khi không phải incoming */}
      {callState !== 'incoming' && (
        <div style={{ flex: 1, padding: '8px', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{
            display: 'grid',
            // Mobile: 1 cột dọc; Desktop: auto-fit
            gridTemplateColumns: window.innerWidth <= 600
              ? '1fr'
              : allParticipants.length === 0
                ? '1fr'
                : allParticipants.length === 1
                  ? 'repeat(2, 1fr)'
                  : 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '8px',
            maxWidth: '1400px',
            margin: '0 auto',
          }}>
            {/* Local tile */}
            <VideoTile
              name="Bạn"
              avatar={null}
              stream={localStream}
              isLocal
              isMuted={isMuted}
              isCamOff={isCamOff}
              callType={callType}
              isSpeaking={isSpeaking}
            />
            {/* Remote tiles - tất cả participants, người chưa join mờ 50% */}
            {allParticipants.map(p => (
              <VideoTile
                key={p.userId}
                name={p.name}
                avatar={p.avatar}
                stream={p.stream}
                callType={callType}
                isSpeaking={p.isSpeaking}
                isPending={!p.isJoined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {callState === 'connected' && (
        <div style={{
          padding: '16px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', justifyContent: 'center', gap: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          <ControlBtn icon={isMuted ? micOffIcon : micIcon} onClick={toggleMute} active={isMuted} />
          {callType === 'video' || (localStream?.getVideoTracks().length && localStream.getVideoTracks().some(t => t.enabled)) ? (
            <ControlBtn icon={isCamOff ? camOffIcon : camIcon} onClick={toggleCam} active={isCamOff} />
          ) : (
            // Nút bật cam trong audio call — chỉ người ấn mới bật cam của họ
            onEnableCamera && (
              <ControlBtn icon={camIcon} onClick={onEnableCamera} color="#10b981" title="Bật camera" />
            )
          )}
          <ControlBtn icon={endIcon} onClick={onEnd} color="#ef4444" />
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 8px rgba(59,130,246,0.2); }
          50% { box-shadow: 0 0 0 16px rgba(59,130,246,0.05); }
        }
      `}</style>
    </div>
  );
}

// ---- VideoTile: dùng display:none thay vì conditional render để tránh mất stream ----
function VideoTile({ name, avatar, stream, isLocal, isMuted, isCamOff, callType, isSpeaking, isPending }: {
  name: string;
  avatar?: string | null;
  stream: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isCamOff?: boolean;
  callType: 'audio' | 'video';
  isSpeaking?: boolean;
  isPending?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Detect có video track trong stream không — độc lập với callType
  // Dùng state để re-render khi stream thay đổi track
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  useEffect(() => {
    if (!stream) { setHasVideoTrack(false); return; }
    const checkVideo = () => {
      const videoTracks = stream.getVideoTracks();
      setHasVideoTrack(videoTracks.length > 0 && videoTracks.some(t => t.enabled && t.readyState === 'live'));
    };
    checkVideo();
    // Lắng nghe khi track được thêm vào stream (renegotiation)
    stream.addEventListener('addtrack', checkVideo);
    stream.addEventListener('removetrack', checkVideo);
    return () => {
      stream.removeEventListener('addtrack', checkVideo);
      stream.removeEventListener('removetrack', checkVideo);
    };
  }, [stream]);

  // Gán stream vào video element
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || isLocal) return;
    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [stream, isLocal]);

  // Hiện avatar khi: không có video track, hoặc cam bị tắt, hoặc không có stream
  const showVideo = hasVideoTrack && !isCamOff && !!stream;
  const showAvatar = !showVideo;
  // Tỉ lệ tile: 16/9 nếu có video, vuông nếu chỉ audio
  const tileAspect = showVideo || callType === 'video' ? '16/9' : '1/1';

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, #1e293b, #334155)',
      borderRadius: '16px',
      overflow: 'hidden',
      aspectRatio: tileAspect,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: isPending
        ? '2px dashed rgba(255,255,255,0.25)'
        : isSpeaking ? '3px solid #10b981' : '2px solid rgba(255,255,255,0.1)',
      boxShadow: isSpeaking ? '0 0 20px rgba(16,185,129,0.5)' : 'none',
      transition: 'border 0.2s, box-shadow 0.2s, opacity 0.3s',
      opacity: isPending ? 0.45 : 1,
    }}>
      {/* Video element — hiện khi có video track live */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          display: showVideo ? 'block' : 'none',
        }}
      />

      {/* Audio element cho remote */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />}

      {/* Avatar khi không có video */}
      {showAvatar && (
        avatar ? (
          <img
            src={avatar}
            alt={name}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
        ) : (
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', color: '#fff', fontWeight: 'bold',
            zIndex: 1,
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )
      )}

      {/* Overlay + badge "Đang chờ" cho người chưa tham gia - hiển thị ở giữa thẻ */}
      {isPending && (
        <>
          {/* Overlay tối thêm */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 3,
            borderRadius: '16px',
          }} />
          {/* Text trạng thái ở giữa */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 4,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '6px 14px',
              borderRadius: '999px',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px',
              whiteSpace: 'nowrap',
            }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#f59e0b',
                animation: 'pulse-dot 1.2s infinite',
                flexShrink: 0,
              }} />
              Đang chờ tham gia...
            </div>
          </div>
        </>
      )}

      {/* Name label */}
      <div style={{
        position: 'absolute', bottom: '10px', left: '10px',
        background: 'rgba(0,0,0,0.65)', padding: '4px 10px',
        borderRadius: '8px', color: '#fff', fontSize: '0.82rem',
        fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
        zIndex: 2,
      }}>
        {name}
        {isMuted && (
          <svg width="12" height="12" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24">
            <line x1="3" y1="3" x2="21" y2="21" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
          </svg>
        )}
        {isSpeaking && (
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'pulse-dot 1s infinite' }} />
        )}
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

function ControlBtn({ icon, onClick, active, color, title }: {
  icon: React.ReactNode; onClick: () => void; active?: boolean; color?: string; title?: string;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
      background: active ? 'rgba(239,68,68,0.25)' : (color || '#374151'),
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

const micIcon = <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" /></svg>;
const micOffIcon = <svg width="22" height="22" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" /><line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" strokeWidth={2} /></svg>;
const camIcon = <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const camOffIcon = <svg width="22" height="22" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" strokeWidth={2} /></svg>;
const endIcon = <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a16.003 16.003 0 0114.995 14.5.75.75 0 01-.745.5H17a1 1 0 01-.98-.804l-.295-1.473a1 1 0 00-.704-.76l-3.522-1.057a1 1 0 00-1.052.352L9.5 15.5a11.035 11.035 0 01-4-4l1.742-.948a1 1 0 00.352-1.052L6.537 6.978a1 1 0 00-.76-.704L4.304 6.02A1 1 0 003.5 5.04V3.755A.75.75 0 014 3h1z" /></svg>;
