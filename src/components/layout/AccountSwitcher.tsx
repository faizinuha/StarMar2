import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, PlusCircle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddAccountModal } from "./AddAccountModal";

export function AccountSwitcher() {
  const { user, accounts, switchAccount, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user || accounts.length === 0) {
    return null;
  }

  const getInitials = (email?: string) => {
    return email ? email.substring(0, 2).toUpperCase() : "U";
  };

  const activeAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const activeName = profile?.display_name || profile?.username || user?.user_metadata?.display_name || user?.email?.split('@')[0];
  const activeUsername = profile?.username ? `@${profile.username}` : `@${user?.email?.split('@')[0]}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={activeAvatar}
                alt={activeUsername}
                loading="eager"
                decoding="async"
              />
              <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
          {/* Header: active account */}
          <div className="px-2 py-2">
            <p className="text-xs font-semibold text-foreground">{activeName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>

          <DropdownMenuSeparator />

          <p className="px-2 pt-1 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Switch account
          </p>

          {accounts.map((account) => {
            const isActive = account.user.id === user?.id;
            const accAvatar = account.user.user_metadata?.avatar_url;
            return (
              <DropdownMenuItem
                key={account.user.id}
                onClick={() => !isActive && switchAccount(account.user.id)}
                className="flex items-center justify-between rounded-md gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={accAvatar} loading="eager" decoding="async" />
                    <AvatarFallback className="text-[10px]">{getInitials(account.user.email)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">{account.user.email}</span>
                </div>
                {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setIsModalOpen(true)} className="rounded-md cursor-pointer">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Add Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => signOut(undefined, navigate)}
            className="rounded-md cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
