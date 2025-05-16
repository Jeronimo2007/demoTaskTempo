import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Optional array of allowed roles
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until loading is finished before checking authentication
    if (loading) {
      return;
    }

    // Debug logging
    console.log('ProtectedRoute Debug:', {
      isAuthenticated,
      user,
      allowedRoles,
      userRole: user?.role,
      localStorageUser: typeof window !== 'undefined' ? localStorage.getItem('user') : null
    });

    // If not authenticated after loading, redirect to login
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // If authenticated and allowedRoles are specified, check the role
    if (isAuthenticated && allowedRoles && allowedRoles.length > 0) {
      const userRole = user?.role?.toLowerCase(); // Convert role to lowercase for comparison
      const isAllowed = userRole && allowedRoles.map(r => r.toLowerCase()).includes(userRole);
      
      console.log('Role Check:', {
        userRole,
        allowedRoles: allowedRoles.map(r => r.toLowerCase()),
        isAllowed
      });

      if (!userRole || !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
        console.log('Access denied - redirecting to login');
        router.push('/login');
      }
    }
  }, [isAuthenticated, user, loading, allowedRoles, router]);

  // If authenticated, show children, otherwise show null or a loader
  // Determine if the user has access based on authentication and role
  const hasAccess = isAuthenticated && (!allowedRoles || allowedRoles.length === 0 || 
    (user?.role && allowedRoles.map(r => r.toLowerCase()).includes(user.role.toLowerCase())));

  // Render children only if user has access, otherwise null (or a loading/unauthorized component)
  // If loading, return null (or a loading indicator)
  if (loading) {
    return null; // Or return <LoadingSpinner />;
  }

  // Render children only if loading is finished and user has access
  return hasAccess ? <>{children}</> : null; // Or redirect/show unauthorized component if needed
};

export default ProtectedRoute;
