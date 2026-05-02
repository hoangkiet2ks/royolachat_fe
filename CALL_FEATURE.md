# 📞 Tính năng Gọi điện / Video Call

## ✨ Tính năng đã hoàn thành

### Backend (NestJS)
- ✅ WebRTC signaling qua Socket.IO
- ✅ Events: `call:initiate`, `call:answer`, `call:offer`, `call:webrtc-answer`, `call:ice-candidate`, `call:end`
- ✅ Hỗ trợ multi-device (gửi thông báo đến tất cả thiết bị của người nhận)

### Frontend (React)
- ✅ Hook `useWebRTC` xử lý WebRTC peer connection
- ✅ Component `CallModal` với UI hiện đại
- ✅ Tích hợp vào `ChatRoom` với nút gọi thoại/video
- ✅ Hỗ trợ cả audio call và video call
- ✅ UI khác nhau cho từng trạng thái: calling, incoming, connected, ended

## 🎯 Cách sử dụng

### 1. Gọi điện cho người khác
- Mở chat 1-1 với người bạn muốn gọi
- Click icon **điện thoại** (audio call) hoặc **camera** (video call) ở header
- Chờ người kia chấp nhận

### 2. Nhận cuộc gọi
- Khi có cuộc gọi đến, modal sẽ hiện lên
- Click **Chấp nhận** để bắt đầu cuộc gọi
- Click **Từ chối** để từ chối

### 3. Trong cuộc gọi
**Audio Call:**
- Nút **Mic**: Bật/tắt micro
- Nút **End** (đỏ): Kết thúc cuộc gọi

**Video Call:**
- Video người kia hiển thị full screen
- Video của bạn hiển thị ở góc dưới phải (picture-in-picture)
- Nút **Mic**: Bật/tắt micro
- Nút **Camera**: Bật/tắt camera
- Nút **End** (đỏ): Kết thúc cuộc gọi

## 🔧 Kiến trúc kỹ thuật

### WebRTC Flow
```
Caller                          Backend                         Callee
  |                                |                                |
  |------ call:initiate --------->|                                |
  |                                |------ call:incoming --------->|
  |                                |                                |
  |                                |<----- call:answer (accept) ---|
  |<----- call:answered ----------|                                |
  |                                |                                |
  |------ call:offer ------------>|                                |
  |                                |------ call:offer ------------>|
  |                                |                                |
  |                                |<----- call:webrtc-answer -----|
  |<----- call:webrtc-answer -----|                                |
  |                                |                                |
  |<===== ICE candidates exchange (bidirectional) ================>|
  |                                |                                |
  |<================= P2P Media Stream (WebRTC) ==================>|
  |                                |                                |
  |------ call:end -------------->|                                |
  |                                |------ call:ended ------------>|
```

### STUN Servers
Sử dụng Google STUN servers miễn phí:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

### Files đã tạo/sửa
**Backend:**
- `src/routes/chat/chat.gateway.ts` — Thêm 6 socket events cho WebRTC signaling

**Frontend:**
- `src/hooks/useWebRTC.ts` — Hook quản lý WebRTC connection
- `src/components/chat/CallModal.tsx` — UI modal cuộc gọi
- `src/components/chat/ChatRoom.tsx` — Tích hợp nút gọi và CallModal

## 🚀 Test thử

1. Mở 2 tab trình duyệt (hoặc 2 trình duyệt khác nhau)
2. Đăng nhập 2 tài khoản khác nhau
3. Tạo chat 1-1 giữa 2 người
4. Từ tab 1, click nút gọi điện/video
5. Tab 2 sẽ nhận được thông báo cuộc gọi đến
6. Chấp nhận và kiểm tra audio/video

## ⚠️ Lưu ý

- **Chỉ hỗ trợ chat 1-1**: Nhóm chat chưa hỗ trợ gọi điện
- **Cần HTTPS trong production**: WebRTC yêu cầu HTTPS (hoặc localhost)
- **Quyền truy cập camera/mic**: Trình duyệt sẽ hỏi quyền khi bắt đầu cuộc gọi
- **Firewall/NAT**: Nếu không kết nối được, có thể cần TURN server (hiện tại chỉ dùng STUN)

## 🎨 UI Features

- **Glassmorphism design** cho modal
- **Pulse animation** khi đang gọi/nhận cuộc gọi
- **Picture-in-picture** cho video call
- **Đếm thời gian** cuộc gọi
- **Responsive controls** với hover effects
- **Dark/Light mode** tự động theo theme

## 🔮 Tính năng có thể mở rộng

- [ ] Group call (nhiều người)
- [ ] Screen sharing
- [ ] Ghi âm cuộc gọi
- [ ] Lưu lịch sử cuộc gọi vào database
- [ ] Thông báo cuộc gọi nhỡ
- [ ] TURN server cho NAT traversal
- [ ] Chất lượng video adaptive (dựa vào bandwidth)
