import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../features/auth/auth.api";
import { getApiErrorMessage } from "../../lib/api-error";

export default function UserProfile({ onToggleSidebar, sidebarCollapsed }: { onToggleSidebar?: () => void; sidebarCollapsed?: boolean }) {
  const { session, setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');

  // Trạng thái cho Tên người dùng
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // Trạng thái cho Ngày sinh
  const [isEditingBirthday, setIsEditingBirthday] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState("");

  // Trạng thái cho Số điện thoại
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");

  // Trạng thái cho Mật khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Tham chiếu đến thẻ input file ẩn
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Lắng nghe thay đổi theme
  useEffect(() => {
    const handleThemeChange = () => setIsDark(localStorage.getItem('theme') !== 'light');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  // Hàm toggle theme
  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    setIsDark(!isDark);
    window.dispatchEvent(new Event('themeChange'));
  };

  // --- XỬ LÝ AVATAR ---
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const response = await authApi.updateAvatar(file);
      
      const updatedAvatar = response.data?.avatar;

      if (session && updatedAvatar) {
        setSession({ ...session, avatar: updatedAvatar });
      }
      alert("Đổi ảnh đại diện thành công!");
    } catch (error) {
      console.error("Avatar update error:", error);
      alert(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // --- XỬ LÝ TÊN NGƯỜI DÙNG ---
  const handleUpdateName = async () => {
    if (!nameInput.trim()) {
      alert("Tên không được để trống!");
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.updateProfile({ name: nameInput });
      console.log("Cập nhật thành công, dữ liệu trả về:", response);
      
      if (session) {
        setSession({ ...session, name: nameInput });
      }
      
      alert("Cập nhật tên thành công!");
      setIsEditingName(false);
    } catch (error) {
      console.error("Name update error:", error);
      alert(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // --- XỬ LÝ ẢNH BÌA ---
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const response = await authApi.updateBanner(file);
      const updatedBanner = response.data?.banner;
      
      if (session && updatedBanner) {
        setSession({ ...session, banner: updatedBanner });
      }
      alert("Đổi ảnh bìa thành công!");
    } catch (error) {
      console.error("Banner update error:", error);
      alert(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      // Reset input để có thể chọn lại cùng file
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  // --- XỬ LÝ NGÀY SINH ---
  const handleUpdateBirthday = async () => {
    if (!birthdayInput.trim()) {
      alert("Ngày sinh không được để trống!");
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.updateBirthday(birthdayInput);
      
      // Cập nhật session với birthday từ response
      if (session) {
        const birthdayValue = response.data?.birthday ?? birthdayInput;
        setSession({ ...session, birthday: birthdayValue });
      }
      
      alert("Cập nhật ngày sinh thành công!");
      setIsEditingBirthday(false);
    } catch (error) {
      console.error("Birthday update error:", error);
      alert(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // --- XỬ LÝ SỐ ĐIỆN THOẠI ---
  const handleUpdatePhone = async () => {
    if (!phoneInput.trim()) {
      alert("Số điện thoại không được để trống!");
      return;
    }

    try {
      setLoading(true);
      await authApi.updatePhone(phoneInput);
      
      if (session) {
        setSession({ ...session, phoneNumber: phoneInput });
      }
      setIsEditingPhone(false);
      alert("Cập nhật số điện thoại thành công!");
    } catch (error) {
      console.error("Phone update error:", error);
      alert(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // --- XỬ LÝ MẬT KHẨU ---
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Mật khẩu mới không khớp!");
      return;
    }

    if (newPassword.length < 6) {
      alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    try {
      setLoading(true);
      await authApi.changePassword(oldPassword, newPassword);
      
      alert("Đổi mật khẩu thành công!");
      setShowPasswordModal(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password change error:", error);
      alert(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="moji-profile-full">
      {/* Nút toggle sidebar */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "Hiện thanh bên" : "Ẩn thanh bên"}
          style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 20, background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.35)'; }}
        >
          {sidebarCollapsed ? (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      )}
      {/* Ảnh bìa - Có thể click để thay đổi */}
      <div 
        className="moji-profile-banner" 
        style={{ 
          height: "240px", 
          cursor: loading ? "wait" : "pointer",
          position: "relative",
          backgroundImage: session?.banner ? `url(${session.banner})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onClick={() => !loading && bannerInputRef.current?.click()}
        title="Nhấn để thay đổi ảnh bìa"
      >
        {/* Lớp phủ mờ hiện chữ THAY ĐỔI ẢNH BÌA */}
        <div 
          style={{
            position: "absolute", 
            inset: 0,
            background: "rgba(0, 0, 0, 0.3)",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            opacity: 0,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
        >
          <div style={{
            color: "#fff", 
            fontSize: "14px", 
            fontWeight: "bold",
            background: "rgba(0,0,0,0.7)", 
            padding: "12px 24px",
            borderRadius: "12px", 
            backdropFilter: "blur(4px)",
          }}>
            THAY ĐỔI ẢNH BÌA
          </div>
        </div>
        <input 
          type="file" 
          ref={bannerInputRef} 
          onChange={handleBannerChange} 
          style={{ display: "none" }} 
          accept="image/*" 
        />
      </div>

      {/* Khu vực Header (Avatar & Tên) - Đẩy xuống dưới banner và đè lên */}
      <div className="moji-profile-top-section" style={{ 
        marginTop: "-90px", 
        position: "relative", 
        zIndex: 10 
      }}>
        
        {/* Avatar Container có thể click */}
        <div 
          style={{ 
            position: "relative", 
            cursor: loading ? "wait" : "pointer", 
            borderRadius: "50%", 
            overflow: "hidden" 
          }}
          onClick={() => !loading && fileInputRef.current?.click()}
          title="Nhấn để thay đổi ảnh đại diện"
        >
          <img 
            src={session?.avatar || `https://ui-avatars.com/api/?name=${session?.name || "User"}&background=7c5cff&color=fff`} 
            alt="Avatar" 
            className="moji-profile-avatar-expansive"
            style={{ display: "block" }}
          />
          {/* Lớp phủ mờ hiện chữ SỬA ẢNH */}
          <div style={{
            position: "absolute", 
            bottom: 0, 
            left: 0, 
            right: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)", 
            color: "#fff",
            fontSize: "12px", 
            fontWeight: "bold", 
            textAlign: "center",
            padding: "8px 0", 
            backdropFilter: "blur(2px)"
          }}>
            SỬA ẢNH
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            style={{ display: "none" }} 
            accept="image/*" 
          />
        </div>

        {/* Tên và badges - Trong suốt, chỉ hiển thị text */}
        <div className="moji-profile-header-text" style={{
          padding: '16px 0',
        }}>
          {isEditingName ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '12px'
            }}>
              <input 
                type="text" 
                value={nameInput} 
                onChange={(e) => setNameInput(e.target.value)}
                disabled={loading}
                style={{ 
                  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', 
                  border: `2px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`, 
                  color: isDark ? '#f8fafc' : '#0f172a', 
                  fontSize: '1.8rem', 
                  fontWeight: '800',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  outline: 'none',
                  backdropFilter: 'blur(8px)',
                  flex: 1,
                }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
              />
              <button 
                onClick={handleUpdateName} 
                disabled={loading}
                style={{ 
                  background: '#10b981', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '10px 20px', 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                }}
              >
                {loading ? "..." : "Lưu"}
              </button>
              <button 
                onClick={() => setIsEditingName(false)} 
                disabled={loading}
                style={{ 
                  background: 'transparent', 
                  color: isDark ? '#94a3b8' : '#64748b', 
                  border: `1px solid ${isDark ? '#64748b' : '#cbd5e1'}`, 
                  padding: '10px 20px', 
                  borderRadius: '10px', 
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Hủy
              </button>
            </div>
          ) : (
            <h2 
              className="moji-profile-main-name" 
              style={{
                color: isDark ? '#f8fafc' : '#0f172a',
                textShadow: isDark 
                  ? '0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)' 
                  : '0 2px 8px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {session?.name || "Chưa cập nhật tên"}
              <svg 
                onClick={() => {
                  setNameInput(session?.name || "");
                  setIsEditingName(true);
                }}
                style={{ 
                  cursor: 'pointer', 
                  color: isDark ? '#c084fc' : '#8b5cf6',
                  width: '24px',
                  height: '24px',
                  opacity: 0.7,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                fill="none" 
                stroke="currentColor" 
                strokeWidth={2} 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </h2>
          )}
          <div className="moji-profile-badges">
            <span className="badge-role">USER</span>
            <span className="badge-status">
              <span className="status-dot-active"></span> ĐANG HOẠT ĐỘNG
            </span>
          </div>
        </div>

        {/* Nút chuyển sáng/tối - Góc phải */}
        <button
          onClick={toggleTheme}
          style={{
            position: 'absolute',
            top: '16px',
            right: '0',
            background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
            borderRadius: '12px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: isDark ? '#f1f5f9' : '#0f172a',
            fontWeight: '600',
            fontSize: '0.9rem',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
          }}
        >
          {isDark ? (
            <>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Sáng
            </>
          ) : (
            <>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Tối
            </>
          )}
        </button>
      </div>

      {/* Khu vực Thông tin chi tiết */}
      <div className="moji-profile-content">
        
        {/* PHẦN 1: THÔNG TIN CÁ NHÂN */}
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{ 
            color: isDark ? "#f1f5f9" : "#475569", 
            fontSize: "0.9rem", 
            fontWeight: "700", 
            letterSpacing: "0.5px", 
            marginBottom: "16px", 
            textTransform: "uppercase" 
          }}>
            Thông tin cá nhân
          </h3>
          <div className="info-grid-expansive">
            
            {/* Địa chỉ Email (Read-only) */}
            <div className="info-group-expansive">
              <span className="info-card-label">ĐỊA CHỈ EMAIL</span>
              <div className="info-card-value-box">
                {session?.email || "Chưa cập nhật email"}
              </div>
            </div>

            {/* Ngày sinh (Editable) */}
            <div className="info-group-expansive">
              <span className="info-card-label">NGÀY SINH</span>
              <div className="info-card-value-box" style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                padding: isEditingBirthday ? "10px 20px" : "16px 20px" 
              }}>
                
                {isEditingBirthday ? (
                  <>
                    <input 
                      type="date" 
                      value={birthdayInput} 
                      onChange={(e) => setBirthdayInput(e.target.value)}
                      disabled={loading}
                      style={{ 
                        flex: 1, 
                        background: "transparent", 
                        border: "none", 
                        color: isDark ? "#f1f5f9" : "#0f172a", 
                        fontSize: "1.05rem", 
                        outline: "none", 
                        borderBottom: "1px solid #7c5cff", 
                        marginRight: "16px" 
                      }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        onClick={() => setIsEditingBirthday(false)} 
                        disabled={loading}
                        style={{ 
                          background: "transparent", 
                          border: `1px solid ${isDark ? "#64748b" : "#cbd5e1"}`, 
                          color: isDark ? "#94a3b8" : "#64748b", 
                          padding: "6px 12px", 
                          borderRadius: "8px", 
                          cursor: "pointer", 
                          fontSize: "14px" 
                        }}
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={handleUpdateBirthday} 
                        disabled={loading}
                        style={{ 
                          background: "#7c5cff", 
                          border: "none", 
                          color: "#fff", 
                          padding: "6px 12px", 
                          borderRadius: "8px", 
                          cursor: "pointer", 
                          fontSize: "14px", 
                          fontWeight: "bold" 
                        }}
                      >
                        {loading ? "..." : "Lưu"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span>{session?.birthday ? new Date(session.birthday).toLocaleDateString('vi-VN') : "Chưa cập nhật"}</span>
                    <button 
                      onClick={() => {
                        setBirthdayInput(session?.birthday || "");
                        setIsEditingBirthday(true);
                      }}
                      style={{ 
                        background: "transparent", 
                        border: "none", 
                        color: "#c084fc", 
                        cursor: "pointer", 
                        fontSize: "14px", 
                        fontWeight: "bold", 
                        textDecoration: "underline" 
                      }}
                    >
                      Thay đổi
                    </button>
                  </>
                )}

              </div>
            </div>

            {/* Ngày tham gia (Read-only) - Lấy từ createdAt */}
            <div className="info-group-expansive">
              <span className="info-card-label">NGÀY THAM GIA</span>
              <div className="info-card-value-box">
                {session?.createdAt ? new Date(session.createdAt).toLocaleDateString('vi-VN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : "Chưa có dữ liệu"}
              </div>
            </div>

            {/* Mã người dùng (Read-only) */}
            <div className="info-group-expansive">
              <span className="info-card-label">MÃ NGƯỜI DÙNG</span>
              <div className="info-card-value-box">
                #{session?.userId || "---"}
              </div>
            </div>

          </div>
        </div>

        {/* PHẦN 2: BẢO MẬT */}
        <div>
          <h3 style={{ 
            color: isDark ? "#f1f5f9" : "#475569", 
            fontSize: "0.9rem", 
            fontWeight: "700", 
            letterSpacing: "0.5px", 
            marginBottom: "16px", 
            textTransform: "uppercase" 
          }}>
            Bảo mật
          </h3>
          <div className="info-grid-expansive" style={{ gridTemplateColumns: "1fr 1fr" }}>
            
            {/* Mật khẩu */}
            <div className="info-group-expansive">
              <span className="info-card-label">MẬT KHẨU</span>
              <div className="info-card-value-box" style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center" 
              }}>
                <span>••••••••</span>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  style={{ 
                    background: "transparent", 
                    border: "none", 
                    color: "#c084fc", 
                    cursor: "pointer", 
                    fontSize: "14px", 
                    fontWeight: "bold", 
                    textDecoration: "underline" 
                  }}
                >
                  Thay đổi
                </button>
              </div>
            </div>

            {/* Số điện thoại */}
            <div className="info-group-expansive">
              <span className="info-card-label">SỐ ĐIỆN THOẠI</span>
              <div className="info-card-value-box" style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                padding: isEditingPhone ? "10px 20px" : "16px 20px" 
              }}>
                
                {isEditingPhone ? (
                  <>
                    <input 
                      type="text" 
                      value={phoneInput} 
                      onChange={(e) => setPhoneInput(e.target.value)}
                      disabled={loading}
                      style={{ 
                        flex: 1, 
                        background: "transparent", 
                        border: "none", 
                        color: isDark ? "#f1f5f9" : "#0f172a", 
                        fontSize: "1.05rem", 
                        outline: "none", 
                        borderBottom: "1px solid #7c5cff", 
                        marginRight: "16px" 
                      }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        onClick={() => setIsEditingPhone(false)} 
                        disabled={loading}
                        style={{ 
                          background: "transparent", 
                          border: `1px solid ${isDark ? "#64748b" : "#cbd5e1"}`, 
                          color: isDark ? "#94a3b8" : "#64748b", 
                          padding: "6px 12px", 
                          borderRadius: "8px", 
                          cursor: "pointer", 
                          fontSize: "14px" 
                        }}
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={handleUpdatePhone} 
                        disabled={loading}
                        style={{ 
                          background: "#7c5cff", 
                          border: "none", 
                          color: "#fff", 
                          padding: "6px 12px", 
                          borderRadius: "8px", 
                          cursor: "pointer", 
                          fontSize: "14px", 
                          fontWeight: "bold" 
                        }}
                      >
                        {loading ? "..." : "Lưu"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span>{session?.phoneNumber || "Chưa cập nhật"}</span>
                    <button 
                      onClick={() => {
                        setPhoneInput(session?.phoneNumber || "");
                        setIsEditingPhone(true);
                      }}
                      style={{ 
                        background: "transparent", 
                        border: "none", 
                        color: "#c084fc", 
                        cursor: "pointer", 
                        fontSize: "14px", 
                        fontWeight: "bold", 
                        textDecoration: "underline" 
                      }}
                    >
                      Thay đổi
                    </button>
                  </>
                )}

              </div>
            </div>

          </div>
        </div>

      </div>

      {/* MODAL ĐỔI MẬT KHẨU */}
      {showPasswordModal && (
        <div style={{
          position: "fixed", 
          inset: 0, 
          zIndex: 9999,
          background: "rgba(0,0,0,0.7)", 
          display: "flex",
          alignItems: "center", 
          justifyContent: "center",
        }}>
          <div style={{
            background: isDark 
              ? "linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)"
              : "linear-gradient(160deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)",
            borderRadius: "24px", 
            padding: "32px", 
            width: "420px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            border: isDark ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(139,92,246,0.2)",
          }}>
            <h3 style={{ 
              color: isDark ? "#fff" : "#0f172a", 
              margin: "0 0 24px", 
              fontSize: "1.3rem" 
            }}>
              Đổi mật khẩu
            </h3>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                color: isDark ? "#94a3b8" : "#64748b", 
                fontSize: "0.85rem", 
                display: "block", 
                marginBottom: "8px" 
              }}>
                Mật khẩu cũ
              </label>
              <input 
                type="password" 
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%", 
                  padding: "12px 16px", 
                  borderRadius: "12px",
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", 
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                  color: isDark ? "#fff" : "#0f172a", 
                  fontSize: "1rem", 
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ 
                color: isDark ? "#94a3b8" : "#64748b", 
                fontSize: "0.85rem", 
                display: "block", 
                marginBottom: "8px" 
              }}>
                Mật khẩu mới
              </label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%", 
                  padding: "12px 16px", 
                  borderRadius: "12px",
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", 
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                  color: isDark ? "#fff" : "#0f172a", 
                  fontSize: "1rem", 
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ 
                color: isDark ? "#94a3b8" : "#64748b", 
                fontSize: "0.85rem", 
                display: "block", 
                marginBottom: "8px" 
              }}>
                Xác nhận mật khẩu mới
              </label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%", 
                  padding: "12px 16px", 
                  borderRadius: "12px",
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", 
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                  color: isDark ? "#fff" : "#0f172a", 
                  fontSize: "1rem", 
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button 
                onClick={() => {
                  setShowPasswordModal(false);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={loading}
                style={{
                  flex: 1, 
                  padding: "12px", 
                  borderRadius: "12px",
                  background: "transparent", 
                  border: isDark ? "1px solid #64748b" : "1px solid #cbd5e1",
                  color: isDark ? "#94a3b8" : "#64748b", 
                  cursor: "pointer", 
                  fontSize: "1rem", 
                  fontWeight: "600",
                }}
              >
                Hủy
              </button>
              <button 
                onClick={handleChangePassword}
                disabled={loading}
                style={{
                  flex: 1, 
                  padding: "12px", 
                  borderRadius: "12px",
                  background: "#7c5cff", 
                  border: "none",
                  color: "#fff", 
                  cursor: "pointer", 
                  fontSize: "1rem", 
                  fontWeight: "600",
                }}
              >
                {loading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
