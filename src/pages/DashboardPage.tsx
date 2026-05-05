import { useState } from "react";
import SideBar from "../components/chat/SideBar";
import UserProfile from "../components/chat/UserProfile";
import ChatRoom from "../components/chat/ChatRoom";

export default function DashboardPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Khi người dùng click chọn 1 cuộc trò chuyện
  const handleSelectChat = (id: string | null) => {
    setSelectedId(id);
    setShowProfile(false); // Đóng Profile nếu đang mở
  };

  // Khi người dùng click vào Avatar
  const handleOpenProfile = () => {
    setShowProfile(true);
    setSelectedId(null); // Tạm thời bỏ chọn chat để tập trung xem Profile
  };

  return (
    <div className="moji-dashboard">
      
      {/* Sidebar quản lý danh sách và toolbar */}
      {!sidebarCollapsed && (
        <SideBar 
          onSelectChat={handleSelectChat} 
          activeId={selectedId} 
          onOpenProfile={handleOpenProfile}
        />
      )}

      {/* KHU VỰC CHÍNH BÊN PHẢI */}
      <div className="moji-chat-area">
        
        {showProfile ? (
          // Trường hợp 1: Đang xem thông tin cá nhân
          <UserProfile onToggleSidebar={() => setSidebarCollapsed(prev => !prev)} sidebarCollapsed={sidebarCollapsed} />
        ) : selectedId ? (
          // Trường hợp 2: Đang mở một cuộc trò chuyện cụ thể
          // Lưu ý: Ép kiểu sang Number vì trong Database conversationId là số nguyên (Int)
          <ChatRoom
            conversationId={Number(selectedId.replace(/\D/g, '')) || 1}
            onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
            sidebarCollapsed={sidebarCollapsed}
          />
        ) : (
          // Trường hợp 3: Màn hình chờ mặc định
          <div className="moji-welcome">
            {/* Nút toggle sidebar trên màn hình welcome */}
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="moji-sidebar-toggle-btn"
              title={sidebarCollapsed ? "Hiện thanh bên" : "Ẩn thanh bên"}
            >
              {sidebarCollapsed ? (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                </svg>
              )}
            </button>
            <div className="moji-welcome-icon">
              <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <h2>Chào mừng bạn đến với Royola!</h2>
            <p>Chọn một người bạn hoặc nhóm chat ở thanh bên trái để bắt đầu cuộc trò chuyện.</p>
          </div>
        )}

      </div>
    </div>
  );
}