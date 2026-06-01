/**
 * WebRTC ICE Servers Configuration
 *
 * Thứ tự ưu tiên:
 *   1. TURN TCP 3478 — xuyên CGNAT/4G Viettel tốt nhất (UDP 4G thường bị chặn)
 *   2. TURN UDP 3478 — fallback
 *   3. STUN Google (fallback cuối)
 */

const ICE_SERVERS = {
  iceServers: [
    // === TURN (relay) - bắt buộc để xuyên CGNAT (4G Viettel, Vinaphone...) ===
    { urls: 'turn:18.141.211.167:3478?transport=tcp', username: 'royola', credential: 'hoangkiet1906' },
    { urls: 'turn:18.141.211.167:3478?transport=udp', username: 'royola', credential: 'hoangkiet1906' },

    // === STUN (fallback) ===
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default ICE_SERVERS;
