import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export default function TextInput({ label, ...props }: Props) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="input" {...props} />
    </label>
  );
}
