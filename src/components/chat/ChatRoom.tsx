import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';

import { CreatePollModal } from './CreatePollModal';
import { PollMessage, type PollData } from './PollMessage';

// Cập nhật Interface để chứa Reaction và isPinned
interface Reaction { id: number; messageId: number; userId: number; emoji: string; }
interface ReplyInfo { id: number; content: string; type: string; sender?: { name: string }; }
interface Message { id: number; content: string; senderId: number; type: string; fileUrl?: string; isRecalled?: boolean; sender?: { name: string; avatar: string }; isPinned?: boolean; reactions?: Reaction[]; replyTo?: ReplyInfo | null; poll?: PollData; }
interface GroupMember { id: number; name: string; avatar: string | null; role: string; }
interface ChatInfo { id: number; isGroup: boolean; name: string; avatar: string | null; partnerId?: number; myRole?: string; members?: GroupMember[]; }
interface PendingRequest { id: number; user: { id: number; name: string; avatar: string | null }; inviter: { id: number; name: string; avatar: string | null }; }
interface ForwardTarget { targetId: string; name: string; avatar: string; isGroup: boolean; convId: number | null; friendId: number | null; }

interface ChatRoomProps { conversationId: number; onToggleSidebar?: () => void; sidebarCollapsed?: boolean; }

