import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../provider/authProvider";

export const AdminProtectedRoute = () => {
    const { permission } = useAuth();

    // Check if the user is admin
    if (permission == 'AdminStatus') {
        // If admin, render the child routes
        return <Outlet />;
    }

    // If not admin, redirect to the dashboard page
    return <Navigate to="/" />;
};