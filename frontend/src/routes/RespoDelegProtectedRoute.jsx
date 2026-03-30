import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../provider/authProvider";

export const RespoDelegProtectedRoute = () => {
    const { permission } = useAuth();

    // Check if the user is admin
    if (permission == 'RespoDelegStatus') {
        // If admin, render the child routes
        return <Outlet />;
    }

    // If not admin, redirect to the dashboard page
    return <Navigate to="/" />;
};