import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';

// ============================================================
// Dinh nghia cac loai action ma AI Agent co the gui ve Frontend
// ============================================================
interface AiClientAction {
  action: 'OPEN_CHAT';
  conversationId: number;
  targetName: string;
}

interface UseAiClientActionsParams {
  socket: Socket | null;
  /** Ham nay duoc goi khi AI yeu cau mo 1 cuoc tro chuyen cu the */
  onOpenChat: (conversationId: number) => void;
}

/**
 * Hook lang nghe su kien AI_CLIENT_ACTION tu Socket.IO.
 *
 * Luong chay:
 *   Backend (AiService) emit 'AI_CLIENT_ACTION' -> Socket.IO -> Hook nay bat duoc
 *   -> Goi callback onOpenChat(conversationId) -> DashboardPage cap nhat selectedId
 *   -> ChatRoom mo dung cuoc tro chuyen
 *
 * Su dung:
 *   const navigate = useNavigate();
 *   useAiClientActions({
 *     socket,
 *     onOpenChat: (convId) => setSelectedId(String(convId)),
 *   });
 */
export function useAiClientActions({ socket, onOpenChat }: UseAiClientActionsParams) {
  useEffect(() => {
    if (!socket) return;

    const handleAiAction = (payload: AiClientAction) => {
      console.log('[AI_CLIENT_ACTION] Nhan duoc action tu bot:', payload);

      switch (payload.action) {
        case 'OPEN_CHAT':
          // AI yeu cau mo cuoc tro chuyen voi conversationId cu the
          onOpenChat(payload.conversationId);
          break;

        default:
          console.warn('[AI_CLIENT_ACTION] Action khong xac dinh:', payload);
      }
    };

    socket.on('AI_CLIENT_ACTION', handleAiAction);

    return () => {
      socket.off('AI_CLIENT_ACTION', handleAiAction);
    };
  }, [socket, onOpenChat]);
}

// ============================================================
// Vi du su dung trong DashboardPage.tsx:
//
// import { useAiClientActions } from '../hooks/useAiClientActions';
// import { useCall } from '../context/CallContext';
//
// export default function DashboardPage() {
//   const [selectedId, setSelectedId] = useState<string | null>(null);
//   const { socket } = useCall();
//
//   // Lang nghe AI_CLIENT_ACTION de tu dong chuyen trang
//   useAiClientActions({
//     socket,
//     onOpenChat: (convId) => {
//       setSelectedId(String(convId));
//     },
//   });
//
//   // ... phan con lai giu nguyen
// }
// ============================================================
