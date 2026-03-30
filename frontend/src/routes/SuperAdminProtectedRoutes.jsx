import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../provider/authProvider";

export const SuperAdminProtectedRoute = () => {
    const { permission } = useAuth();

    // Check if the user is admin
    if (permission == 'SuperAdminStatus') {
        // If super admin, render the child routes
        return <Outlet />;
    }

    // If not super admin, redirect to the dashboard page
    return <Navigate to="/" />;
};