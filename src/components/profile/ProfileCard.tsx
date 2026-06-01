import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface UserProfile {
  name: string;
  avatar: string | null;
  banner: string | null;
  phoneNumber: string | null;
  email: string | null;
  birthday: string | null;
}

interface ProfileCardProps {
  userId: number;
  onClose: () => void;
}

export function ProfileCard({ userId, onClose }: ProfileCardProps) {
  const { session } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = session?.accessToken || localStorage.getItem('accessToken');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Không thể tải thông tin người dùng');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId, session]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Chưa cập nhật';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.15s ease',
    }}>
      <div ref={cardRef} style={{
        background: 'var(--bg-panel)',
        borderRadius: '16px',
        width: '320px',
        maxWidth: '90vw',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* Banner */}
        <div style={{
          height: '120px',
          background: user?.banner
            ? `url(${user.banner}) center/cover no-repeat`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(0,0,0,0.4)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              lineHeight: 1,
            }}
          >X</button>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-50px', position: 'relative', zIndex: 1 }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="avatar" style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '4px solid var(--bg-panel)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }} />
          ) : (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '2rem',
              border: '4px solid var(--bg-panel)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}>
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Name */}
        <div style={{ textAlign: 'center', padding: '12px 20px 4px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600 }}>{user?.name || '...'}</h3>
        </div>

        {/* Info fields */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-sub)' }}>Đang tải...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444' }}>{error}</div>
        ) : (
          <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Phone */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-main)', borderRadius: '10px' }}>
              <svg width="18" height="18" fill="none" stroke="var(--primary-color)" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 500 }}>Số điện thoại</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 500 }}>{user?.phoneNumber || 'Chưa cập nhật'}</div>
              </div>
            </div>

            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-main)', borderRadius: '10px' }}>
              <svg width="18" height="18" fill="none" stroke="var(--primary-color)" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 500 }}>Email</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 500, wordBreak: 'break-all' }}>{user?.email || 'Chưa cập nhật'}</div>
              </div>
            </div>

            {/* Birthday */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-main)', borderRadius: '10px' }}>
              <svg width="18" height="18" fill="none" stroke="var(--primary-color)" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 500 }}>Ngày sinh</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 500 }}>{formatDate(user?.birthday)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
