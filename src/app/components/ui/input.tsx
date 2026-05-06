import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-['Quicksand',sans-serif] font-semibold text-[#8A847D] mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={clsx(
          "w-full px-4 py-3 rounded-xl",
          "bg-white border-2 border-[#E9E4DF]",
          "font-['Quicksand',sans-serif] text-sm text-[#2B2A28]",
          "placeholder:text-[#8A847D]/50",
          "focus:outline-none focus:border-[#4D989B] focus:ring-2 focus:ring-[#4D989B]/20",
          "transition-all",
          className
        )}
        {...props}
      />
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, className, ...props }: TextAreaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-['Quicksand',sans-serif] font-semibold text-[#8A847D] mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          "w-full px-4 py-3 rounded-xl",
          "bg-white border-2 border-[#E9E4DF]",
          "font-['Quicksand',sans-serif] text-sm text-[#2B2A28]",
          "placeholder:text-[#8A847D]/50",
          "focus:outline-none focus:border-[#4D989B] focus:ring-2 focus:ring-[#4D989B]/20",
          "transition-all resize-none",
          className
        )}
        {...props}
      />
    </div>
  );
}
