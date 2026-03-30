import { useEffect, useState } from "react";
import EquipesInscritesPage from "../../components/dashboard/EquipesInscrites";
import ToPayCard from "../../components/dashboard/ToPayCard";
import Navbar from "../../components/navbar/Navbar";
import { routesForUser } from "../../routes/routes";
import { Grid, Box } from "@mui/material";
import { ApiTossConnected } from "../../service/axios";
import axios from "axios";
import { parseTeamDashboard } from "../../utils/parseTeam";
import { calculatePrice } from "../../utils/calculatePrice";
import UserTimeline from "../../components/dashboard/UserTimeline";
import UserInsurance from "../../components/dashboard/UserInsurance";

function RespoDelegDashboard() {

    const [teams, setTeams] = useState([]);
    const [paymentData, setPaymentData] = useState({});
    const fetchData = () => {
        const endpoints = [
            'teams',
        ]
        axios.all(endpoints.map(url => ApiTossConnected.get(url)))
            .then(axios.spread((...responses) => {
                setTeams(parseTeamDashboard(responses[0].data));
                setPaymentData(calculatePrice(responses[0].data));
            })).catch((error) => {
                console.log(error);
            });
    }

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar navigation={routesForUser} />
            <Box sx={{ display: 'flex', bgcolor: 'background.drawer' }}>
                <Grid container spacing={0} sx={{ mx: 8, my: 4 }}>
                <Grid item xs={12} md={12} sx={{ p: 2, bgcolor: 'background.drawer' }}>
                        <UserInsurance minHeight={'25vh'}  />
                    </Grid>

                    <Grid item xs={12} sx={{ p: 2, bgcolor: 'background.drawer' }}>
                        <UserTimeline teams={teams} />
                    </Grid>

                    <Grid item xs={12} sx={{ p: 2, bgcolor: 'background.drawer' }}>
                        <EquipesInscritesPage teams={teams} />
                    </Grid>

                    
                    <Grid item xs={12} md={12} sx={{ p: 2, bgcolor: 'background.drawer' }}>
                        <ToPayCard minHeight={'25vh'} payments={paymentData} />
                    </Grid>

                </Grid>
            </Box >
            <Box sx={{ bgcolor: 'background.drawer', flexGrow: 1 }} />
        </Box>
    );
}

export default RespoDelegDashboard;
