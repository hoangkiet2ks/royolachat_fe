# Quick Fix: Video Call 1-1

## Vấn Đề
- **Người gọi:** Chỉ thấy video của mình, không thấy video người nhận
- **Người nhận:** Màn hình đen hoàn toàn

## Nguyên Nhân
1. Media stream chưa được khởi tạo đúng thời điểm
2. Tracks chưa được thêm vào PeerConnection trước khi tạo offer/answer
3. Remote stream không được set vào video element

## Giải Pháp Đã Áp Dụng

### 1. Fix useWebRTC.ts

**Thay đổi trong `startCall()` (Caller):**
```typescript
// ❌ SAI: Khởi tạo media SAU KHI gửi call:initiate
socket.emit('call:initiate', {...});
socket.once('call:answered', async () => {
  const stream = await getMedia(type); // Quá muộn!
  // ...
});

// ✅ ĐÚNG: Khởi tạo media TRƯỚC KHI gửi call:initiate
const stream = await getMedia(type);
const pc = createPC();
stream.getTracks().forEach(t => pc.addTrack(t, stream));

socket.emit('call:initiate', {...});
socket.once('call:answered', async () => {
  // Chỉ cần tạo offer, tracks đã có sẵn
  const offer = await pc.createOffer();
  // ...
});
```

**Thay đổi trong `acceptCall()` (Callee):**
```typescript
// ❌ SAI: Gửi accept TRƯỚC KHI có media
socket.emit('call:answer', { accepted: true });
const stream = await getMedia(type); // Quá muộn!

// ✅ ĐÚNG: Lấy media TRƯỚC KHI gửi accept
const stream = await getMedia(type);
const pc = createPC();
stream.getTracks().forEach(t => pc.addTrack(t, stream));

socket.emit('call:answer', { accepted: true });
// Bây giờ khi offer đến, tracks đã sẵn sàng
```

### 2. Kiểm Tra Video Elements

**CallModal.tsx phải có:**
```tsx
// Local video - PHẢI có muted
<video
  ref={localVideoRef}
  autoPlay
  playsInline
  muted  // ← QUAN TRỌNG!
  style={{...}}
/>

// Remote video - KHÔNG có muted
<video
  ref={remoteVideoRef}
  autoPlay
  playsInline
  style={{...}}
/>
```

### 3. Kiểm Tra ontrack Handler

```typescript
pc.ontrack = (e) => {
  console.log('[WebRTC] ontrack:', {
    streams: e.streams,
    track: e.track.kind,
    enabled: e.track.enabled,
    readyState: e.track.readyState
  });
  setRemoteStream(e.streams[0]);
};
```

## Test Ngay

### Bước 1: Mở 2 Tab Browser

**Tab 1 (Caller):**
1. Mở `TEST_VIDEO_CALL.html`
2. Click "Start as Caller"
3. Nhập access token
4. Xem console logs

**Tab 2 (Callee):**
1. Mở `TEST_VIDEO_CALL.html`
2. Click "Start as Callee"
3. Nhập access token
4. Cuộc gọi sẽ tự động chấp nhận sau 1 giây

### Bước 2: Kiểm Tra Console

**Caller phải thấy:**
```
✅ Got local media stream
Local tracks: video, audio
Adding local track: video
Adding local track: audio
📤 Sent call:initiate
📥 Received call:answered - accepted: true
📤 Created and set local description (offer)
📤 Sent call:offer
📥 Received call:webrtc-answer
✅ Set remote description (answer)
📥 Received remote track: video
📥 Received remote track: audio
ICE Connection State: connected
```

**Callee phải thấy:**
```
📥 Received call:incoming from Test Caller
🟢 Auto-accepting call...
✅ Got local media stream
Local tracks: video, audio
Adding local track: video
Adding local track: audio
📤 Sent call:answer (accepted)
📥 Received call:offer
✅ Set remote description (offer)
📤 Created and set local description (answer)
📤 Sent call:webrtc-answer
📥 Received remote track: video
📥 Received remote track: audio
ICE Connection State: connected
```

## Nếu Vẫn Không Hoạt Động

### 1. Kiểm tra quyền truy cập Camera/Mic

```javascript
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    console.log('✅ Media access granted');
    console.log('Tracks:', stream.getTracks());
  })
  .catch(err => {
    console.error('❌ Media access denied:', err);
  });
```

### 2. Kiểm tra Backend Logs

Backend phải log:
```
[Call 1-1] User 1 (Test Caller) đang gọi 2
[Call 1-1] Gửi call:incoming đến socket xxx
[Call 1-1] User 2 chấp nhận cuộc gọi từ 1
[Call 1-1] User 1 gửi offer đến 2
[Call 1-1] User 2 gửi answer đến 1
```

### 3. Kiểm tra Socket Connection

```javascript
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('connect_error', (err) => {
  console.error('Socket error:', err);
});
```

### 4. Thử với Simple Test

Tạo file `simple-test.html`:

```html
<!DOCTYPE html>
<html>
<body>
  <video id="local" autoplay muted playsinline style="width:300px"></video>
  <video id="remote" autoplay playsinline style="width:300px"></video>
  
  <script>
    // Test local media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        document.getElementById('local').srcObject = stream;
        console.log('Local OK');
      });
  </script>
</body>
</html>
```

Nếu test này không hoạt động → Vấn đề ở browser/permissions, không phải code.

## Checklist Cuối Cùng

- [ ] useWebRTC.ts đã được update (khởi tạo media trước)
- [ ] CallModal.tsx có `autoPlay`, `playsInline`, `muted` (local only)
- [ ] Backend đang chạy và log events
- [ ] Browser đã cấp quyền camera/mic
- [ ] Không có lỗi trong console
- [ ] ICE connection state = "connected"
- [ ] Remote stream có tracks (video + audio)

## Liên Hệ

Nếu vẫn gặp vấn đề, cung cấp:
1. Screenshot console logs (cả caller và callee)
2. Backend logs
3. Browser và version
4. Có dùng VPN không?
