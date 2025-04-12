import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Optional array of allowed roles
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth(); // Add loading state
  const router = useRouter();

  useEffect(() => {
    // Wait until loading is finished before checking authentication
    if (loading) {
      return; // Do nothing while loading
    }

    // If not authenticated after loading, redirect to login
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
  }, [isAuthenticated, user, loading, allowedRoles, router]); // Add loading to dependencies

  // If authenticated, show children, otherwise show null or a loader
  // Determine if the user has access based on authentication and role
  const hasAccess = isAuthenticated && (!allowedRoles || allowedRoles.length === 0 || (user?.role && allowedRoles.includes(user.role)));

  // Render children only if user has access, otherwise null (or a loading/unauthorized component)
  // If loading, return null (or a loading indicator)
  if (loading) {
    return null; // Or return <LoadingSpinner />;
  }

  // Render children only if loading is finished and user has access
  return hasAccess ? <>{children}</> : null; // Or redirect/show unauthorized component if needed
};

export default ProtectedRoute;
