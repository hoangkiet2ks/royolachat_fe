import type { ReactNode } from "react";
import './AuthShell.css'; 

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: Props) {
  return (
    <div className="auth-page">
      <div className="auth-background" />
      
      <div className="auth-container-glass">
        
        {/* CỘT TRÁI */}
        <div className="auth-hero">
          <div className="brand-logo">
            <div className="logo-icon">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span>Royola</span>
          </div>
          
          <h1 className="hero-title">
            Kết nối ngay<br />lập tức<br />với bạn bè và<br />đồng nghiệp
          </h1>
          <p className="hero-subtitle">
            Trò chuyện nhanh chóng, mượt mà và bảo mật.
          </p>

          {/* Các icon trang trí góc dưới */}
          <div className="hero-illustration">
            <span>🚀</span>
            <span>💬</span>
            <span>✨</span>
          </div>

          <div className="hero-footer">© 2026 Royola</div>
        </div>

        {/* CỘT PHẢI (FORM) */}
        <div className="auth-form-section">
          <div className="auth-card">
            <div className="auth-card-head">
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>

            <div className="auth-form-body">
              {children}
            </div>

            {footer && <div className="auth-footer">{footer}</div>}
          </div>
        </div>

      </div>
    </div>
  );
}