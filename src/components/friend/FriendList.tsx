import { useEffect, useState } from 'react'
import { friendApi, type UserProfile } from '../../features/friend/friend.api'
import Button from '../ui/Button'

interface FriendListProps {
  refreshTrigger?: number;
  onStartChat?: (friendId: number) => void; // THÊM PROP NÀY
}

export default function FriendList({ refreshTrigger, onStartChat }: FriendListProps) {
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [blockingId, setBlockingId] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  useEffect(() => {
    fetchFriends()
  }, [refreshTrigger])

  const fetchFriends = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await friendApi.getFriendList()
      if (response.data.success) {
        setFriends(response.data.data || [])
      } else {
        setError(response.data.error || 'Không thể tải danh sách bạn')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Lỗi tải danh sách')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFriend = async (friendId: number, friendName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Bạn có chắc muốn xóa ${friendName} khỏi danh sách bạn bè?`)) {
      return
    }

    setRemovingId(friendId)
    try {
      const response = await friendApi.removeFriend(friendId)
      if (response.data.success) {
        setFriends(friends.filter(f => f.id !== friendId))
      } else {
        alert(response.data.error || 'Không thể xóa bạn bè')
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Lỗi xóa bạn bè')
    } finally {
      setRemovingId(null)
    }
  }

  const handleBlockFriend = async (friend: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Bạn có chắc muốn chặn ${friend.name}? Họ sẽ không thể nhắn tin hoặc gọi điện cho bạn.`)) return

    setBlockingId(friend.id)
    try {
      await friendApi.blockUser(friend.id)
      setFriends(friends.filter(f => f.id !== friend.id))
      alert(`${friend.name} đã bị chặn.`)
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Chặn thất bại.')
    } finally {
      setBlockingId(null)
    }
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Đang tải...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '12px' }}>{error}</p>
        <Button onClick={fetchFriends} variant="secondary" style={{ padding: '6px 16px' }}>Thử lại</Button>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 8px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginBottom: '8px' }}>
        <h3 className="moji-list-title">Danh sách bạn bè</h3>
        <span style={{ fontSize: '11px', color: '#64748b' }}>{friends.length}</span>
      </div>

      {friends.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: '0.85rem' }}>
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
                display: 'flex',
                alignItems: 'center',
                padding: '12px 10px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={() => setHoveredId(friend.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {friend.avatar ? (
                <img
                  src={friend.avatar}
                  alt={friend.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginRight: '12px', border: '1px solid #374151' }}
                />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(to bottom right, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0, marginRight: '12px' }}>
                  {friend.name.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="moji-chat-info" style={{ flex: 1, overflow: 'hidden' }}>
                <h4 className="moji-chat-name" style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>{friend.name}</h4>
                <p className="moji-chat-preview" style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>{friend.phoneNumber}</p>
              </div>

              {/* Nút Chat và Xóa */}
              <div style={{ 
                display: 'flex', 
                gap: '8px',
                opacity: hoveredId === friend.id ? 1 : 0,
                transition: 'opacity 0.2s',
                pointerEvents: hoveredId === friend.id ? 'auto' : 'none'
              }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); onStartChat && onStartChat(friend.id); }}
                  style={{ 
                    background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    fontWeight: 500,
                    whiteSpace: 'nowrap'
                  }}
                >
                  Chat
                </button>
                <button
                  onClick={(e) => handleBlockFriend(friend, e)}
                  disabled={blockingId === friend.id}
                  style={{
                    background: '#450a0a',
                    color: '#fca5a5',
                    border: '1px solid #7f1d1d',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    cursor: blockingId === friend.id ? 'not-allowed' : 'pointer',
                    opacity: blockingId === friend.id ? 0.5 : 1,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}
                  title="Chặn người dùng"
                >
                  {blockingId === friend.id ? '...' : (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  )}
                </button>
                <button
                  onClick={(e) => handleRemoveFriend(friend.id, friend.name, e)}
                  disabled={removingId === friend.id}
                  style={{ 
                    background: '#991b1b', 
                    color: '#fca5a5', 
                    border: '1px solid #7f1d1d', 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    fontSize: '0.75rem', 
                    cursor: removingId === friend.id ? 'not-allowed' : 'pointer', 
                    opacity: removingId === friend.id ? 0.5 : 1,
                    fontWeight: 500,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {removingId === friend.id ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}