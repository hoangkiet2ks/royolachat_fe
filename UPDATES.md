# 🎉 Cập nhật mới

## ✅ Đã hoàn thành

### 1. Avatar người dùng thật trong Sidebar
**Trước:** Hiển thị "U3" hoặc avatar giả từ ui-avatars
**Sau:** Hiển thị avatar thật từ database (nếu có), fallback về ui-avatars với tên người dùng

**File thay đổi:**
- `src/components/chat/SideBar.tsx`

**Chi tiết:**
```tsx
{session?.avatar ? (
  <img src={session.avatar} alt="Avatar" ... />
) : (
  <img src={`https://ui-avatars.com/api/?name=${session?.name}`} ... />
)}
```

**CSS đảm bảo:**
- `width: 48px; height: 48px`
- `borderRadius: 50%`
- `objectFit: cover` — Đảm bảo ảnh không bị tràn ra ngoài
- `cursor: pointer`

### 2. Nút gọi điện cho cả nhóm chat
**Trước:** Chỉ hiện nút gọi điện trong chat 1-1
**Sau:** Hiện nút gọi điện cho cả chat nhóm (với thông báo tính năng đang phát triển)

**File thay đổi:**
- `src/components/chat/ChatRoom.tsx`

**Logic:**
```tsx
// Hiện nút cho cả 1-1 và nhóm
<svg onClick={() => handleStartCall('audio')} ... />
<svg onClick={() => handleStartCall('video')} ... />

// Handler kiểm tra
const handleStartCall = (type) => {
  if (chatInfo.isGroup) {
    alert('Tính năng gọi nhóm đang được phát triển...');
    return;
  }
  // ... gọi 1-1 bình thường
}
```

## 🎨 UI/UX Improvements

### Avatar không bị tràn
- Sử dụng `objectFit: cover` để ảnh luôn fit trong khung tròn
- Border radius 50% đảm bảo hình tròn hoàn hảo
- Fixed size 48x48px cho consistency

### Nút gọi điện luôn hiển thị
- User có thể thấy nút gọi điện ngay cả trong nhóm
- Thông báo rõ ràng khi tính năng chưa sẵn sàng
- Không ẩn UI, tạo expectation cho tương lai

## 🔮 Tính năng Group Call (Coming Soon)

### Kiến trúc đề xuất cho Group Call

**1. Mesh Architecture (2-4 người)**
- Mỗi người kết nối P2P với tất cả người khác
- Đơn giản, không cần server trung gian
- Giới hạn: Chỉ phù hợp cho nhóm nhỏ (2-4 người)

**2. SFU Architecture (5+ người)**
- Selective Forwarding Unit
- Mỗi người chỉ upload 1 stream lên server
- Server forward đến các người khác
- Tiết kiệm bandwidth
- Cần server SFU (mediasoup, Janus, Jitsi)

**3. MCU Architecture (Enterprise)**
- Multipoint Control Unit
- Server mix tất cả streams thành 1
- Bandwidth thấp nhất cho client
- CPU cao cho server
- Phức tạp nhất

### Implementation Steps

**Phase 1: Mesh (2-4 người)**
```typescript
// useWebRTC.ts - Mở rộng
const [peerConnections, setPeerConnections] = useState<Map<number, RTCPeerConnection>>(new Map());

// Tạo PC cho từng member
members.forEach(member => {
  const pc = createPC(member.id);
  peerConnections.set(member.id, pc);
});

// Gửi offer cho tất cả
members.forEach(member => {
  sendOffer(member.id);
});
```

**Phase 2: UI cho Group Call**
```tsx
// CallModal.tsx - Grid layout
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
  {participants.map(p => (
    <video key={p.id} srcObject={p.stream} autoPlay />
  ))}
</div>
```

**Phase 3: Backend Events**
```typescript
// chat.gateway.ts
@SubscribeMessage('group-call:join')
handleGroupCallJoin(@MessageBody() { conversationId, userId }) {
  // Thông báo cho tất cả members hiện tại
  this.server.to(`conversation_${conversationId}`).emit('group-call:new-participant', { userId });
}
```

### Challenges

1. **Bandwidth**: Mỗi người cần upload N-1 streams (N = số người)
2. **CPU**: Encode/decode nhiều streams
3. **Synchronization**: Đồng bộ audio/video giữa nhiều người
4. **UI Complexity**: Hiển thị nhiều video cùng lúc
5. **Network**: NAT traversal cho nhiều connections

### Recommended Libraries

- **mediasoup** (SFU) - Production-ready, scalable
- **Jitsi Meet** - Full solution, open source
- **Janus Gateway** - Flexible, plugin-based
- **LiveKit** - Modern, cloud-native

## 📝 Testing Checklist

### Avatar
- [ ] Upload avatar mới trong UserProfile
- [ ] Kiểm tra avatar hiện đúng trong Sidebar
- [ ] Avatar không bị méo/tràn
- [ ] Fallback về ui-avatars khi chưa có avatar
- [ ] Click avatar mở UserProfile

### Group Call Button
- [ ] Nút gọi điện hiện trong chat nhóm
- [ ] Click nút hiện thông báo "đang phát triển"
- [ ] Nút gọi điện vẫn hoạt động bình thường trong chat 1-1
- [ ] UI không bị lỗi khi switch giữa 1-1 và nhóm

## 🐛 Known Issues

1. **Group call chưa implement**: Chỉ có thông báo placeholder
2. **Audio debug logs**: Console có nhiều logs (có thể tắt sau khi debug xong)

## 🚀 Next Steps

1. Implement mesh group call (2-4 người)
2. Thêm UI grid layout cho nhiều video
3. Thêm controls: mute all, spotlight speaker
4. Thêm screen sharing
5. Migrate sang SFU cho scalability
