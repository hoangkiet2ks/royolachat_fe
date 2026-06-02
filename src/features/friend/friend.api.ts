import { http } from '../../lib/http'

export type UserProfile = {
  id: number
  name: string
  phoneNumber: string
  avatar: string | null
  email: string
}

export type Friendship = {
  id: number
  requesterId: number
  receiverId: number
  requester: UserProfile
  receiver: UserProfile
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED'
  createdAt: string | Date
  updatedAt: string | Date
}

export const friendApi = {
  // Tìm kiếm user theo số điện thoại
  searchUser(phoneNumber: string) {
    return http.post<{ success: boolean; data?: UserProfile; error?: string | null }>(
      '/friend/search',
      { phoneNumber },
    )
  },

  // Gửi lời mời kết bạn
  addFriend(receiverId: number) {
    return http.post<{ success: boolean; data?: Friendship; error?: string | null }>(
      '/friend/add',
      { receiverId },
    )
  },

  // Chấp nhận lời mời kết bạn
  acceptFriend(requesterId: number) {
    return http.post<{ success: boolean; data?: Friendship; error?: string | null }>(
      '/friend/accept',
      { requesterId },
    )
  },

  // Từ chối lời mời kết bạn
  rejectFriend(requesterId: number) {
    return http.post<{ success: boolean; data?: null; error?: string | null }>(
      '/friend/reject',
      { requesterId },
    )
  },

  // Lấy danh sách bạn bè
  getFriendList() {
    return http.get<{ success: boolean; data: UserProfile[]; error?: string | null }>(
      '/friend/list',
    )
  },

  // Lấy danh sách lời mời chờ xử lý
  getPendingRequests() {
    return http.get<{
      success: boolean
      data: {
        id: number
        requesterId: number
        receiverId: number
        requester: UserProfile
        status: 'PENDING'
        createdAt: string
        updatedAt: string
      }[]
      error?: string | null
    }>('/friend/pending')
  },

  // Xóa bạn bè
  removeFriend(friendId: number) {
    return http.post<{ success: boolean; data?: { message: string }; error?: string | null }>(
      '/friend/remove',
      { friendId },
    )
  },

  // ==========================================
  // BLOCK / UNBLOCK
  // ==========================================
  blockUser(userId: number) {
    return http.post<{ success: boolean; data?: { message: string }; error?: string | null }>(
      '/friend/block',
      { userId },
    )
  },

  unblockUser(userId: number) {
    return http.post<{ success: boolean; data?: { message: string }; error?: string | null }>(
      '/friend/unblock',
      { userId },
    )
  },

  getBlockList() {
    return http.get<{ success: boolean; data: UserProfile[]; error?: string | null }>(
      '/friend/blocked',
    )
  },

  checkBlockStatus(userId: number) {
    return http.post<{ success: boolean; data?: { blockerIds: number[] } | null; error?: string | null }>(
      '/friend/block-status',
      { userId },
    )
  },
}
