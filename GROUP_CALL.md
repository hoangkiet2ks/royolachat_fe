# 📞 Group Call - Gọi điện nhóm

## ✅ Đã hoàn thành

### Tính năng
- ✅ Gọi thoại nhóm (audio)
- ✅ Gọi video nhóm (video)
- ✅ Hiển thị grid layout cho nhiều người
- ✅ Mute/unmute mic
- ✅ Bật/tắt camera (video call)
- ✅ Đếm thời gian cuộc gọi
- ✅ Hiển thị số người tham gia
- ✅ Rời khỏi cuộc gọi

### Kiến trúc: Mesh P2P
- Mỗi người kết nối trực tiếp với tất cả người khác
- Không cần server trung gian (SFU/MCU)
- Phù hợp cho nhóm nhỏ (2-6 người)

### Files đã tạo/sửa

**Backend:**
- `chat.gateway.ts` — Thêm hỗ trợ `isGroup` trong `call:initiate`

**Frontend:**
- `useGroupCall.ts` — Hook quản lý nhiều PeerConnections
- `GroupCallModal.tsx` — UI grid layout cho group call
- `ChatRoom.tsx` — Tích hợp group call

## 🎨 UI Features

### Grid Layout
- **1 người:** 1 cột (chỉ mình)
- **2 người:** 2 cột (1 hàng)
- **3-4 người:** 2x2 grid
- **5+ người:** Auto-fit grid (minmax 300px)

### Video Tiles
- Hiển thị video nếu có camera
- Fallback về avatar nếu tắt camera hoặc audio call
- Tên người dùng ở góc dưới trái
- Icon mute nếu người đó tắt mic

### Controls
- Nút Mic (bật/tắt)
- Nút Camera (bật/tắt) — chỉ video call
- Nút End (màu đỏ) — rời khỏi cuộc gọi

## 🔧 Cách hoạt động

### 1. Bắt đầu cuộc gọi
```typescript
// User A click nút gọi trong nhóm
groupCall.startGroupCall(conversationId, members, 'video', 'User A');

// Backend gửi thông báo đến tất cả members
socket.to(`conversation_${conversationId}`).emit('call:incoming', {...});
```

### 2. Người khác tham gia
```typescript
// User B, C, D nhận thông báo
groupCall.handleIncoming(info);

// Click "Tham gia"
groupCall.acceptGroupCall(members);
```

### 3. WebRTC Mesh
```
User A ←→ User B
  ↓  ×    ↓
User C ←→ User D

Mỗi người có N-1 PeerConnections (N = số người)
```

### 4. Signaling Flow
```
User A                    Backend                    User B
  |                          |                          |
  |--- call:initiate ------->|                          |
  |                          |--- call:incoming ------->|
  |                          |                          |
  |                          |<--- call:answer ---------|
  |<--- call:answered -------|                          |
  |                          |                          |
  |--- call:offer ---------->|                          |
  |                          |--- call:offer ---------->|
  |                          |                          |
  |                          |<--- call:webrtc-answer --|
  |<--- call:webrtc-answer --|                          |
  |                          |                          |
  |<======= ICE candidates exchange (bidirectional) ====>|
  |                          |                          |
  |<=============== P2P Media Streams ==================>|
```

## 📊 Bandwidth Requirements

### Upload (mỗi người)
- **Audio:** ~50 Kbps × (N-1) người
- **Video 720p:** ~1.5 Mbps × (N-1) người

### Ví dụ: 4 người video call
- Mỗi người upload: 1.5 Mbps × 3 = **4.5 Mbps**
- Mỗi người download: 1.5 Mbps × 3 = **4.5 Mbps**
- Tổng bandwidth: **9 Mbps** per person

### Giới hạn thực tế
- **2-4 người:** Hoạt động tốt
- **5-6 người:** Có thể lag nếu mạng yếu
- **7+ người:** Cần SFU (không khuyến khích mesh)

## 🚀 Cách sử dụng

### 1. Vào chat nhóm
- Mở bất kỳ nhóm chat nào

