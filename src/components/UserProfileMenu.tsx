import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { LogIn, LogOut, ShieldCheck, Trash2, Key } from "lucide-react";

interface UserProfileMenuProps {
  onOpenSettings?: () => void;
  onClearChats?: () => void;
}

export const UserProfileMenu = ({ onOpenSettings, onClearChats }: UserProfileMenuProps) => {
  const { user, signOutUser } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "GU";
  };

  return (
    <>
      {user?.isGuest ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAuthModalOpen(true)}
          className="h-9 gap-1.5 px-3 rounded-xl border-primary/30 text-xs font-semibold bg-primary/10 hover:bg-primary/20 hover:text-primary transition-all shadow-sm flex items-center justify-center"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 w-9 rounded-xl border border-border/60 bg-card/80 hover:bg-accent flex items-center justify-center transition-all shadow-sm p-0.5 outline-none focus:ring-2 focus:ring-primary/40">
              <Avatar className="w-7 h-7 rounded-lg">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-bold rounded-lg">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2 bg-card border-border shadow-xl rounded-xl">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none truncate">{user?.displayName || "Account"}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{user?.email || "Signed in"}</p>
                <div className="pt-1 flex items-center gap-1.5 text-[10px] text-green-500 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Secure & Verified</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {onOpenSettings && (
              <DropdownMenuItem onClick={onOpenSettings} className="gap-2 cursor-pointer text-xs">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <span>AI Models & API Keys</span>
              </DropdownMenuItem>
            )}

            {onClearChats && (
              <DropdownMenuItem onClick={onClearChats} className="gap-2 cursor-pointer text-xs text-destructive hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Chat History</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOutUser()} className="gap-2 cursor-pointer text-xs text-destructive font-medium">
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
};