export default function ChatRoom({ conversationId, onToggleSidebar, sidebarCollapsed }: ChatRoomProps) {
  const { session } = useAuth();
  const token = session?.accessToken || null;
  const { socket, webrtc, groupCall, setActiveGroupName } = useCall();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [inputText, setInputText] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);

  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [eligibleFriends, setEligibleFriends] = useState<any[]>([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState<number[]>([]);

  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [forwardConversations, setForwardConversations] = useState<ForwardTarget[]>([]);
  const [selectedForwardTargets, setSelectedForwardTargets] = useState<ForwardTarget[]>([]);

  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  // STATE: Modal tạo bình chọn
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);

  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');

  // STATE: Quản lý ẩn hiện thanh Thông tin bên phải
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  // STATE: Theo dõi online cho nhóm
  const [onlineStatuses, setOnlineStatuses] = useState<Record<number, boolean>>({});
  // STATE: Điều khiển sổ danh sách thành viên ra
  const [isMembersExpanded, setIsMembersExpanded] = useState(false);

  // STATE: Quản lý việc hiển thị Modal chọn Admin mới khi rời nhóm
  const [showTransferAdminModal, setShowTransferAdminModal] = useState(false);
  const [selectedNewAdminId, setSelectedNewAdminId] = useState<number | null>(null);

  // STATE: Quản lý tin nhắn ghim
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinnedList, setShowPinnedList] = useState(false);

  // STATE: Bot typing & Smart Reply (Subtask 8.1, 8.2)
  const [botTyping, setBotTyping] = useState(false);
  const [smartReplies, setSmartReplies] = useState<{ messageId: number; replies: string[] } | null>(null);
  const [smartReplyLoading, setSmartReplyLoading] = useState<number | null>(null);
  const [smartReplyError, setSmartReplyError] = useState<number | null>(null);

  // STATE: Tone Editor (Subtask 8.3)
  const [toneMenuVisible, setToneMenuVisible] = useState(false);
  const [toneMenuPosition, setToneMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [toneEditLoading, setToneEditLoading] = useState(false);
  const [toneToastError, setToneToastError] = useState<string | null>(null);

  const [typingUsers, setTypingUsers] = useState<{ id: number, name: string }[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);

  // STATE TÍNH NĂNG REPLY
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  useEffect(() => {
    const handleThemeChange = () => setIsDark(localStorage.getItem('theme') !== 'light');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Detect khi user scroll lên xa khỏi cuối → hiện nút nhảy xuống
  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceFromBottom > 200);
  };

  const fetchChatData = async () => {
    if (!token || !conversationId) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      // GỌI THÊM API PINS
      const [historyRes, infoRes, pinsRes] = await Promise.all([
        axios.get(`${apiUrl}/chat/${conversationId}/messages`, config),
        axios.get(`${apiUrl}/chat/conversation/${conversationId}`, config),
        axios.get(`${apiUrl}/chat/conversation/${conversationId}/pins`, config).catch(() => ({ data: [] }))
      ]);

      const sortedMessages = historyRes.data.sort((a: any, b: any) => a.id - b.id);
      setMessages(sortedMessages);
      setChatInfo(infoRes.data);
      setPinnedMessages(pinsRes.data);
    } catch (error) { console.error('Lỗi lấy dữ liệu chat:', error); }
  };

  useEffect(() => { fetchChatData(); }, [conversationId, token]);

  useEffect(() => {
    if (!socket || !chatInfo) return;

    // Quét trạng thái online
    if (!chatInfo.isGroup && chatInfo.partnerId) {
      socket.emit('checkOnlineStatus', chatInfo.partnerId);
    } else if (chatInfo.isGroup && chatInfo.members) {
      chatInfo.members.forEach(member => {
        if (member.id !== Number(session?.userId)) socket.emit('checkOnlineStatus', member.id);
      });
    }

    const handleStatusAnswer = (data: { partnerId: number; isOnline: boolean }) => {
      if (data.partnerId === chatInfo.partnerId) setIsOnline(data.isOnline);
      setOnlineStatuses(prev => ({ ...prev, [data.partnerId]: data.isOnline }));
    };

    const handleNewMessage = (newMessage: any) => {
      if (newMessage.conversationId === conversationId) {
        setMessages((prev) => {
          const isExist = prev.some(msg => msg.id === newMessage.id);
          if (isExist) return prev;
          return [...prev, newMessage];
        });
      }
    };

    const handleMessageRecalled = (data: { messageId: number }) => setMessages(prev => prev.map(msg => msg.id === data.messageId ? { ...msg, isRecalled: true } : msg));

    const handleUserOnline = (data: { userId: number }) => {
      if (data.userId === chatInfo.partnerId) setIsOnline(true);
      setOnlineStatuses(prev => ({ ...prev, [data.userId]: true }));
    };

    const handleUserOffline = (data: { userId: number }) => {
      if (data.userId === chatInfo.partnerId) setIsOnline(false);
      setOnlineStatuses(prev => ({ ...prev, [data.userId]: false }));
    };

    const handlePinUpdated = (updatedMsg: Message) => {
      setPinnedMessages(prev => {
        if (updatedMsg.isPinned) {
          const exists = prev.find(m => m.id === updatedMsg.id);
          return exists ? prev : [updatedMsg, ...prev];
        } else {
          return prev.filter(m => m.id !== updatedMsg.id);
        }
      });
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, isPinned: updatedMsg.isPinned } : m));
    };

    const handleReactionUpdated = (data: { action: string; messageId: number; userId: number; emoji?: string }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id !== data.messageId) return msg;
        let currentReactions = msg.reactions || [];

        if (data.action === 'removed') {
          currentReactions = currentReactions.filter(r => r.userId !== data.userId);
        } else if (data.action === 'updated') {
          currentReactions = currentReactions.map(r => r.userId === data.userId ? { ...r, emoji: data.emoji! } : r);
        } else if (data.action === 'added') {
          currentReactions = [...currentReactions, { id: Date.now(), messageId: data.messageId, userId: data.userId, emoji: data.emoji! }];
        }
        return { ...msg, reactions: currentReactions };
      }));
    };

    const handleBotTyping = () => setBotTyping(true);
    const handleBotTypingStop = () => setBotTyping(false);

    const handleUserTyping = (data: { userId: number; userName: string }) => {
      setTypingUsers(prev => {
        if (prev.some(u => u.id === data.userId)) return prev;
        return [...prev, { id: data.userId, name: data.userName }];
      });
    };

    const handleUserStoppedTyping = (data: { userId: number }) => {
      setTypingUsers(prev => prev.filter(u => u.id !== data.userId));
    };

    const handlePollUpdated = (updatedPoll: PollData) => {
      setMessages(prev => prev.map(msg => {
        if (msg.poll?.id === updatedPoll.id) {
          return { ...msg, poll: updatedPoll };
        }
        return msg;
      }));
    };

    socket.on('statusAnswer', handleStatusAnswer);
    socket.on('newMessage', handleNewMessage);
    socket.on('messageRecalled', handleMessageRecalled);
    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);
    socket.on('pinUpdated', handlePinUpdated);
    socket.on('reactionUpdated', handleReactionUpdated);
    socket.on('botTyping', handleBotTyping);
    socket.on('botTypingStop', handleBotTypingStop);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);
    socket.on('pollUpdated', handlePollUpdated);

    return () => {
      socket.off('statusAnswer', handleStatusAnswer);
      socket.off('newMessage', handleNewMessage);
      socket.off('messageRecalled', handleMessageRecalled);
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
      socket.off('pinUpdated', handlePinUpdated);
      socket.off('reactionUpdated', handleReactionUpdated);
      socket.off('botTyping', handleBotTyping);
      socket.off('botTypingStop', handleBotTypingStop);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
      socket.off('pollUpdated', handlePollUpdated);
    };
  }, [socket, chatInfo, conversationId, session?.userId]);

  const webrtcRef = useRef(webrtc);
  const groupCallRef = useRef(groupCall);
  useEffect(() => { webrtcRef.current = webrtc; }, [webrtc]);
  useEffect(() => { groupCallRef.current = groupCall; }, [groupCall]);

  useEffect(() => {
    if (chatInfo?.isGroup && chatInfo.name) setActiveGroupName(chatInfo.name);
  }, [chatInfo, setActiveGroupName]);

  // ================= CÁC HÀM XỬ LÝ TIN NHẮN =================
  const handleSend = () => {
    if (!inputText.trim() || !socket) return;
    socket.emit('sendMessage', {
      conversationId,
      content: inputText,
      type: 'TEXT',
      replyToId: replyingTo?.id ?? undefined, // GẮN replyToId
    }, (res: any) => {
      if (res.status === 'success') {
        setInputText('');
        setShowEmoji(false);
        setReplyingTo(null); // XÓA REPLY SAU KHI GỬI
        socket.emit('stopTyping', { conversationId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    });
  };

  const handleCreatePoll = (title: string, options: string[]) => {
    if (!socket) return;
    socket.emit('sendMessage', {
      conversationId,
      content: '[Bình chọn]',
      type: 'POLL',
      pollData: { title, options }
    });
  };

  const handleVotePoll = (pollId: number, optionId: number) => {
    if (!socket) return;
    socket.emit('votePoll', { conversationId, pollId, optionId });
  };

  const handleAddPollOption = (pollId: number, text: string) => {
    if (!socket) return;
    socket.emit('addPollOption', { conversationId, pollId, text });
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket || !session?.userId) return;

    socket.emit('typing', { conversationId, userName: session.name || 'Ai đó' });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { conversationId });
    }, 2500);
  };

  const handleRecall = (messageId: number) => {
    if (!socket) return;
    if (!window.confirm('Thu hồi tin nhắn này?')) return;
    socket.emit('recallMessage', { messageId, conversationId });
  };

  const handleDelete = (messageId: number) => {
    if (!socket) return;
    if (!window.confirm('Xóa tin nhắn phía bạn?')) return;
    socket.emit('deleteMessage', messageId, (res: any) => {
      if (res.status === 'success') setMessages(prev => prev.filter(msg => msg.id !== messageId));
    });
  };

  const handleTogglePin = (messageId: number) => {
    if (!socket) return;
    socket.emit('togglePin', { messageId, conversationId }, (res: any) => {
      if (res && res.status === 'error') alert(res.message);
    });
    setHoveredMessageId(null);
  };

  const handleToggleReaction = (messageId: number, emoji: string) => {
    if (!socket) return;
    socket.emit('toggleReaction', { messageId, conversationId, emoji });
    setHoveredMessageId(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !socket) return;
    e.target.value = ''; setIsUploading(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const res = await axios.post(`${apiUrl}/chat/upload`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      const isVideo = file.type.startsWith('video/');
      const textContent = res.data.type === 'IMAGE' ? '[Hình ảnh]' : (isVideo ? `[Video] ${file.name}` : `[Tệp tin] ${file.name}`);
      socket.emit('sendMessage', { conversationId, content: textContent, fileUrl: res.data.fileUrl, type: res.data.type }, () => { });
    } catch (error) { alert("Lỗi upload file"); } finally { setIsUploading(false); }
  };

  // ================= CÁC HÀM XỬ LÝ NHÓM =================
  const handleKickMember = async (targetUserId: number) => {
    if (!window.confirm("Mời người này ra khỏi nhóm?")) return;
    try { await axios.post(`${apiUrl}/chat/group/${conversationId}/kick`, { targetUserId }, { headers: { Authorization: `Bearer ${token}` } }); fetchChatData(); } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };
  const handleAssignRole = async (targetUserId: number, role: string) => {
    try { await axios.post(`${apiUrl}/chat/group/${conversationId}/role`, { targetUserId, role }, { headers: { Authorization: `Bearer ${token}` } }); fetchChatData(); } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };
  const handleDisbandGroup = async () => {
    if (!window.confirm("Giải tán nhóm vĩnh viễn?")) return;
    try { await axios.delete(`${apiUrl}/chat/group/${conversationId}/disband`, { headers: { Authorization: `Bearer ${token}` } }); window.location.reload(); } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };
  const openAddMemberModal = async () => {
    try {
      const res = await axios.get(`${apiUrl}/friend/list`, { headers: { Authorization: `Bearer ${token}` } });
      const currentMemberIds = chatInfo?.members?.map(m => m.id) || [];
      setEligibleFriends((res.data.data || []).filter((f: any) => !currentMemberIds.includes(f.id))); setSelectedNewMembers([]); setShowAddMemberModal(true);
    } catch (error) { alert("Lỗi tải bạn bè"); }
  };
  const submitAddMembers = async () => {
    if (selectedNewMembers.length === 0) return;
    try {
      const res = await axios.post(`${apiUrl}/chat/group/${conversationId}/add-members`, { memberIds: selectedNewMembers }, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message); setShowAddMemberModal(false); fetchChatData();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };
  const openPendingRequestsModal = async () => {
    try {
      const res = await axios.get(`${apiUrl}/chat/group/${conversationId}/pending-requests`, { headers: { Authorization: `Bearer ${token}` } });
      setPendingRequests(res.data); setShowPendingModal(true);
    } catch (err: any) { alert("Lỗi tải danh sách chờ"); }
  };
  const handleApprove = async (requestId: number) => {
    try { await axios.post(`${apiUrl}/chat/group/request/${requestId}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } }); setPendingRequests(prev => prev.filter(req => req.id !== requestId)); fetchChatData(); } catch (err: any) { alert('Lỗi duyệt'); }
  };
  const handleReject = async (requestId: number) => {
    try { await axios.post(`${apiUrl}/chat/group/request/${requestId}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } }); setPendingRequests(prev => prev.filter(req => req.id !== requestId)); } catch (err: any) { alert('Lỗi từ chối'); }
  };

  const openForwardModal = async (msg: Message) => {
    setMessageToForward(msg);
    try {
      const [convRes, friendRes] = await Promise.all([axios.get(`${apiUrl}/chat/conversations`, { headers: { Authorization: `Bearer ${token}` } }), axios.get(`${apiUrl}/friend/list`, { headers: { Authorization: `Bearer ${token}` } })]);
      const existingConvs = convRes.data; const friendsList = friendRes.data.data || []; const targetList: ForwardTarget[] = [];
      existingConvs.forEach((c: any) => { if (c.isGroup && c.id !== conversationId.toString()) targetList.push({ targetId: `conv_${c.id}`, name: c.name, avatar: c.avatar, isGroup: true, convId: Number(c.id), friendId: null }); });
      friendsList.forEach((f: any) => {
        const existingChat = existingConvs.find((c: any) => !c.isGroup && c.partnerId === f.id);
        if (existingChat && existingChat.id === conversationId.toString()) return;
        targetList.push({ targetId: `friend_${f.id}`, name: f.name, avatar: f.avatar, isGroup: false, convId: existingChat ? Number(existingChat.id) : null, friendId: f.id });
      });
      setForwardConversations(targetList); setSelectedForwardTargets([]); setShowForwardModal(true);
    } catch (error) { alert("Lỗi tải danh sách người nhận"); }
  };

  const toggleForwardSelection = (target: ForwardTarget) => setSelectedForwardTargets(prev => { const exists = prev.find(t => t.targetId === target.targetId); if (exists) return prev.filter(t => t.targetId !== target.targetId); return [...prev, target]; });
  const submitForward = async () => {
    if (selectedForwardTargets.length === 0 || !messageToForward || !socket) return;
    for (const target of selectedForwardTargets) {
      let targetConvId = target.convId;
      if (!targetConvId && target.friendId) {
        try { const res = await axios.post(`${apiUrl}/chat/conversation/1v1`, { friendId: target.friendId }, { headers: { Authorization: `Bearer ${token}` } }); targetConvId = res.data.id; } catch (e) { continue; }
      }
      if (targetConvId) socket.emit('sendMessage', { conversationId: targetConvId, content: messageToForward.content, fileUrl: messageToForward.fileUrl, type: messageToForward.type }, () => { });
    }
    setShowForwardModal(false); setMessageToForward(null); alert('Đã chuyển tiếp tin nhắn thành công!');
  };

  const getRoleLabel = (role: string) => {
    if (role === 'ADMIN') return <span style={{ fontSize: '10px', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 'bold' }}>Trưởng nhóm</span>;
    if (role === 'DEPUTY') return <span style={{ fontSize: '10px', background: '#f59e0b', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 'bold' }}>Phó nhóm</span>;
    return null;
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!chatInfo) return;
    if (chatInfo.isGroup) {
      const members = chatInfo.members || [];
      await groupCall.startGroupCall(conversationId, members.map(m => ({ id: m.id, name: m.name, avatar: m.avatar })), type, session?.name || 'Bạn');
    } else {
      if (!chatInfo.partnerId) return;
      webrtc.startCall(chatInfo.partnerId, chatInfo.name, type, conversationId, 'Bạn');
    }
  };

  const handleSaveGroupName = async () => {
    if (!editGroupName.trim()) return setIsEditingGroupName(false);
    try {
      await axios.patch(`${apiUrl}/chat/group/${conversationId}/info`, { name: editGroupName }, { headers: { Authorization: `Bearer ${token}` } });
      setIsEditingGroupName(false); fetchChatData();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi đổi tên'); }
  };

  const handleGroupAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    e.target.value = ''; setIsUpdatingAvatar(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const uploadRes = await axios.post(`${apiUrl}/chat/upload`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      await axios.patch(`${apiUrl}/chat/group/${conversationId}/info`, { avatar: uploadRes.data.fileUrl }, { headers: { Authorization: `Bearer ${token}` } });
      fetchChatData();
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.message || 'Không thể cập nhật ảnh'));
    } finally { setIsUpdatingAvatar(false); }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử cuộc trò chuyện này?")) return;
    try {
      await axios.delete(`${apiUrl}/chat/conversation/${conversationId}/history`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages([]);
      alert("Đã xóa lịch sử trò chuyện!");
    } catch (err: any) { alert(err.response?.data?.message || "Chưa có API xóa lịch sử ở Backend, vui lòng thêm vào!"); }
  };

  const handleLeaveGroup = async (newAdminId?: number) => {
    if (chatInfo?.myRole === 'ADMIN' && chatInfo.members!.length > 1 && !newAdminId) {
      setShowTransferAdminModal(true); return;
    }
    if (!window.confirm("Bạn có chắc chắn muốn rời khỏi nhóm này?")) return;

    try {
      await axios.post(`${apiUrl}/chat/group/${conversationId}/leave`, { newAdminId: newAdminId }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Đã rời nhóm thành công!");
      window.location.reload();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi khi rời nhóm'); }
  };

  // ================= SMART REPLY =================
  const handleSmartReply = async (messageId: number, content: string) => {
    if (!token) return;
    setSmartReplyLoading(messageId);
    setSmartReplyError(null);
    setSmartReplies(null);

    const timeoutId = setTimeout(() => {
      setSmartReplyLoading(null);
      setSmartReplyError(messageId);
      setTimeout(() => setSmartReplyError(null), 3000);
    }, 5000);

    try {
      const res = await axios.post(
        `${apiUrl}/ai/smart-reply`,
        { messageContent: content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      clearTimeout(timeoutId);
      const suggestions: string[] = res.data.suggestions || [];
      setSmartReplies({ messageId, replies: suggestions.slice(0, 3) });
    } catch {
      clearTimeout(timeoutId);
      setSmartReplyLoading(null);
      setSmartReplyError(messageId);
      setTimeout(() => setSmartReplyError(null), 3000);
    } finally {
      setSmartReplyLoading(null);
    }
  };

  // ================= TONE EDITOR =================
  const shouldShowToneEditor = (text: string): boolean => text.length >= 5 && text.length <= 2000;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTextareaMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      if (start === end) {
        setToneMenuVisible(false);
        return;
      }
      const selected = inputText.substring(start, end);
      if (shouldShowToneEditor(selected)) {
        setSelectedText(selected);
        setSelectionRange({ start, end });
        const rect = input.getBoundingClientRect();
        setToneMenuPosition({
          x: Math.min(e.clientX, window.innerWidth - 280),
          y: rect.top - 56,
        });
        setToneMenuVisible(true);
      } else {
        setToneMenuVisible(false);
      }
    }, 10);
  };

  const handleToneEdit = async (mode: 'polite' | 'grammar') => {
    if (!token || !selectionRange) return;
    setToneEditLoading(true);
    setToneMenuVisible(false);

    const timeoutId = setTimeout(() => {
      setToneEditLoading(false);
      setToneToastError('Không thể chỉnh sửa, vui lòng thử lại.');
      setTimeout(() => setToneToastError(null), 3000);
    }, 10000);

    try {
      const res = await axios.post(
        `${apiUrl}/ai/tone-edit`,
        { text: selectedText, mode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      clearTimeout(timeoutId);
      const result: string = res.data.result || selectedText;
      setInputText(prev =>
        prev.substring(0, selectionRange.start) + result + prev.substring(selectionRange.end)
      );
    } catch {
      clearTimeout(timeoutId);
      setToneToastError('Không thể chỉnh sửa, vui lòng thử lại.');
      setTimeout(() => setToneToastError(null), 3000);
    } finally {
      setToneEditLoading(false);
      setSelectionRange(null);
      setSelectedText('');
    }
  };

  // Tự động lọc mảng chứa Ảnh/Video và File
  const mediaMessages = messages.filter(m => !m.isRecalled && (m.type === 'IMAGE' || (m.type === 'FILE' && m.fileUrl?.match(/\.(mp4|webm|ogg|mov)$/i))));
  const fileMessages = messages.filter(m => !m.isRecalled && m.type === 'FILE' && !m.fileUrl?.match(/\.(mp4|webm|ogg|mov)$/i));

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg-main)' }}>

      {/* CỘT TRÁI: Khu vực Chat Chính */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, transition: 'all 0.3s' }}>

        {/* HEADER */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {chatInfo?.avatar ? (
              <img src={chatInfo.avatar} alt="avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: chatInfo?.isGroup ? 'linear-gradient(135deg, #3b82f6, #2dd4bf)' : 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                {chatInfo?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div>
              <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>{chatInfo?.name || 'Đang tải...'}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                {!chatInfo?.isGroup && (
                  <>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#10b981' : 'var(--text-sub)' }}></div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 500 }}>{isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
                  </>
                )}
                {chatInfo?.isGroup && <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 500 }}>{chatInfo.members?.length || 0} thành viên</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-sub)', alignItems: 'center' }}>
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                title={sidebarCollapsed ? "Hiện thanh bên" : "Ẩn thanh bên"}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '8px', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-sub)'; }}
              >
                {sidebarCollapsed ? (
                  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                ) : (
                  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                  </svg>
                )}
              </button>
            )}
            <svg onClick={() => handleStartCall('audio')} style={{ cursor: 'pointer' }} width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            <svg onClick={() => handleStartCall('video')} style={{ cursor: 'pointer' }} width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <svg onClick={() => setShowInfoPanel(!showInfoPanel)} style={{ cursor: 'pointer', color: showInfoPanel ? '#8b5cf6' : 'currentColor', background: showInfoPanel ? 'rgba(139,92,246,0.1)' : 'transparent', padding: '4px', borderRadius: '8px', transition: 'all 0.2s' }} width="28" height="28" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>
            {chatInfo?.isGroup && (
              <svg onClick={() => setShowGroupSettings(true)} style={{ cursor: 'pointer', color: '#8b5cf6' }} width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            )}
          </div>
        </div>

        {/* THANH TIN NHẮN GHIM */}
        {pinnedMessages.length > 0 && (
          <div style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', padding: '10px 24px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', zIndex: 9 }}>
            <div onClick={() => setShowPinnedList(!showPinnedList)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '6px', borderRadius: '8px' }}>
                  <svg width="18" height="18" fill="none" stroke="#f59e0b" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17.5 11.5l2.5 2.5-4 4-2.5-2.5M6.5 11.5L4 14l4 4 2.5-2.5" /></svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 600 }}>Tin nhắn ghim ({pinnedMessages.length})</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {pinnedMessages[0].content || (pinnedMessages[0].type === 'IMAGE' ? '[Hình ảnh]' : '[Tệp đính kèm]')}
                  </span>
                </div>
              </div>
              <svg style={{ transform: showPinnedList ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s', color: 'var(--text-sub)' }} width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>

            {showPinnedList && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                {pinnedMessages.map(pm => (
                  <div key={pm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, paddingRight: '12px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 600, marginBottom: '2px' }}>{pm.sender?.name}</span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pm.content || (pm.type === 'IMAGE' ? '[Hình ảnh]' : '[Tệp đính kèm]')}
                      </span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleTogglePin(pm.id); }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', transition: '0.2s' }}>
                      Bỏ ghim
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NỘI DUNG CHAT */}
        <div ref={chatContainerRef} onScroll={handleChatScroll} style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
          {messages.map((msg, index) => {
            const isMe = msg.senderId === Number(session?.userId);
            const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);
            const isMsgRecalled = msg.isRecalled || msg.content === 'Tin nhắn đã được thu hồi';

            // SYSTEM MESSAGE
            if (msg.type === 'SYSTEM') {
              return (
                <div key={index} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', borderRadius: '999px', padding: '5px 14px', fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 500, maxWidth: '80%', textAlign: 'center' }}>
                    {msg.content}
                  </div>
                </div>
              );
            }

            const senderAvatar = msg.sender?.avatar || (!chatInfo?.isGroup ? chatInfo?.avatar : null);

            // =============================================
            // HOVER MENU - ĐÃ THÊM NÚT REPLY
            // =============================================
            const renderHoverMenu = () => (
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-panel)', padding: '4px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', zIndex: 20 }}>
                {/* CHỌN EMOJI NHANH */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRight: '1px solid var(--border-color)', paddingRight: '6px', marginRight: '2px' }}>
                  {['👍', '❤️', '😆', '😮', '😢'].map(emoji => (
                    <div
                      key={emoji}
                      onClick={() => handleToggleReaction(msg.id, emoji)}
                      style={{ cursor: 'pointer', fontSize: '1.2rem', transition: 'transform 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {emoji}
                    </div>
                  ))}
                </div>

                {/* NÚT REPLY ← MỚI THÊM */}
                <div
                  onClick={() => { setReplyingTo(msg); setHoveredMessageId(null); }}
                  style={{ padding: '6px', cursor: 'pointer', color: '#3b82f6', borderRadius: '8px', transition: 'background 0.15s' }}
                  title="Trả lời"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                </div>

                <div onClick={() => handleTogglePin(msg.id)} style={{ padding: '6px', cursor: 'pointer', color: msg.isPinned ? '#f59e0b' : 'var(--text-sub)', borderRadius: '8px' }} title={msg.isPinned ? "Bỏ ghim" : "Ghim tin nhắn"}>
                  <svg width="16" height="16" fill={msg.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17.5 11.5l2.5 2.5-4 4-2.5-2.5M6.5 11.5L4 14l4 4 2.5-2.5" /></svg>
                </div>

                <div onClick={() => openForwardModal(msg)} style={{ padding: '6px', cursor: 'pointer', color: '#3b82f6', borderRadius: '8px' }} title="Chuyển tiếp"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></div>
                {isMe && <div onClick={() => handleRecall(msg.id)} style={{ padding: '6px', cursor: 'pointer', color: 'var(--text-sub)', borderRadius: '8px' }} title="Thu hồi"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></div>}
                <div onClick={() => handleDelete(msg.id)} style={{ padding: '6px', cursor: 'pointer', color: '#ef4444', borderRadius: '8px' }} title="Xóa"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
              </div>
            );

            return (
              <div key={index} onMouseEnter={() => setHoveredMessageId(msg.id)} onMouseLeave={() => setHoveredMessageId(null)} style={{ display: 'flex', gap: '10px', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', position: 'relative', marginBottom: msg.reactions && msg.reactions.length > 0 ? '12px' : '0' }}>

                {/* Avatar */}
                {!isMe && (
                  <div style={{ width: '36px', flexShrink: 0, marginTop: 'auto', marginBottom: '4px' }}>
                    {showAvatar && (
                      senderAvatar ? (
                        <img src={senderAvatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', boxShadow: 'var(--shadow-sm)' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', boxShadow: 'var(--shadow-sm)' }}>
                          {msg.sender?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', flex: 1, position: 'relative' }}>
                  {/* Tên người gửi */}
                  {chatInfo?.isGroup && !isMe && showAvatar && <span style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '6px', marginLeft: '4px', fontWeight: 500 }}>{msg.sender?.name}</span>}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                    {/* Menu bên trái (nếu là mình) */}
                    {isMe && hoveredMessageId === msg.id && !isMsgRecalled && renderHoverMenu()}

                    {/* BONG BÓNG TIN NHẮN */}
                    <div style={{
                      padding: msg.type === 'IMAGE' && !isMsgRecalled ? '4px' : (msg.type === 'POLL' ? '0' : '12px 18px'),
                      background: msg.type === 'POLL' || isMsgRecalled ? 'transparent' : (isMe ? 'var(--msg-me-bg)' : 'var(--msg-other-bg)'),
                      color: isMsgRecalled ? 'var(--text-sub)' : (isMe ? 'var(--msg-me-text)' : 'var(--msg-other-text)'),
                      border: msg.type === 'POLL' ? 'none' : (isMsgRecalled ? '1px solid var(--border-color)' : (isMe ? 'none' : '1px solid var(--border-color)')),
                      fontStyle: isMsgRecalled ? 'italic' : 'normal',
                      fontSize: '0.95rem',
                      lineHeight: '1.5',
                      borderRadius: '20px',
                      borderBottomRightRadius: isMe ? '4px' : '20px',
                      borderBottomLeftRadius: !isMe ? '4px' : '20px',
                      maxWidth: msg.type === 'IMAGE' || msg.fileUrl?.match(/\.(mp4|webm|ogg|mov)$/i) ? '320px' : '100%',
                      overflow: msg.type === 'POLL' ? 'visible' : 'hidden',
                      boxShadow: isMsgRecalled || msg.type === 'IMAGE' || msg.type === 'POLL' ? 'none' : 'var(--shadow-sm)'
                    }}>
                      {isMsgRecalled ? (
                        <span>Tin nhắn đã được thu hồi</span>
                      ) : (
                        <>
                          {/* =============================================
                              PREVIEW REPLY TRONG BUBBLE ← MỚI THÊM
                          ============================================= */}
                          {msg.replyTo && (
                            <div style={{
                              borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.45)' : '#8b5cf6'}`,
                              paddingLeft: '10px',
                              marginBottom: '8px',
                              background: isMe ? 'rgba(0,0,0,0.12)' : 'rgba(139,92,246,0.07)',
                              borderRadius: '0 8px 8px 0',
                              padding: '6px 10px',
                            }}>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: isMe ? 'rgba(255,255,255,0.75)' : '#8b5cf6',
                                marginBottom: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                </svg>
                                {msg.replyTo.sender?.name || 'Ai đó'}
                              </div>
                              <div style={{
                                fontSize: '0.82rem',
                                color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--text-sub)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '220px'
                              }}>
                                {msg.replyTo.type === 'IMAGE'
                                  ? '📷 Hình ảnh'
                                  : msg.replyTo.type === 'FILE'
                                    ? '📎 Tệp đính kèm'
                                    : msg.replyTo.content}
                              </div>
                            </div>
                          )}

                          {(msg.type === 'TEXT' || !msg.type) && <span>{msg.content}</span>}
                          {msg.type === 'IMAGE' && <img src={msg.fileUrl} alt="Ảnh tải lên" style={{ width: '100%', borderRadius: '16px', cursor: 'pointer', display: 'block' }} onClick={() => window.open(msg.fileUrl, '_blank')} />}
                          {msg.type === 'FILE' && (
                            msg.fileUrl?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                              <video controls style={{ width: '100%', borderRadius: '16px', display: 'block', outline: 'none', backgroundColor: '#000' }}><source src={msg.fileUrl} />Video không hỗ trợ.</video>
                            ) : (
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'inherit', textDecoration: 'none', fontWeight: 500 }}>
                                <div style={{ background: isMe ? 'rgba(255,255,255,0.2)' : 'var(--bg-main)', padding: '8px', borderRadius: '10px' }}>
                                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <span style={{ textDecoration: 'underline' }}>{msg.content?.replace('[Tệp tin] ', '').replace('[Video] ', '')}</span>
                              </a>
                            )
                          )}
                          {msg.type === 'POLL' && msg.poll && (
                            <PollMessage
                              poll={msg.poll}
                              currentUserId={Number(session?.userId)}
                              onVote={handleVotePoll}
                              onAddOption={handleAddPollOption}
                            />
                          )}
                        </>
                      )}
                    </div>

                    {/* Menu bên phải (nếu là người khác) */}
                    {!isMe && hoveredMessageId === msg.id && !isMsgRecalled && renderHoverMenu()}
                  </div>

                  {/* REACTIONS — nằm dưới bubble, không dùng absolute */}
                  {!isMsgRecalled && msg.reactions && msg.reactions.length > 0 && (
                    <div style={{
                      marginTop: '4px',
                      background: 'var(--bg-panel)',
                      borderRadius: '12px',
                      padding: '2px 6px',
                      boxShadow: 'var(--shadow-sm)',
                      border: '1px solid var(--border-color)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '0.85rem',
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                    }}>
                      {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => (
                        <span key={emoji}>{emoji}</span>
                      ))}
                      {msg.reactions.length > 1 && <span style={{ marginLeft: '4px', fontWeight: 600, color: 'var(--text-sub)' }}>{msg.reactions.length}</span>}
                    </div>
                  )}

                  {/* SMART REPLY — rút gọn thành icon bóng đèn */}
                  {!isMe && !isMsgRecalled && msg.type === 'TEXT' && msg.sender && !(msg.sender as any).isBot && (
                    <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                      <button
                        onClick={() => handleSmartReply(msg.id, msg.content)}
                        disabled={smartReplyLoading === msg.id}
                        title="Gợi ý trả lời"
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: smartReplyError === msg.id ? '#ef4444' : 'var(--text-sub)',
                          borderColor: smartReplyError === msg.id ? '#ef4444' : 'var(--border-color)',
                          borderRadius: '50%',
                          width: '26px',
                          height: '26px',
                          padding: '0',
                          fontSize: '0.85rem',
                          cursor: smartReplyLoading === msg.id ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        {smartReplyLoading === msg.id ? (
                          <div style={{ width: '10px', height: '10px', border: '2px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        ) : smartReplyError === msg.id ? '⚠️' : '💡'}
                      </button>

                      {smartReplies && smartReplies.messageId === msg.id && smartReplies.replies.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {smartReplies.replies.map((reply, idx) => (
                            <button
                              key={idx}
                              onClick={() => { setInputText(reply); setSmartReplies(null); }}
                              style={{
                                background: 'rgba(139,92,246,0.08)',
                                border: '1px solid rgba(139,92,246,0.3)',
                                color: '#8b5cf6',
                                borderRadius: '12px',
                                padding: '5px 12px',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />

          {/* Nút nhảy xuống tin nhắn mới nhất */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              style={{
                position: 'sticky',
                bottom: '16px',
                alignSelf: 'flex-end',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20,
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              title="Nhảy xuống tin nhắn mới nhất"
            >
              <svg width="20" height="20" fill="none" stroke="var(--text-main)" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>

        {/* TYPING INDICATOR */}
        {typingUsers.length > 0 && (
          <div style={{ padding: '0 24px 8px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-sub)', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <span style={{ color: 'var(--text-sub)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} đang soạn tin...`
                : `${typingUsers.map(u => u.name).join(', ')} đang soạn tin...`
              }
            </span>
          </div>
        )}

        {/* BOT TYPING */}
        {botTyping && (
          <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', flexShrink: 0 }}>🤖</div>
            <div style={{ background: 'var(--msg-other-bg)', border: '1px solid var(--border-color)', borderRadius: '20px', borderBottomLeftRadius: '4px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontStyle: 'italic' }}>Royola Bot đang nhập...</span>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#8b5cf6', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ô NHẬP TIN NHẮN */}
        <div className="moji-input-area" style={{ padding: '16px 20px', background: 'var(--bg-panel)', borderTop: '1px solid var(--border-color)', position: 'relative', zIndex: 10 }}>

          {/* =============================================
              THANH PREVIEW REPLY ← MỚI THÊM
          ============================================= */}
          {replyingTo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderLeft: '3px solid #8b5cf6',
              borderRadius: '12px',
              padding: '8px 14px',
              marginBottom: '10px',
              animation: 'fadeIn 0.15s ease',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#8b5cf6',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  Đang trả lời {replyingTo.sender?.name || 'tin nhắn'}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-sub)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '400px'
                }}>
                  {replyingTo.type === 'IMAGE'
                    ? '📷 Hình ảnh'
                    : replyingTo.type === 'FILE'
                      ? '📎 Tệp đính kèm'
                      : replyingTo.content}
                </div>
              </div>
              <div
                onClick={() => setReplyingTo(null)}
                style={{
                  cursor: 'pointer',
                  color: 'var(--text-sub)',
                  padding: '4px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  marginLeft: '8px',
                  transition: 'background 0.15s',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          )}

          {showEmoji && <div style={{ position: 'absolute', bottom: '80px', right: '40px', zIndex: 50, boxShadow: 'var(--shadow-modal)', borderRadius: '12px' }}><EmojiPicker onEmojiClick={(e) => setInputText(prev => prev + e.emoji)} theme={isDark ? "dark" as any : "light" as any} /></div>}

          {/* TONE EDITOR FLOATING MENU */}
          {toneMenuVisible && (
            <div
              style={{
                position: 'fixed',
                left: toneMenuPosition.x,
                top: toneMenuPosition.y,
                zIndex: 1000,
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                display: 'flex',
                gap: '6px',
                padding: '6px',
                animation: 'fadeIn 0.15s ease',
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <button
                onClick={() => handleToneEdit('polite')}
                disabled={toneEditLoading}
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', borderRadius: '8px', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {toneEditLoading ? '...' : '🎩 Lịch sự hơn'}
              </button>
              <button
                onClick={() => handleToneEdit('grammar')}
                disabled={toneEditLoading}
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '8px', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {toneEditLoading ? '...' : '✏️ Sửa lỗi ngữ pháp'}
              </button>
            </div>
          )}

          {/* TONE TOAST ERROR */}
          {toneToastError && (
            <div style={{ position: 'absolute', bottom: '90px', left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: '#fff', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 500, zIndex: 100, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
              {toneToastError}
            </div>
          )}

          <div className="moji-chat-input-row" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', borderRadius: '24px', padding: '10px 18px', border: '1px solid var(--border-color)', transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            <svg onClick={() => fileInputRef.current?.click()} style={{ color: isUploading ? '#8b5cf6' : 'var(--text-sub)', cursor: isUploading ? 'wait' : 'pointer', marginRight: '8px', flexShrink: 0, transition: 'color 0.2s' }} width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            <svg onClick={() => setShowCreatePollModal(true)} aria-label="Tạo bình chọn" style={{ color: 'var(--text-sub)', cursor: 'pointer', marginRight: '8px', flexShrink: 0, transition: 'color 0.2s' }} width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            {isUploading && <span style={{ fontSize: '13px', color: '#8b5cf6', marginRight: '8px', whiteSpace: 'nowrap', fontWeight: 500 }}>Đang tải...</span>}

            <input
              type="text"
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              onMouseUp={handleTextareaMouseUp}
              onBlur={() => { if (!toneEditLoading) setTimeout(() => setToneMenuVisible(false), 150); }}
              placeholder={replyingTo ? `Trả lời ${replyingTo.sender?.name || ''}...` : 'Nhập tin nhắn của bạn...'}
              style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--text-main)', outline: 'none', fontSize: '1rem', minWidth: 0 }}
            />

            <svg className="emoji-hide-mobile" onClick={() => setShowEmoji(!showEmoji)} style={{ color: showEmoji ? '#8b5cf6' : 'var(--text-sub)', cursor: 'pointer', margin: '0 8px', flexShrink: 0, transition: 'color 0.2s' }} width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <button onClick={handleSend} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ transform: 'translateX(2px)' }}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg></button>
          </div>
        </div>
      </div>

      {/* CỘT PHẢI: THANH THÔNG TIN */}
      {showInfoPanel && (
        <div style={{ width: '340px', background: 'var(--bg-panel)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease' }}>

          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 600 }}>Thông tin hội thoại</h3>
            {chatInfo?.avatar ? (
              <img src={chatInfo.avatar} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto', boxShadow: 'var(--shadow-sm)' }} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: chatInfo?.isGroup ? 'linear-gradient(135deg, #3b82f6, #2dd4bf)' : 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '2rem', margin: '0 auto', boxShadow: 'var(--shadow-sm)' }}>
                {chatInfo?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <h4 style={{ margin: '12px 0 4px 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>{chatInfo?.name}</h4>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
            {chatInfo?.isGroup && (
              <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div
                  onClick={() => setIsMembersExpanded(!isMembersExpanded)}
                  style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontWeight: 600 }}>Thành viên nhóm</h4>
                    <svg style={{ transform: isMembersExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: 'var(--text-sub)' }} width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {chatInfo.members?.length} thành viên
                  </div>
                </div>

                {isMembersExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', padding: '0 16px 16px 16px', animation: 'fadeIn 0.2s ease' }}>
                    {chatInfo.members?.map(member => {
                      const isMe = member.id === Number(session?.userId);
                      const isUserOnline = isMe || onlineStatuses[member.id];
                      return (
                        <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ position: 'relative' }}>
                            {member.avatar ? (
                              <img src={member.avatar} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>{member.name.charAt(0).toUpperCase()}</div>
                            )}
                            {isUserOnline && <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-panel)' }}></div>}
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{member.name} {isMe && <span style={{ color: 'var(--text-sub)', fontWeight: 'normal' }}>(Bạn)</span>}</div>
                            {member.role !== 'MEMBER' && <div style={{ fontSize: '0.75rem', color: member.role === 'ADMIN' ? '#ef4444' : '#f59e0b', fontWeight: 600, marginTop: '2px' }}>{member.role === 'ADMIN' ? 'Trưởng nhóm' : 'Phó nhóm'}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Ảnh/Video */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between' }}>Ảnh/Video <span>{mediaMessages.length}</span></h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {mediaMessages.length === 0 ? (
                  <div style={{ gridColumn: 'span 3', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.85rem', padding: '10px 0' }}>Chưa có ảnh/video nào</div>
                ) : (
                  mediaMessages.map((msg) => (
                    <div key={msg.id} style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', background: '#000', cursor: 'pointer' }} onClick={() => window.open(msg.fileUrl, '_blank')}>
                      {msg.type === 'IMAGE' ? (
                        <img src={msg.fileUrl} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          <video src={msg.fileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '4px' }}><svg width="16" height="16" fill="#fff" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* File đính kèm */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between' }}>File đính kèm <span>{fileMessages.length}</span></h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fileMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.85rem', padding: '10px 0' }}>Chưa có file nào</div>
                ) : (
                  fileMessages.map((msg) => (
                    <a key={msg.id} href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', background: 'var(--hover-bg)', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
                      <div style={{ overflow: 'hidden' }}><div style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{msg.content?.replace('[Tệp tin] ', '') || 'File'}</div></div>
                    </a>
                  ))
                )}
              </div>
            </div>

            {/* Nút Xóa Lịch Sử & Rời Nhóm */}
            <div style={{ padding: '24px 16px' }}>
              <button
                onClick={handleClearHistory}
                style={{ width: '100%', padding: '12px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', marginBottom: '12px' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Xóa lịch sử trò chuyện
              </button>

              {chatInfo?.isGroup && (
                <button onClick={() => handleLeaveGroup()} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', marginBottom: '12px' }}>
                  Rời khỏi nhóm
                </button>
              )}
              {chatInfo?.myRole === 'ADMIN' && (
                <button onClick={handleDisbandGroup} style={{ width: '100%', padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                  Giải tán nhóm
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showGroupSettings && chatInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
          <div className="glass-modal" style={{ width: '420px', borderRadius: '24px', padding: '32px' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.3rem', marginTop: 0, marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
              Thông tin nhóm
              <div onClick={() => setShowGroupSettings(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)', padding: '6px', background: 'var(--bg-main)', borderRadius: '50%' }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div>
            </h2>

            <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '16px', marginBottom: '24px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative', width: '76px', height: '76px', margin: '0 auto 16px' }}>
                {chatInfo.avatar ? (
                  <img src={chatInfo.avatar} alt="Group Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #2dd4bf)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }}>
                    {chatInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {(chatInfo.myRole === 'ADMIN' || chatInfo.myRole === 'DEPUTY') && (
                  <>
                    <input type="file" accept="image/*" ref={groupAvatarInputRef} onChange={handleGroupAvatarChange} style={{ display: 'none' }} />
                    <div onClick={() => !isUpdatingAvatar && groupAvatarInputRef.current?.click()} style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--bg-panel)', padding: '6px', borderRadius: '50%', cursor: isUpdatingAvatar ? 'wait' : 'pointer', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', color: '#3b82f6' }} title="Đổi ảnh nhóm">
                      {isUpdatingAvatar ? <span style={{ fontSize: '10px', fontWeight: 'bold' }}>...</span> : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    </div>
                  </>
                )}
              </div>

              {isEditingGroupName ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <input type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', outline: 'none', width: '150px', fontSize: '1rem' }} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveGroupName()} />
                  <button onClick={handleSaveGroupName} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu</button>
                  <button onClick={() => setIsEditingGroupName(false)} style={{ background: 'transparent', color: 'var(--text-sub)', border: 'none', cursor: 'pointer' }}>Hủy</button>
                </div>
              ) : (
                <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {chatInfo.name}
                  {(chatInfo.myRole === 'ADMIN' || chatInfo.myRole === 'DEPUTY') && <svg onClick={() => { setEditGroupName(chatInfo.name); setIsEditingGroupName(true); }} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
                </h3>
              )}
              <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', margin: '6px 0 0' }}>{chatInfo.members?.length} thành viên</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button onClick={openAddMemberModal} style={{ flex: 1, padding: '12px', background: 'var(--hover-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, transition: 'background 0.2s' }}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Thêm người</button>
              {chatInfo.myRole === 'ADMIN' && (<button onClick={openPendingRequestsModal} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, boxShadow: '0 4px 10px rgba(245,158,11,0.3)' }}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Duyệt yêu cầu</button>)}
            </div>
            <h4 style={{ color: 'var(--text-sub)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Thành viên ({chatInfo.members?.length})</h4>
            <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '24px', paddingRight: '8px' }}>
              {chatInfo.members?.map(member => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', marginRight: '14px' }}>{member.name.charAt(0).toUpperCase()}</div><div><div style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 500 }}>{member.name} {member.id === Number(session?.userId) && <span style={{ color: 'var(--text-sub)', fontWeight: 'normal' }}>(Bạn)</span>}</div><div style={{ marginTop: '4px' }}>{getRoleLabel(member.role)}</div></div></div>
                  {member.id !== Number(session?.userId) && (<div style={{ display: 'flex', gap: '8px' }}>{chatInfo.myRole === 'ADMIN' && <button onClick={() => handleAssignRole(member.id, member.role === 'DEPUTY' ? 'MEMBER' : 'DEPUTY')} style={{ background: 'transparent', border: '1px solid #8b5cf6', color: '#8b5cf6', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>{member.role === 'DEPUTY' ? 'Giáng cấp' : 'Thăng cấp'}</button>}{(chatInfo.myRole === 'ADMIN' || (chatInfo.myRole === 'DEPUTY' && member.role === 'MEMBER')) && <button onClick={() => handleKickMember(member.id)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>Mời ra</button>}</div>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-modal" style={{ width: '420px', borderRadius: '24px', padding: '32px' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', marginTop: 0, marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>Thêm thành viên <div onClick={() => setShowAddMemberModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)', padding: '6px', background: 'var(--bg-main)', borderRadius: '50%' }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div></h2>
            <div style={{ background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border-color)', maxHeight: '280px', overflowY: 'auto', padding: '12px', marginBottom: '24px' }}>
              {eligibleFriends.length === 0 ? (<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.95rem' }}>Bạn bè của bạn đều đã ở trong nhóm này rồi.</div>) : (eligibleFriends.map(friend => (<div key={friend.id} onClick={() => setSelectedNewMembers(prev => prev.includes(friend.id) ? prev.filter(id => id !== friend.id) : [...prev, friend.id])} style={{ display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '12px', cursor: 'pointer', background: selectedNewMembers.includes(friend.id) ? 'var(--hover-bg)' : 'transparent', transition: 'background 0.2s', border: selectedNewMembers.includes(friend.id) ? '1px solid #8b5cf6' : '1px solid transparent' }}><div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', marginRight: '14px' }}>{friend.name?.charAt(0).toUpperCase()}</div><span style={{ color: 'var(--text-main)', flex: 1, fontWeight: 500 }}>{friend.name}</span><div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${selectedNewMembers.includes(friend.id) ? '#8b5cf6' : 'var(--text-sub)'}`, background: selectedNewMembers.includes(friend.id) ? '#8b5cf6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>{selectedNewMembers.includes(friend.id) && <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}</div></div>)))}
            </div>
            <button onClick={submitAddMembers} disabled={selectedNewMembers.length === 0} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', opacity: selectedNewMembers.length > 0 ? 1 : 0.5, boxShadow: selectedNewMembers.length > 0 ? '0 4px 14px rgba(139,92,246,0.4)' : 'none', transition: 'all 0.2s' }}>Gửi lời mời</button>
          </div>
        </div>
      )}

      {showPendingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-modal" style={{ width: '460px', borderRadius: '24px', padding: '32px' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', marginTop: 0, marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>Danh sách chờ duyệt <div onClick={() => setShowPendingModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)', padding: '6px', background: 'var(--bg-main)', borderRadius: '50%' }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div></h2>
            <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '8px' }}>
              {pendingRequests.length === 0 ? (<div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-sub)', background: 'var(--bg-main)', borderRadius: '16px' }}>🎉 Không có yêu cầu nào đang chờ.</div>) : (pendingRequests.map(req => (<div key={req.id} style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '16px', marginBottom: '14px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}><div style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', marginRight: '14px' }}>{req.user.name.charAt(0).toUpperCase()}</div><div><div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem' }}>{req.user.name}</div><div style={{ color: 'var(--text-sub)', fontSize: '0.85rem', marginTop: '2px' }}>Người mời: <span style={{ fontWeight: 500 }}>{req.inviter.name}</span></div></div></div><div style={{ display: 'flex', gap: '8px' }}><button onClick={() => handleApprove(req.id)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 2px 6px rgba(16,185,129,0.3)' }}>Duyệt</button><button onClick={() => handleReject(req.id)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>Từ chối</button></div></div>)))}
            </div>
          </div>
        </div>
      )}

      {showForwardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-modal" style={{ width: '420px', borderRadius: '24px', padding: '32px' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', marginTop: 0, marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>Chuyển tiếp đến... <div onClick={() => setShowForwardModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)', padding: '6px', background: 'var(--bg-main)', borderRadius: '50%' }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div></h2>
            <div style={{ background: 'var(--bg-main)', padding: '14px 18px', borderRadius: '12px', marginBottom: '24px', fontStyle: 'italic', color: 'var(--text-sub)', fontSize: '0.95rem', borderLeft: '4px solid #3b82f6' }}>{messageToForward?.type === 'IMAGE' ? '[Hình ảnh]' : (messageToForward?.type === 'FILE' ? (messageToForward.fileUrl?.match(/\.(mp4|webm|mov)$/i) ? '[Video]' : '[Tệp đính kèm]') : `"${messageToForward?.content}"`)}</div>
            <div style={{ background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border-color)', maxHeight: '250px', overflowY: 'auto', padding: '12px', marginBottom: '24px' }}>
              {forwardConversations.length === 0 ? (<div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.9rem' }}>Chưa có danh sách khả dụng.</div>) : (forwardConversations.map(target => (
                <div key={target.targetId} onClick={() => toggleForwardSelection(target)} style={{ display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '12px', cursor: 'pointer', background: selectedForwardTargets.find(t => t.targetId === target.targetId) ? 'var(--hover-bg)' : 'transparent', transition: 'background 0.2s', border: selectedForwardTargets.find(t => t.targetId === target.targetId) ? '1px solid #3b82f6' : '1px solid transparent' }}>
                  {target.avatar ? (<img src={target.avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '14px', objectFit: 'cover' }} />) : (<div style={{ width: '40px', height: '40px', borderRadius: '50%', background: target.isGroup ? '#3b82f6' : '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', marginRight: '14px' }}>{target.name?.charAt(0).toUpperCase()}</div>)}
                  <span style={{ color: 'var(--text-main)', flex: 1, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    {target.isGroup && <svg width="14" height="14" fill="none" stroke="var(--text-sub)" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    {target.name}
                  </span>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${selectedForwardTargets.find(t => t.targetId === target.targetId) ? '#3b82f6' : 'var(--text-sub)'}`, background: selectedForwardTargets.find(t => t.targetId === target.targetId) ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedForwardTargets.find(t => t.targetId === target.targetId) && <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
              )))}
            </div>
            <button onClick={submitForward} disabled={selectedForwardTargets.length === 0} style={{ width: '100%', padding: '14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', opacity: selectedForwardTargets.length > 0 ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: selectedForwardTargets.length > 0 ? '0 4px 14px rgba(59,130,246,0.4)' : 'none' }}>Gửi chuyển tiếp <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></button>
          </div>
        </div>
      )}

      {/* MODAL TRAO QUYỀN TRƯỞNG NHÓM */}
      {showTransferAdminModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-modal" style={{ width: '400px', borderRadius: '24px', padding: '32px' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', marginTop: 0, marginBottom: '16px' }}>Trao quyền Trưởng nhóm</h2>
            <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', marginBottom: '20px' }}>Bạn phải chỉ định một thành viên khác làm Trưởng nhóm trước khi rời đi.</p>

            <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '24px' }}>
              {chatInfo?.members?.filter(m => m.id !== Number(session?.userId)).map(member => (
                <div
                  key={member.id}
                  onClick={() => setSelectedNewAdminId(member.id)}
                  style={{ display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '12px', cursor: 'pointer', background: selectedNewAdminId === member.id ? 'rgba(139,92,246,0.1)' : 'transparent', border: selectedNewAdminId === member.id ? '1px solid #8b5cf6' : '1px solid transparent' }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', marginRight: '12px' }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ color: 'var(--text-main)', flex: 1, fontWeight: 500 }}>{member.name}</span>
                  {selectedNewAdminId === member.id && <svg width="20" height="20" fill="none" stroke="#8b5cf6" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowTransferAdminModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>Hủy</button>
              <button
                onClick={() => handleLeaveGroup(selectedNewAdminId!)}
                disabled={!selectedNewAdminId}
                style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, opacity: selectedNewAdminId ? 1 : 0.5 }}
              >
                Trao quyền & Rời đi
              </button>
            </div>
          </div>
        </div>
      )}

      <CreatePollModal
        isOpen={showCreatePollModal}
        onClose={() => setShowCreatePollModal(false)}
        onSubmit={handleCreatePoll}
      />
    </div>
  );
}