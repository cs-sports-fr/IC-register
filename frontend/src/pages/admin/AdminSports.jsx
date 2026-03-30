import { Box } from "@mui/material";
import Navbar from "../../components/navbar/Navbar";
import { routesForAdmin, routesForSuperAdmin } from "../../routes/routes";
import { useEffect, useState } from "react";
import { ApiTossConnected } from "../../service/axios";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import SelectSportAdmin from "../../components/admin/SelectSportAdmin";
import { useAuth } from "../../provider/authProvider";


const AdminSports = () => {
    const navigation = useNavigate();

    const [sports, setSports] = useState([]);

    const fetchData = () => {
        const endpoints = [
            '/sports',
        ]
        axios.all(endpoints.map(url => ApiTossConnected.get(url)))
            .then(axios.spread((...responses) => {
                setSports(responses[0].data);

            })).catch((error) => {
                console.log(error);
            });
    }

    useEffect(() => {
        fetchData();
    }, []);

    const { permission } = useAuth();
    const routes = permission === 'SuperAdminStatus' ? routesForSuperAdmin : routesForAdmin;

    return (
        <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ overflowX: 'hidden' }}>
            {/* // Navbar */}
            <Navbar navigation={routes} />

            {/* // Page d'inscription d'une équipe */}
            <Box flexGrow={1} display={'flex'} >

                <SelectSportAdmin callback={(sport) => { navigation("/sport/" + sport.id) }} sports={sports} />

            </Box>
        </Box>
    );
}

export default AdminSports;
