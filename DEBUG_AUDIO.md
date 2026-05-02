# 🔧 Debug Audio Issues

## Các bước kiểm tra khi không nghe được tiếng

### 1. Mở Console (F12)
Khi thực hiện cuộc gọi, kiểm tra các log sau:

**Khi bắt đầu gọi (Caller):**
```
[Caller] Adding tracks to PC: [MediaStreamTrack, MediaStreamTrack]
[Caller] Adding track: audio true
[Caller] Adding track: video true (nếu video call)
```

**Khi nhận cuộc gọi (Callee):**
```
[Callee] Adding tracks to PC: [MediaStreamTrack, MediaStreamTrack]
[Callee] Adding track: audio true
[Callee] Received offer, creating answer
```

**Khi kết nối thành công:**
```
[WebRTC] ontrack event: MediaStream
[WebRTC] Audio tracks: [MediaStreamTrack]
[WebRTC] Video tracks: [MediaStreamTrack] (nếu video call)
[WebRTC] ICE connection state: connected
[WebRTC] Connection state: connected
[CallModal] Remote audio tracks: [MediaStreamTrack]
[CallModal] Audio track: xxx enabled: true muted: false
```

### 2. Kiểm tra quyền truy cập Microphone
- Trình duyệt phải được cấp quyền truy cập microphone
- Kiểm tra icon microphone trên thanh địa chỉ (address bar)
- Nếu bị chặn, click vào icon và cho phép

### 3. Kiểm tra Audio Output Device
- Đảm bảo loa/tai nghe đang hoạt động
- Kiểm tra volume hệ thống
- Thử với thiết bị khác

### 4. Kiểm tra trong DevTools

**Chrome DevTools → More Tools → WebRTC Internals:**
- Mở `chrome://webrtc-internals/`
- Xem stats của PeerConnection
- Kiểm tra `inbound-rtp` (audio) có `bytesReceived` tăng không
- Kiểm tra `audioLevel` có giá trị > 0 không

**Firefox:**
- Mở `about:webrtc`
- Xem ICE connection state
- Kiểm tra audio tracks

### 5. Các vấn đề thường gặp

#### A. Không có audio tracks trong remote stream
**Nguyên nhân:** Caller không add audio track vào PC
**Giải pháp:** Kiểm tra log `[Caller] Adding track: audio`

#### B. Audio track bị muted
**Nguyên nhân:** Track bị disable hoặc muted
**Giải pháp:** Kiểm tra log `enabled: true muted: false`

#### C. ICE connection failed
**Nguyên nhân:** Firewall/NAT blocking
**Giải pháp:** 
- Kiểm tra log `ICE connection state: failed`
- Cần TURN server (hiện tại chỉ có STUN)

#### D. Audio element không autoplay
**Nguyên nhân:** Browser policy chặn autoplay
**Giải pháp:** Đã fix bằng `.play()` trong useEffect

### 6. Test đơn giản

Thêm đoạn code này vào Console khi đang trong cuộc gọi:

```javascript
// Kiểm tra remote stream
const audioEl = document.querySelector('audio');
console.log('Audio element:', audioEl);
console.log('Audio srcObject:', audioEl?.srcObject);
console.log('Audio tracks:', audioEl?.srcObject?.getAudioTracks());
console.log('Audio volume:', audioEl?.volume);
console.log('Audio muted:', audioEl?.muted);

// Test play
audioEl?.play().then(() => console.log('Playing!')).catch(e => console.error('Play error:', e));
```

### 7. Workaround nếu vẫn không được

Thêm nút "Unmute" trong UI để user click thủ công:

```tsx
<button onClick={() => {
  const audio = document.querySelector('audio');
  audio?.play();
}}>
  🔊 Bật tiếng
</button>
```

### 8. Kiểm tra Browser Compatibility

**Supported:**
- Chrome/Edge 80+
- Firefox 75+
- Safari 14+

**Not supported:**
- IE (không hỗ trợ WebRTC)
- Các trình duyệt cũ

### 9. Network Issues

Nếu ICE connection không thành công:
- Kiểm tra firewall
- Thử tắt VPN
- Cần TURN server cho production (hiện tại chỉ có STUN)

### 10. Production Checklist

- [ ] HTTPS (WebRTC yêu cầu secure context)
- [ ] TURN server configured
- [ ] Proper error handling
- [ ] User feedback khi không có quyền mic
- [ ] Fallback UI khi WebRTC không supported
