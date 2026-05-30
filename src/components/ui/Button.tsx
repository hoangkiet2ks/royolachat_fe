import type { ButtonHTMLAttributes, ReactNode, RefObject } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "ghost";
};

interface ButtonWithRefProps extends Props {
  ref?: RefObject<HTMLButtonElement | null>;
}

export default function Button({
  children,
  loading,
  fullWidth = true,
  variant = "primary",
  className,
  disabled,
  ref,
  ...props
}: ButtonWithRefProps) {
  return (
    <button
      ref={ref}
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
