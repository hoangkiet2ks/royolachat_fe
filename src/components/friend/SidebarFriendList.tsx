import { useEffect, useState } from 'react';
import { friendApi, type UserProfile } from '../../features/friend/friend.api';

interface SidebarFriendListProps {
  refreshTrigger?: number;
  onStartChat?: (friendId: number) => void;
}

export default function SidebarFriendList({ refreshTrigger, onStartChat }: SidebarFriendListProps) {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    fetchFriends();
  }, [refreshTrigger]);

  const fetchFriends = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await friendApi.getFriendList();
      if (response.data.success) {
        setFriends(response.data.data || []);
      } else {
        setError(response.data.error || 'Không thể tải danh sách bạn');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Lỗi tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: number, friendName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm(`Bạn có chắc muốn xóa ${friendName} khỏi danh sách bạn bè?`)) {
      return;
    }

    setRemovingId(friendId);
    try {
      const response = await friendApi.removeFriend(friendId);
      if (response.data.success) {
        setFriends(friends.filter(f => f.id !== friendId));
      } else {
        alert(response.data.error || 'Không thể xóa bạn bè');
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Lỗi xóa bạn bè');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.85rem' }}>
        Đang tải...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '12px' }}>{error}</p>
        <button 
          onClick={fetchFriends}
          style={{
            background: 'var(--bg-main)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px 12px 8px' }}>
        <h3 className="moji-list-title" style={{ margin: 0 }}>Danh sách bạn bè</h3>
        <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{friends.length}</span>
      </div>

      {friends.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-sub)', fontSize: '0.85rem' }}>
          Bạn chưa có người bạn nào
        </div>
      ) : (
        <div>
          {friends.map((friend) => (
            <div 
              key={friend.id}
              className="moji-chat-item"
              style={{ 
                position: 'relative',
                padding: '12px 10px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
              onMouseEnter={() => setHoveredId(friend.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {friend.avatar ? (
                <img
                  src={friend.avatar}
                  alt={friend.name}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                  onClick={() => onStartChat && onStartChat(friend.id)}
                />
              ) : (
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 'bold',
                    flexShrink: 0,
                    fontSize: '1.2rem',
                  }}
                  onClick={() => onStartChat && onStartChat(friend.id)}
                >
                  {friend.name.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div 
                className="moji-chat-info" 
                style={{ flex: 1, overflow: 'hidden' }}
                onClick={() => onStartChat && onStartChat(friend.id)}
              >
                <h4 className="moji-chat-name" style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>
                  {friend.name}
                </h4>
                <p className="moji-chat-preview" style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>
                  {friend.phoneNumber}
                </p>
              </div>

              {/* Nút xóa luôn hiển thị */}
              <button
                onClick={(e) => handleRemoveFriend(friend.id, friend.name, e)}
                disabled={removingId === friend.id}
                style={{
                  background: hoveredId === friend.id ? '#991b1b' : '#7f1d1d',
                  color: '#fca5a5',
                  border: '1px solid #991b1b',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  cursor: removingId === friend.id ? 'not-allowed' : 'pointer',
                  opacity: hoveredId === friend.id ? 1 : 0.7,
                  transition: 'all 0.2s',
                  fontWeight: 500,
                  flexShrink: 0,
                }}
                title="Xóa bạn bè"
              >
                {removingId === friend.id ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
