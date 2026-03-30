import Navbar from "../../components/navbar/Navbar";
import { routesForAdmin } from "../../routes/routes";

function AdminDashboard() {

    return (
        <Navbar navigation={routesForAdmin} />
    )
}

export default AdminDashboard