### 2. Bắt đầu cuộc gọi
- Click icon **điện thoại** (audio) hoặc **camera** (video)
- Cho phép truy cập mic/camera khi trình duyệt hỏi

### 3. Người khác tham gia
- Các thành viên khác sẽ nhận thông báo
- Click "Tham gia" để vào cuộc gọi

### 4. Trong cuộc gọi
- Bật/tắt mic bằng nút Mic
- Bật/tắt camera bằng nút Camera (video call)
- Click "Rời khỏi" để kết thúc

## ⚠️ Lưu ý

### Giới hạn
- **Mesh architecture:** Chỉ phù hợp 2-6 người
- **Bandwidth:** Cần mạng tốt (upload ≥ 5 Mbps cho 4 người)
- **CPU:** Encode/decode nhiều streams tốn CPU

### Browser Support
- Chrome/Edge 80+
- Firefox 75+
- Safari 14+
- **Không hỗ trợ:** IE, các browser cũ

### Network
- **STUN servers:** Google STUN (miễn phí)
- **TURN server:** Chưa có (cần cho NAT traversal)
- **Firewall:** Có thể block WebRTC

## 🐛 Troubleshooting

### Không nghe/thấy người khác
1. Kiểm tra Console (F12) xem có lỗi không
2. Kiểm tra ICE connection state: `connected`
3. Kiểm tra audio/video tracks có enabled không
4. Thử refresh và join lại

### Lag/Choppy video
1. Giảm số người (≤ 4 người)
2. Tắt video, chỉ dùng audio
3. Kiểm tra bandwidth: `chrome://webrtc-internals/`
4. Đóng các tab/app khác đang dùng mạng

### Không kết nối được
1. Kiểm tra firewall
2. Tắt VPN
3. Cần TURN server (production)

## 🔮 Nâng cấp tương lai

### Phase 2: SFU (5+ người)
- Dùng mediasoup hoặc Janus
- Mỗi người chỉ upload 1 stream
- Server forward đến người khác
- Tiết kiệm bandwidth

### Phase 3: Features
- [ ] Screen sharing
- [ ] Recording
- [ ] Reactions (emoji)
- [ ] Raise hand
- [ ] Breakout rooms
- [ ] Virtual backgrounds
- [ ] Noise cancellation

### Phase 4: Production
- [ ] TURN server
- [ ] Load balancing
- [ ] Monitoring & analytics
- [ ] Quality adaptation (adaptive bitrate)
- [ ] Reconnection handling

## 📝 Testing Checklist

- [ ] Tạo nhóm 3-4 người
- [ ] User A bắt đầu video call
- [ ] User B, C join cuộc gọi
- [ ] Kiểm tra thấy/nghe được tất cả mọi người
- [ ] Test mute/unmute mic
- [ ] Test bật/tắt camera
- [ ] User A rời khỏi → User B, C vẫn thấy nhau
- [ ] Tất cả rời khỏi → cuộc gọi kết thúc

## 🎓 Technical Details

### State Management
```typescript
// useGroupCall.ts
const [participants, setParticipants] = useState<Map<number, Participant>>(new Map());

interface Participant {
  userId: number;
  name: string;
  stream: MediaStream | null;
  pc: RTCPeerConnection | null;
}
```

### PeerConnection per User
```typescript
members.forEach(member => {
  const pc = createPC(member.id);
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  participants.set(member.id, { userId: member.id, name: member.name, stream: null, pc });
});
```

### Offer/Answer Exchange
```typescript
// Sau khi tất cả join, tạo offers
createOffersForAll() {
  participants.forEach(async (p, userId) => {
    const offer = await p.pc.createOffer();
    await p.pc.setLocalDescription(offer);
    socket.emit('call:offer', { targetUserId: userId, offer });
  });
}
```

## 🌟 Kết luận

Group call đã hoạt động với kiến trúc Mesh P2P, phù hợp cho nhóm nhỏ 2-6 người. Để scale lên 10+ người, cần migrate sang SFU architecture với server như mediasoup hoặc Janus.
