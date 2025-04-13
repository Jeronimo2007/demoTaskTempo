import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Optional array of allowed roles
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
+  console.log("ProtectedRoute Component - Rendering..."); // Log component render entry
  const { user, isAuthenticated, loading } = useAuth(); // Add loading state
+  console.log("ProtectedRoute Component - useAuth state:", { loading, isAuthenticated, user: JSON.stringify(user) }); // Log state from useAuth
  const router = useRouter();

  useEffect(() => {
+    console.log("ProtectedRoute Effect - Running. Loading:", loading, "IsAuth:", isAuthenticated, "User:", JSON.stringify(user)); // Log entry
    // Wait until loading is finished before checking authentication
+    console.log("ProtectedRoute Effect - Checking loading state..."); // Log before loading check
    if (loading) {
+      console.log("ProtectedRoute Effect - Still loading, returning."); // Log if loading
      return; // Do nothing while loading
    }

    // If not authenticated after loading, redirect to login
+    console.log("ProtectedRoute Effect - Checking isAuthenticated state..."); // Log before auth check
    if (!isAuthenticated) {
+      console.log("ProtectedRoute Effect - Not authenticated, redirecting to login."); // Log if not auth
      router.push('/login');
      return; // Stop further execution in this effect run
    }

    // If authenticated and allowedRoles are specified, check the role
    if (isAuthenticated && allowedRoles && allowedRoles.length > 0) {
      const userRole = user?.role;
      const isAllowed = userRole && allowedRoles.includes(userRole);
      console.log(`ProtectedRoute Check: User=${JSON.stringify(user)}, Role='${userRole}', Allowed=${allowedRoles.join(',')}, IsAllowed=${isAllowed}`); // Log check details
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
