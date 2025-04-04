import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Optional array of allowed roles
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth(); // Get user object which includes role
  const router = useRouter();

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.push('/login');
      return; // Stop further execution in this effect run
    }

    // If authenticated and allowedRoles are specified, check the role
    if (isAuthenticated && allowedRoles && allowedRoles.length > 0) {
      if (!user?.role || !allowedRoles.includes(user.role)) {
        // User role is not allowed, redirect (e.g., to an unauthorized page or home)
        // For now, redirecting to login, but ideally to a dedicated unauthorized page
        router.push('/login');
      }
    }
  }, [isAuthenticated, user, allowedRoles, router]);

  // If authenticated, show children, otherwise show null or a loader
  // Determine if the user has access based on authentication and role
  const hasAccess = isAuthenticated && (!allowedRoles || allowedRoles.length === 0 || (user?.role && allowedRoles.includes(user.role)));

  // Render children only if user has access, otherwise null (or a loading/unauthorized component)
  return hasAccess ? <>{children}</> : null;
};

export default ProtectedRoute;
