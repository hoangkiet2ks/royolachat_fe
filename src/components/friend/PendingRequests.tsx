import { useEffect, useState } from 'react'
import { friendApi, type UserProfile } from '../../features/friend/friend.api'
import Button from '../ui/Button'

interface PendingRequest {
  id: number
  requesterId: number
  receiverId: number
  requester: UserProfile
  status: 'PENDING'
  createdAt: string
  updatedAt: string
}

interface PendingRequestsProps {
  refreshTrigger?: number
  onRequestHandled?: () => void
}

export default function PendingRequests({ refreshTrigger, onRequestHandled }: PendingRequestsProps) {
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    fetchPendingRequests()
  }, [refreshTrigger])

  const fetchPendingRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await friendApi.getPendingRequests()
      if (response.data.success) {
        setRequests(response.data.data || [])
      } else {
        setError(response.data.error || 'Không thể tải danh sách lời mời')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Lỗi tải danh sách')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (requesterId: number) => {
    setActionLoading(requesterId)
    try {
      const response = await friendApi.acceptFriend(requesterId)
      if (response.data.success) {
        setRequests(requests.filter((r) => r.requesterId !== requesterId))
        onRequestHandled?.()
      } else {
        alert(response.data.error || 'Không thể chấp nhận lời mời')
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Lỗi chấp nhận lời mời')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requesterId: number) => {
    setActionLoading(requesterId)
    try {
      const response = await friendApi.rejectFriend(requesterId)
      if (response.data.success) {
        setRequests(requests.filter((r) => r.requesterId !== requesterId))
        onRequestHandled?.()
      } else {
        alert(response.data.error || 'Không thể từ chối lời mời')
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Lỗi từ chối lời mời')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Đang tải...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '12px' }}>{error}</p>
        <Button onClick={fetchPendingRequests} variant="secondary" style={{ padding: '6px 16px' }}>Thử lại</Button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 8px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginBottom: '8px' }}>
        <h3 className="moji-list-title">Lời mời chờ xử lý</h3>
        <span style={{ fontSize: '11px', color: '#64748b' }}>{requests.length}</span>
      </div>

      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: '0.85rem' }}>
          Không có lời mời nào
        </div>
      ) : (
        <div>
          {requests.map((request) => (
            <div key={request.id} className="moji-chat-item" style={{ padding: '12px 10px', cursor: 'default' }}>
              
              {request.requester.avatar ? (
                <img
                  src={request.requester.avatar}
                  alt={request.requester.name}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginRight: '12px', border: '1px solid #374151' }}
                />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(to bottom right, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0, marginRight: '12px' }}>
                  {request.requester.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="moji-chat-info">
                <h4 className="moji-chat-name">{request.requester.name}</h4>
                <p className="moji-chat-preview">{request.requester.phoneNumber}</p>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                <button
                  onClick={() => handleAccept(request.requesterId)}
                  disabled={actionLoading !== null}
                  style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {actionLoading === request.requesterId ? '...' : 'Đồng ý'}
                </button>
                <button
                  onClick={() => handleReject(request.requesterId)}
                  disabled={actionLoading !== null}
                  style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '6px', padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  {actionLoading === request.requesterId ? '...' : 'Từ chối'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}