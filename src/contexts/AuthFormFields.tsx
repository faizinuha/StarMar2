import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";


interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
}

const FormField = ({ id, label, icon, error, ...props }: FormFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="flex items-center space-x-2">
      {icon}
      <span>{label}</span>
    </Label>
    <Input
      id={id}
      {...props}
      className={error ? "border-destructive" : ""}
    />
    {error && <p className="text-sm text-destructive">{error}</p>}
  </div>
);

export const DisplayNameField = ({ value, onChange, error }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string; }) => (
  <FormField
    id="displayName"
    label="Display Name"
    icon={<User className="h-4 w-4" />}
    placeholder="Your display name"
    value={value}
    onChange={onChange}
    error={error}
  />
);

export const UsernameField = ({ value, onChange, error }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string; }) => (
  <FormField
    id="username"
    label="Username"
    icon={<User className="h-4 w-4" />}
    placeholder="@username"
    value={value}
    onChange={onChange}
    error={error}
  />
);

export const EmailField = ({ value, onChange, error }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string; }) => (
  <FormField
    id="email"
    label="Email"
    icon={<Mail className="h-4 w-4" />}
    type="email"
    placeholder="your@gmail.com"
    value={value}
    onChange={onChange}
    error={error}
  />
);

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  showPassword?: boolean;
  toggleShowPassword?: () => void;
}

export const PasswordField = ({ id, label, value, onChange, error, showPassword, toggleShowPassword }: PasswordFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="flex items-center space-x-2">
      <Lock className="h-4 w-4" />
      <span>{label}</span>
    </Label>
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        placeholder="••••••••"
        value={value}
        onChange={onChange}
        className={error ? "border-destructive" : ""}
      />
      {toggleShowPassword && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3"
          onClick={toggleShowPassword}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      )}
    </div>
    {error && <p className="text-sm text-destructive">{error}</p>}
  </div>
);