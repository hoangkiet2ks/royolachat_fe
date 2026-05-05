import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import FriendSearch from "../friend/FriendSearch";
import FriendList from "../friend/FriendList";
import PendingRequests from "../friend/PendingRequests";
import axios from "axios";
import { useChatSocket } from "../../hooks/useChatSocket";
import { friendApi } from "../../features/friend/friend.api";

interface SidebarProps { onSelectChat: (id: string | null) => void; activeId: string | null; onOpenProfile: () => void; }

export default function SideBar({ onSelectChat, activeId, onOpenProfile }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "friends" | "requests" | "royola-bot">("chat");
  const [isBotLoading, setIsBotLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [requestRefreshTrigger, setRequestRefreshTrigger] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [conversations, setConversations] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [eligibleFriendsForGroup, setEligibleFriendsForGroup] = useState<any[]>([]);
  
  const apiUrl = import.meta.env.VITE_API_URL; // Lấy URL từ file .env

  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    window.dispatchEvent(new Event('themeChange'));
  }, [isDark]);

  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useChatSocket(session?.accessToken || null);

  useEffect(() => { if (activeTab === "chat" && session?.accessToken) fetchConversations(); }, [activeTab, session]);

  const fetchPendingCount = async () => {
    try {
      const res = await friendApi.getPendingRequests();
      if (res.data.success) setPendingCount((res.data.data || []).length);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (session?.accessToken) fetchPendingCount();
  }, [session, requestRefreshTrigger]);

  useEffect(() => {
    if (activeTab === "requests") setPendingCount(0);
  }, [activeTab]);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${apiUrl}/chat/conversations`, { headers: { Authorization: `Bearer ${session?.accessToken}` } });
      // Đảm bảo luôn là array
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (error) { 
      console.error("Lỗi tải chat:", error);
      setConversations([]); // Set empty array nếu lỗi
    }
  };

  useEffect(() => {
    if (!socket) return;
    
    // Listener cho tin nhắn mới
    const handleNewMessage = (msg: any) => {
      const convIdStr = String(msg.conversationId);
      setConversations(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(c => c.id === convIdStr);
        let previewText = msg.content;
        if (msg.type === 'IMAGE') previewText = '[Hình ảnh]';
        if (msg.type === 'FILE') previewText = msg.fileUrl?.match(/\.(mp4|webm|mov)$/i) ? '[Video]' : '[Tệp đính kèm]';

        if (idx !== -1) {
          const conv = updated[idx];
          conv.lastMsg = previewText;
          conv.time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          updated.splice(idx, 1); updated.unshift(conv);
        } else { fetchConversations(); }
        return updated;
      });

      if (activeId !== convIdStr && msg.senderId !== Number(session?.userId)) {
        setUnreadCounts(prev => ({ ...prev, [convIdStr]: (prev[convIdStr] || 0) + 1 }));
      }
    };

    // Listener cho lời mời kết bạn mới
    const handleFriendRequest = (data: { requesterId: number; requesterName: string; requesterAvatar: string | null }) => {
      console.log('[Friend] Received friend request from:', data.requesterName);
      // Tăng số lượng pending requests
      setPendingCount(prev => prev + 1);
      // Trigger refresh để cập nhật danh sách
      setRequestRefreshTrigger(prev => prev + 1);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('friend:request-received', handleFriendRequest);
    
    return () => { 
      socket.off('newMessage', handleNewMessage);
      socket.off('friend:request-received', handleFriendRequest);
    };
  }, [socket, activeId, session]);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const handleStartChatWithFriend = async (friendId: number) => {
    try {
      const res = await axios.post(`${apiUrl}/chat/conversation/1v1`, { friendId: friendId }, { headers: { Authorization: `Bearer ${session?.accessToken}` } });
      clickConversation(res.data.id.toString()); setActiveTab("chat");
    } catch (error: any) { alert(`Lỗi: ${error.response?.data?.message}`); }
  };

  const handleOpenRoyolaBot = async () => {
    const botUserId = Number(import.meta.env.VITE_BOT_USER_ID);
    if (!botUserId) {
      console.error('[RoyolaBot] VITE_BOT_USER_ID is not set in .env');
      return;
    }
    setIsBotLoading(true);
    try {
      const res = await axios.post(
        `${apiUrl}/chat/conversation/1v1`,
        { friendId: botUserId },
        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
      );
      clickConversation(res.data.id.toString());
      setActiveTab("chat");
    } catch (error: any) {
      console.error('[RoyolaBot] Failed to open bot conversation:', error);
      alert(`Lỗi: ${error.response?.data?.message || 'Không thể mở chat với Royola Bot'}`);
    } finally {
      setIsBotLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 1) return;
    try {
      const res = await axios.post(`${apiUrl}/chat/conversation/group`, { name: groupName, memberIds: selectedMembers }, { headers: { Authorization: `Bearer ${session?.accessToken}` } });
      setShowGroupModal(false); setGroupName(""); setSelectedMembers([]); fetchConversations(); clickConversation(res.data.id.toString());
    } catch (error: any) { alert(`Lỗi: ${error.response?.data?.message}`); }
  };

  const toggleMemberSelection = (friendId: number) => setSelectedMembers(prev => prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]);
  const clickConversation = (id: string) => { setUnreadCounts(prev => ({ ...prev, [id]: 0 })); onSelectChat(id); };

  const filteredConversations = useMemo(() => {
    // Đảm bảo conversations là array trước khi filter
    if (!Array.isArray(conversations)) return [];
    return conversations.filter(conv => conv.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, conversations]);
  
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (showGroupModal && session?.accessToken) {
      const fetchFriends = async () => {
        try {
          const res = await axios.get(`${apiUrl}/friend/list`, { headers: { Authorization: `Bearer ${session.accessToken}` } });
          setEligibleFriendsForGroup((res.data.data || []).map((friend: any) => ({ partnerId: friend.id, name: friend.name, avatar: friend.avatar })));
        } catch (error) { setEligibleFriendsForGroup(conversations.filter(c => !c.isGroup && c.partnerId)); }
      };
      fetchFriends();
    }
  }, [showGroupModal, session, conversations]);

  return (
    <>
      <div className="moji-sidebar-narrow">
        {session?.avatar ? (
          <img 
            src={session.avatar} 
            alt="Avatar" 
            className="moji-avatar" 
            onClick={onOpenProfile} 
            title="Xem hồ sơ của tôi"
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
          />
        ) : (
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(session?.name || 'User')}&background=cbd5e1&color=0f172a`} 
            alt="Avatar" 
            className="moji-avatar" 
            onClick={onOpenProfile} 
            title="Xem hồ sơ của tôi"
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
          />
        )}
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          <button onClick={() => setActiveTab("chat")} className={`moji-nav-btn ${activeTab === 'chat' ? 'active' : ''}`} style={{ position: 'relative' }} title="Tin nhắn">
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
            {totalUnread > 0 && <span style={{ position: 'absolute', top: '2px', right: '4px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 'bold', borderRadius: '10px', padding: '2px 5px', border: '2px solid var(--bg-panel)' }}>{totalUnread > 99 ? '99+' : totalUnread}</span>}
          </button>
          <button onClick={() => setActiveTab("friends")} className={`moji-nav-btn ${activeTab === 'friends' ? 'active' : ''}`} title="Kết bạn"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg></button>
          <button onClick={() => setActiveTab("requests")} className={`moji-nav-btn ${activeTab === 'requests' ? 'active' : ''}`} title="Lời mời kết bạn" style={{ position: 'relative' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {pendingCount > 0 && activeTab !== 'requests' && (
              <span style={{ position: 'absolute', top: '2px', right: '4px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 'bold', borderRadius: '10px', padding: '2px 5px', border: '2px solid var(--bg-panel)', minWidth: '18px', textAlign: 'center', lineHeight: '14px' }}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={handleOpenRoyolaBot}
            className={`moji-nav-btn ${activeTab === 'royola-bot' ? 'active' : ''}`}
            title="Chat với Royola Bot"
            disabled={isBotLoading}
            style={{ position: 'relative' }}
          >
            {isBotLoading ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="8" width="18" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 8V6a4 4 0 018 0v2" />
                <circle cx="9" cy="14" r="1" fill="currentColor" />
                <circle cx="15" cy="14" r="1" fill="currentColor" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.5c.833-.667 2.167-1 3-1s2.167.333 3 1" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2M7 3l1 1.5M17 3l-1 1.5" />
              </svg>
            )}
          </button>
        </div>

        <button onClick={() => setIsDark(!isDark)} className="moji-nav-btn" style={{ marginBottom: '8px' }} title="Đổi giao diện">
          {isDark ? (
            <svg width="24" height="24" fill="none" stroke="#f59e0b" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke="#6366f1" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>

        <button onClick={handleLogout} className="moji-logout-btn" title="Đăng xuất"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
      </div>

      <div className="moji-sidebar-wide">
        <div className="moji-sidebar-header">
          <h1 className="moji-logo-text">Royola Chat</h1>
          <div className="moji-search-container">
            <svg className="moji-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Tìm kiếm trò chuyện..." className="moji-search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="moji-chat-list-container">
          {activeTab === "friends" && <div className="flex flex-col h-full"><FriendSearch /><FriendList onStartChat={handleStartChatWithFriend} refreshTrigger={requestRefreshTrigger} /></div>}
          {activeTab === "requests" && <PendingRequests refreshTrigger={requestRefreshTrigger} onRequestHandled={() => { setRequestRefreshTrigger(prev => prev + 1); fetchPendingCount(); }} />}
          {activeTab === "chat" && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginBottom: '12px' }}>
                <h3 className="moji-list-title" style={{ margin: 0 }}>Cuộc trò chuyện</h3>
                <button onClick={() => setShowGroupModal(true)} style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }} title="Tạo nhóm chat mới"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
              </div>
              
              {filteredConversations.length > 0 ? (
                filteredConversations.map(conv => {
                  const unread = unreadCounts[conv.id] || 0;
                  const isActive = activeId === conv.id;

                  return (
                    <div key={conv.id} onClick={() => clickConversation(conv.id)} className={`moji-chat-item ${isActive ? 'active' : ''}`} style={{ position: 'relative', padding: '12px 10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', gap: '12px' }}>
                      {conv.avatar ? (
                        <img src={conv.avatar} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: conv.isGroup ? 'linear-gradient(135deg, #3b82f6, #2dd4bf)' : 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>
                          {conv.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="moji-chat-info" style={{ flex: 1, overflow: 'hidden' }}>
                        <div className="moji-chat-info-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <h4 className="moji-chat-name" style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: unread > 0 ? 600 : 500, color: unread > 0 ? 'var(--text-main)' : '' }}>
                            {conv.isGroup && <svg width="14" height="14" fill="none" stroke="var(--text-sub)" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                            {conv.name || 'Người dùng'}
                          </h4>
                          <span className="moji-chat-time" style={{ fontSize: '0.8rem', color: unread > 0 ? '#8b5cf6' : 'var(--text-sub)', fontWeight: unread > 0 ? 600 : 'normal' }}>{conv.time}</span>
                        </div>
                        <p className="moji-chat-preview" style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: unread > 0 ? 'var(--text-main)' : 'var(--text-sub)', fontWeight: unread > 0 ? 500 : 'normal' }}>
                          {conv.lastMsg}
                        </p>
                      </div>

                      {unread > 0 && (
                        <div style={{ position: 'absolute', right: '16px', bottom: '16px', background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 'bold', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(239,68,68,0.4)' }}>
                          {unread > 9 ? '9+' : unread}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-sub)', marginTop: '40px', fontSize: '0.9rem' }}>Chưa có cuộc trò chuyện nào.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {showGroupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
          <div className="glass-modal" style={{ width: '420px', borderRadius: '24px', padding: '32px' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', marginTop: 0, marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
              Tạo nhóm chat mới
              <div onClick={() => setShowGroupModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)', padding: '6px', background: 'var(--bg-main)', borderRadius: '50%' }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div>
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: 'var(--text-sub)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 500 }}>Tên nhóm</label>
              <input 
                type="text" 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ví dụ: Nhóm Dev..."
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', fontSize: '1rem', transition: 'border-color 0.2s' }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', color: 'var(--text-sub)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 500 }}>Chọn thành viên</label>
              <div style={{ background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border-color)', maxHeight: '220px', overflowY: 'auto', padding: '12px' }}>
                {eligibleFriendsForGroup.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.95rem' }}>Chưa có bạn bè nào.</div>
                ) : (
                  eligibleFriendsForGroup.map(friend => (
                    <div 
                      key={friend.partnerId} 
                      onClick={() => toggleMemberSelection(friend.partnerId)}
                      style={{ display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '12px', cursor: 'pointer', background: selectedMembers.includes(friend.partnerId) ? 'var(--hover-bg)' : 'transparent', transition: 'all 0.2s', border: selectedMembers.includes(friend.partnerId) ? '1px solid #8b5cf6' : '1px solid transparent' }}
                    >
                      {friend.avatar ? (
                        <img src={friend.avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '14px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', marginRight: '14px' }}>
                          {friend.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <span style={{ color: 'var(--text-main)', flex: 1, fontWeight: 500 }}>{friend.name}</span>
                      
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${selectedMembers.includes(friend.partnerId) ? '#8b5cf6' : 'var(--text-sub)'}`, background: selectedMembers.includes(friend.partnerId) ? '#8b5cf6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        {selectedMembers.includes(friend.partnerId) && <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button 
              onClick={handleCreateGroup}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', opacity: selectedMembers.length > 0 && groupName.trim() ? 1 : 0.5, boxShadow: selectedMembers.length > 0 && groupName.trim() ? '0 4px 14px rgba(139,92,246,0.4)' : 'none', transition: 'all 0.2s' }}
              disabled={selectedMembers.length === 0 || !groupName.trim()}
            >
              Khởi tạo Nhóm
            </button>
          </div>
        </div>
      )}
    </>
  );
}