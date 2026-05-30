import axios from 'axios';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import CallModal from '../chat/CallModal';
import GroupCallModal from '../chat/GroupCallModal';

/**
 * GlobalCallHandler - Hiển thị modal cuộc gọi toàn cục
 * Dùng CallContext - không tạo socket/webrtc riêng nữa
 */
export default function GlobalCallHandler() {
  const { session } = useAuth();
  const { webrtc, groupCall, activeGroupName } = useCall();
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = session?.accessToken || null;

  return (
    <>
      {/* CALL MODAL 1-1 */}
      {webrtc.callState !== 'idle' && (
        <CallModal
          callState={webrtc.callState}
          callType={webrtc.callType}
          partnerName={webrtc.partnerName}
          localStream={webrtc.localStream}
          remoteStream={webrtc.remoteStream}
          onAccept={webrtc.acceptCall}
          onReject={webrtc.rejectCall}
          onEnd={() => webrtc.endCall()}
          onSwitchToVideo={webrtc.switchToVideo}
        />
      )}

      {/* GROUP CALL MODAL */}
      {groupCall.callState !== 'idle' && (
        <GroupCallModal
          callState={groupCall.callState}
          callType={groupCall.callType}
          groupName={groupCall.incomingCall?.callerName
            ? `Cuộc gọi từ ${groupCall.incomingCall.callerName}`
            : activeGroupName}
          localStream={groupCall.localStream}
          participants={groupCall.participants}
          isSpeaking={groupCall.isSpeaking}
          onAccept={async () => {
            const convId = groupCall.incomingCall?.conversationId;
            let members: Array<{ id: number; name: string; avatar?: string | null }> = [];
            if (convId && token) {
              try {
                const res = await axios.get(`${apiUrl}/chat/conversation/${convId}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                members = (res.data.members || []).map((m: any) => ({
                  id: m.id, name: m.name, avatar: m.avatar,
                }));
              } catch {
                members = groupCall.incomingCall
                  ? [{ id: groupCall.incomingCall.callerId, name: groupCall.incomingCall.callerName, avatar: null }]
                  : [];
              }
            }
            // Không gọi createOffersForAll ở đây - handleCurrentParticipants sẽ tạo offer
            groupCall.acceptGroupCall(members, session?.name);
          }}
          onReject={groupCall.rejectGroupCall}
          onEnd={groupCall.endGroupCall}
          onEnableCamera={groupCall.enableCamera}
        />
      )}
    </>
  );
}
