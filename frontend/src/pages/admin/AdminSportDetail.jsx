import { Box, Tab, Tabs, Typography } from "@mui/material";
import Navbar from "../../components/navbar/Navbar";
import { routesForAdmin, routesForSuperAdmin } from "../../routes/routes";
import { useEffect, useState } from "react";
import TeamList from "../../components/team/TeamList";
import axios from "axios";
import { ApiICConnected } from "../../service/axios";
import { useLocation, useNavigate } from "react-router-dom";
import { parseSportAdmin } from "../../utils/parseSport";
import { useAuth } from "../../provider/authProvider";


const AdminSportDetail = () => {

    const navigation = useNavigate()

    const sportId = useLocation().pathname.split('/').pop();

    const [tabValue, setTabValue] = useState(0);

    const [sport, setSport] = useState({});
    const fetchData = () => {
        const endpoints = [
            'sports/' + sportId,
        ]
        axios.all(endpoints.map(url => ApiICConnected.get(url)))
            .then(axios.spread((...responses) => {
                setSport(parseSportAdmin(responses[0].data));
                setFilteredTeams(responses[0].data.teams.filter(team => team.status === 'Validated'));

            })).catch((error) => {
                console.log(error);
            });
    }

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const [filteredTeams, setFilteredTeams] = useState([]);
    const handleChangeTab = (event, newValue) => {
        setTabValue(newValue);
        setFilteredTeams(sport?.teams?.filter(team => team.status === event.target.id));
    }
    const incompleteTeamsCount = sport?.teams?.filter(team => team.status === 'Incomplete').length || 0;
    const waitingTeamsCount = sport?.teams?.filter(team => team.status === 'Waiting').length || 0;
    const awaitingauthorizationTeamsCount = sport?.teams?.filter(team => team.status === 'Awaitingauthorization').length || 0;
    const principalTeamsCount = sport?.teams?.filter(team => team.status === 'PrincipalList').length || 0;
    const validatedTeamsCount = sport?.teams?.filter(team => team.status === 'Validated').length || 0;

    const { permission } = useAuth();
    const routes = permission === 'SuperAdminStatus' ? routesForSuperAdmin : routesForAdmin;

    return (
        <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ bgcolor: 'background.drawer', overflowX: 'hidden', width: '100%' }}>
            {/* // Navbar */}
            <Navbar navigation={routes} />

            <Box display={'flex'} justifyContent={'center'} >
                <Box sx={{ mt: 5, textAlign: 'center' }}>
                    <Typography variant={'h2'}>{sport.sport}</Typography>
                    <Typography variant={'h5'} color={'primary.main'} >{sport?.teams?.length || 0}/{sport.nbOfTeams}</Typography>
                </Box>
            </Box>

            <Box 
                display={'flex'} 
                justifyContent={'center'} 
                mt={4}
                sx={{ 
                    width: '100%',
                    px: { xs: 0, md: 0 },
                    mx: { xs: 0, md: 0 }
                }}
            >
                <Tabs 
                    value={tabValue} 
                    onChange={handleChangeTab}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{ 
                        bgcolor: 'background.default', 
                        borderRadius: '0.8rem',
                        width: { xs: '100%', md: 'auto' },
                        maxWidth: { xs: '100%', md: '90%' },
                        '& .MuiTabs-scrollButtons': {
                            '&.Mui-disabled': {
                                opacity: 0.3
                            }
                        },
                        '& .MuiTab-root': {
                            minWidth: '140px',
                            whiteSpace: 'nowrap',
                            fontSize: { xs: '0.75rem', md: '0.875rem' },
                            padding: { xs: '10px 16px', md: '12px 16px' },
                            textTransform: 'none'
                        }
                    }}
                >
                    <Tab label={`Inscrit (${validatedTeamsCount})`} id="Validated" />
                    <Tab label={`Sélectionné (${principalTeamsCount})`} id="PrincipalList" />
                    <Tab label={`Attente validation logement (${awaitingauthorizationTeamsCount})`} id="Awaitingauthorization" />
                    <Tab label={`Liste Attente (${waitingTeamsCount})`} id="Waiting" />
                    <Tab label={`Dossier non finalisé (${incompleteTeamsCount})`} id="Incomplete" />
                </Tabs>
            </Box>

            <Box display={'flex'} justifyContent={'center'} mt={4} >
                <TeamList headerItem={headerItem} columns={columns} teams={filteredTeams} admin={true} onModify={(team) => { navigation("/team/" + team.id) }} />
            </Box>

        </Box>
    );
}

export default AdminSportDetail;

const headerItem =
    <Typography>Liste des équipes</Typography>

const columns = [
    { label: "N°", align: "left", key: "id", type: 'index' },
    { label: "Nom", align: "center", key: "name" },
    { label: "Ecole", align: "center", key: "schoolName" },
    { label: "Nombre de joueurs·euses", align: "center", key: "len" },
    { label: "Status", align: "center", key: "status", type: "status" },
    { label: "Prix total", align: "center", key: "amountToPayInCents" },
    { label: "Prix payé", align: "center", key: "amountPaidInCents" }
]