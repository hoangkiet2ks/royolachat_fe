import { useState } from 'react'
import { friendApi, type UserProfile } from '../../features/friend/friend.api'
import Button from '../ui/Button'

interface FriendSearchProps {
  onFriendAdded?: () => void
}

export default function FriendSearch({ onFriendAdded }: FriendSearchProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập số điện thoại' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await friendApi.searchUser(phoneNumber)
      if (response.data.success && response.data.data) {
        setSearchResult(response.data.data)
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Không tìm thấy người dùng' })
        setSearchResult(null)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Lỗi tìm kiếm' })
      setSearchResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async () => {
    if (!searchResult) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await friendApi.addFriend(searchResult.id)
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Gửi lời mời thành công' })
        setSearchResult(null)
        setPhoneNumber('')
        onFriendAdded?.()
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Không thể gửi lời mời' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Lỗi gửi lời mời' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px 12px 12px', borderBottom: '1px solid #1f2937' }}>
      <h3 className="moji-list-title" style={{ marginLeft: '4px', marginBottom: '12px' }}>Tìm kiếm bạn bè</h3>

      {/* Search Input Đồng Bộ Giao Diện */}
      <div className="moji-search-container" style={{ marginBottom: '16px' }}>
        <svg className="moji-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Nhập số điện thoại..."
          className="moji-search-input"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          disabled={loading}
          style={{ paddingRight: '60px' }} 
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
            background: '#c084fc', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          {loading ? '...' : 'Tìm'}
        </button>
      </div>

      {/* Thông báo lỗi/thành công */}
      {message && (
        <div style={{
          padding: '8px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem',
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? '#34d399' : '#f87171', border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Kết quả tìm kiếm (Sử dụng moji-chat-item) */}
      {searchResult && (
        <div>
          <h3 className="moji-list-title" style={{ marginLeft: '4px', marginBottom: '8px' }}>Kết quả</h3>
          <div className="moji-chat-item" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '12px' }}>
              {searchResult.avatar ? (
                <img
                  src={searchResult.avatar}
                  alt={searchResult.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginRight: '12px', border: '1px solid #374151' }}
                />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(to bottom right, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0, marginRight: '12px' }}>
                  {searchResult.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="moji-chat-info">
                <h4 className="moji-chat-name">{searchResult.name}</h4>
                <p className="moji-chat-preview">{searchResult.phoneNumber}</p>
              </div>
            </div>
            
            <Button onClick={handleAddFriend} disabled={loading} variant="primary" style={{ width: '100%', padding: '8px' }}>
              {loading ? 'Đang gửi...' : 'Thêm bạn bè'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}