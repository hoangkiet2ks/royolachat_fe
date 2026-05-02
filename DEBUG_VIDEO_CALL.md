# Debug Video Call 1-1

## Vấn Đề Đã Fix

### 1. Người gọi chỉ thấy video của mình
**Nguyên nhân:** Người gọi khởi tạo media stream SAU KHI nhận được `call:answered`, dẫn đến delay và không gửi tracks kịp thời.

**Giải pháp:** Khởi tạo media stream TRƯỚC KHI gửi `call:initiate`.

### 2. Người nhận thấy màn hình đen
**Nguyên nhân:** 
- Người nhận chưa khởi tạo media stream đúng cách
- Tracks chưa được thêm vào PeerConnection
- Remote stream chưa được set vào video element

**Giải pháp:** 
- Khởi tạo media stream NGAY KHI chấp nhận cuộc gọi
- Đảm bảo tracks được thêm vào PC trước khi tạo answer
- Kiểm tra `ontrack` event handler

---

## Checklist Debug

### Bước 1: Kiểm tra Console Logs

**Người gọi (Caller) phải thấy:**
```
[Caller] Getting media stream...
[WebRTC] ontrack: MediaStream {...}
[Caller] Offer sent to <targetUserId>
[Caller] Received answer from callee
[WebRTC] ICE state: connected
```

**Người nhận (Callee) phải thấy:**
```
[WebRTC] Incoming call from <callerId> <callerName>
[Callee] Accepting call from <callerId>
[Callee] Adding track: video <label>
[Callee] Adding track: audio <label>
[Callee] Processing offer, creating answer
[Callee] Answer sent to <callerId>
[WebRTC] ontrack: MediaStream {...}
[WebRTC] ICE state: connected
```

### Bước 2: Kiểm tra Media Streams

Mở DevTools Console và chạy:

```javascript
// Kiểm tra local stream
console.log('Local stream:', localStream);
console.log('Local tracks:', localStream?.getTracks());

// Kiểm tra remote stream
console.log('Remote stream:', remoteStream);
console.log('Remote tracks:', remoteStream?.getTracks());

// Kiểm tra video elements
const localVideo = document.querySelector('video.local-video');
const remoteVideo = document.querySelector('video.remote-video');
console.log('Local video srcObject:', localVideo?.srcObject);
console.log('Remote video srcObject:', remoteVideo?.srcObject);
```

### Bước 3: Kiểm tra PeerConnection

```javascript
// Trong useWebRTC.ts, thêm log:
pc.ontrack = (e) => {
  console.log('[WebRTC] ontrack event:', {
    streams: e.streams,
    track: e.track,
    trackKind: e.track.kind,
    trackEnabled: e.track.enabled,
    trackReadyState: e.track.readyState
  });
  setRemoteStream(e.streams[0]);
};

// Kiểm tra connection state
pc.onconnectionstatechange = () => {
  console.log('[WebRTC] Connection state:', pc.connectionState);
};

pc.oniceconnectionstatechange = () => {
  console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
};

pc.onsignalingstatechange = () => {
  console.log('[WebRTC] Signaling state:', pc.signalingState);
};
```

### Bước 4: Kiểm tra Tracks

```javascript
// Sau khi thêm tracks vào PC
stream.getTracks().forEach(track => {
  console.log('Track:', {
    kind: track.kind,
    label: track.label,
    enabled: track.enabled,
    readyState: track.readyState,
    muted: track.muted
  });
  pc.addTrack(track, stream);
});

// Kiểm tra senders
console.log('PC senders:', pc.getSenders().map(s => ({
  track: s.track?.kind,
  enabled: s.track?.enabled
})));
```

---

## Các Lỗi Thường Gặp

### Lỗi 1: NotAllowedError
```
DOMException: Permission denied
```
**Giải pháp:** Cấp quyền camera/microphone trong browser settings.

### Lỗi 2: NotFoundError
```
DOMException: Requested device not found
```
**Giải pháp:** Kiểm tra camera/microphone có kết nối không.

### Lỗi 3: Remote video không hiển thị
**Kiểm tra:**
1. `ontrack` event có được trigger không?
2. Remote stream có tracks không?
3. Video element có `autoPlay` và `playsInline` không?

