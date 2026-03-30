import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../provider/authProvider";

export const UserProtectedRoute = () => {
    const { permission } = useAuth();

    // Check if the user is admin
    if (permission == 'UserStatus') {
        // If user, render the child routes
        return <Outlet />;
    }

    // If not user, redirect to the dashboard page
    return <Navigate to="/" />;
};