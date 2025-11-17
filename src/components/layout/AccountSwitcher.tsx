import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Do not render anything if there is no user or no accounts.
  if (!user || accounts.length === 0) {
    return null;
  }

  const getInitials = (email?: string) => {
    return email ? email.substring(0, 2).toUpperCase() : "U";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={user?.user_metadata?.avatar_url} 
                alt={user?.user_metadata?.username || user?.email}
              />
              <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.user_metadata?.display_name || 'Signed in as'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch account
          </DropdownMenuLabel>
          {
            accounts.map(account => (
              <DropdownMenuItem 
                key={account.user.id} 
                onClick={() => switchAccount(account.user.id)}
                disabled={account.user.id === user?.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage 
                      src={account.user.user_metadata?.avatar_url} 
                      alt={account.user.user_metadata?.username || account.user.email}
                    />
                    <AvatarFallback>{getInitials(account.user.email)}</AvatarFallback>
                  </Avatar>
                  <span>{account.user.email}</span>
                </div>
                {account.user.id === user?.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))
          }
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            <span>Add Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOut(undefined, navigate)}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}