```jsx
<video
  ref={remoteVideoRef}
  autoPlay
  playsInline
  style={{ width: '100%', height: '100%' }}
/>
```

### Lỗi 4: ICE connection failed
**Kiểm tra:**
1. STUN/TURN servers có hoạt động không?
2. Firewall có chặn WebRTC không?
3. Thử thêm TURN server:

```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Thêm TURN server nếu cần
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ],
};
```

---

## Test Script

Thêm vào component để test:

```typescript
// Thêm vào useEffect
useEffect(() => {
  if (localStream) {
    console.log('=== LOCAL STREAM ===');
    console.log('ID:', localStream.id);
    console.log('Active:', localStream.active);
    console.log('Tracks:', localStream.getTracks().map(t => ({
      kind: t.kind,
      label: t.label,
      enabled: t.enabled,
      readyState: t.readyState
    })));
  }
}, [localStream]);

useEffect(() => {
  if (remoteStream) {
    console.log('=== REMOTE STREAM ===');
    console.log('ID:', remoteStream.id);
    console.log('Active:', remoteStream.active);
    console.log('Tracks:', remoteStream.getTracks().map(t => ({
      kind: t.kind,
      label: t.label,
      enabled: t.enabled,
      readyState: t.readyState
    })));
  }
}, [remoteStream]);
```

---

## Kiểm Tra Backend

### 1. Kiểm tra Socket Events

Trong backend console, bạn phải thấy:

```
[Call 1-1] User <callerId> (<callerName>) đang gọi <targetUserId>
[Call 1-1] Gửi call:incoming đến socket <socketId>
[Call 1-1] Đã gửi thông báo cuộc gọi đến <n> thiết bị
[Call 1-1] User <answererId> chấp nhận cuộc gọi từ <callerId>
[Call 1-1] User <callerId> gửi offer đến <targetUserId>
[Call 1-1] User <answererId> gửi answer đến <callerId>
```

### 2. Kiểm tra User Online Status

```javascript
// Trong gateway
console.log('User sockets:', Array.from(this.userSockets.entries()));
```

---

## Luồng Hoạt Động Đúng

### Caller Side:
1. User bấm nút gọi
2. `startCall()` được gọi
3. Lấy media stream (camera/mic)
4. Tạo PeerConnection
5. Thêm tracks vào PC
6. Gửi `call:initiate` đến server
7. Đợi `call:answered`
8. Tạo offer
9. Set local description
10. Gửi `call:offer` đến server
11. Đợi `call:webrtc-answer`
12. Set remote description
13. Trao đổi ICE candidates
14. Kết nối thành công → Thấy video 2 bên

### Callee Side:
1. Nhận `call:incoming` từ server
2. Hiển thị UI cuộc gọi đến
3. User bấm "Chấp nhận"
4. `acceptCall()` được gọi
5. Lấy media stream (camera/mic)
6. Tạo PeerConnection
7. Thêm tracks vào PC
8. Gửi `call:answer` (accepted: true)
9. Đợi `call:offer`
10. Set remote description (offer)
11. Tạo answer
12. Set local description
13. Gửi `call:webrtc-answer`
14. Trao đổi ICE candidates
15. Kết nối thành công → Thấy video 2 bên

---

## Nếu Vẫn Không Hoạt Động

### 1. Kiểm tra Browser Compatibility
- Chrome/Edge: ✅ Hỗ trợ tốt
- Firefox: ✅ Hỗ trợ tốt
- Safari: ⚠️ Cần thêm `playsInline`

### 2. Kiểm tra HTTPS
WebRTC yêu cầu HTTPS (hoặc localhost). Nếu deploy production, đảm bảo dùng HTTPS.

### 3. Test với Simple Peer
Nếu vẫn không được, thử dùng thư viện `simple-peer`:

```bash
npm install simple-peer
```

```typescript
import SimplePeer from 'simple-peer';

const peer = new SimplePeer({
  initiator: true, // caller
  stream: localStream,
  trickle: false
});

peer.on('signal', data => {
  socket.emit('signal', data);
});

peer.on('stream', stream => {
  setRemoteStream(stream);
});
```

---

## Contact Support

Nếu vẫn gặp vấn đề, cung cấp:
1. Console logs (cả caller và callee)
2. Network tab (WebSocket messages)
3. Browser và version
4. Có dùng VPN/Proxy không?
