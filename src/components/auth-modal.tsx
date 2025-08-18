
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();

  if (!isOpen) {
    return null;
  }

  const goToLogin = () => {
    onClose();
    router.push('/login');
  }
  
  const goToSignup = () => {
    onClose();
    router.push('/signup');
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Authentication Required</AlertDialogTitle>
          <AlertDialogDescription>
            You need to be logged in to perform this action. Please sign up or log in to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={goToLogin}>
            Log In
          </AlertDialogAction>
           <AlertDialogAction onClick={goToSignup}>
            Sign Up
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
