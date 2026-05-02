import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "ghost";
};

export default function Button({
  children,
  loading,
  fullWidth = true,
  variant = "primary",
  className,
  disabled,
  ...props
}: Props) {
  return (
    <button
      className={clsx(
        "btn",
        `btn-${variant}`,
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Đang xử lý..." : children}
    </button>
  );
}
