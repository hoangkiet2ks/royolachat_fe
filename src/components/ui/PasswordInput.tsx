import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function PasswordInput({ label, ...props }: Props) {
  const [show, setShow] = useState(false);

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="password-wrap">
        <input
          className="input password-input"
          type={show ? "text" : "password"}
          {...props}
        />
        <button
          type="button"
          className="toggle-password"
          onClick={() => setShow((prev) => !prev)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
