import { Box, Tab, Tabs, Typography, FormControl, TextField, MenuItem, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, CircularProgress, Snackbar, Alert, IconButton, Chip } from "@mui/material";
import Navbar from "../../components/navbar/Navbar";
import { routesForAdmin, routesForSuperAdmin } from "../../routes/routes";
import { useEffect, useState } from "react";
import TeamList from "../../components/team/TeamList";
import { ApiTossConnected } from "../../service/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../provider/authProvider";
import HomeIcon from '@mui/icons-material/Home';
import { Edit } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';


const SuperAdminDashboard = () => {
    const navigation = useNavigate();
    const [tabValue, setTabValue] = useState(0);
    const [teams, setTeams] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [sports, setSports] = useState([]);
    const [selectedSport, setSelectedSport] = useState("");
    const [currentStatus, setCurrentStatus] = useState("Validated");
    const [isRezFilter, setIsRezFilter] = useState(false);
    const [isCautionFilter, setCautionFilter] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    
    const fetchTeams = (status, sportId = null, logementRezOk = null, cautionOK =null) => {
        setLoading(true);
        // Clear previous data immediately to prevent stale data display
        setParticipants([]);  
        setTeams([]);
        
        // Start with the basic URL
        let url = `/teams/toss_services/filter`;
        
        // Add query parameters
        const params = [];
        if (status && !isRezFilter) params.push(`status=${status}`);
        if (sportId) params.push(`sport_id=${sportId}`);
        if (logementRezOk !== null) params.push(`logement_rez_ok=${logementRezOk}`);
        if (cautionOK !== null) params.push(`caution_ok=${cautionOK}`);

        
        // Always include participants with packId for counting
        params.push('include_participants=true');
        
        // Add params to URL if there are any
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }
        
        ApiTossConnected.get(url)
        .then((response) => {
            // If we're filtering by Rez or Caution
            if ((isRezFilter || logementRezOk !== null) || (isCautionFilter || cautionOK !== null)) {
                let filteredParticipants = [];
                response.data.forEach(team => {
                    if (team.participants) {
                        // For Rez tab use logementRezOk = false; for caution tab use cautionOK = false
                        let condition;
                        if (isRezFilter || logementRezOk !== null) {
                            condition = participant => participant.logementRezOk === false;
                        }
                        if (isCautionFilter || cautionOK !== null) {
                            // If both filters are provided, you might decide on a combined condition.
                            // Here, for caution filtering we only check cautionOK.
                            condition = participant => participant.cautionOK === false;
                        }
                        const teamFiltered = team.participants.filter(condition).map(participant => ({
                            ...participant,
                            teamName: team.name,
                            teamId: team.id,
                            sportName: team.sport?.sport || 'N/A',
                            schoolName: team.school?.name || 'N/A'
                        }));
                        filteredParticipants = [...filteredParticipants, ...teamFiltered];
                    }
                });
                setParticipants(filteredParticipants);
                // Also filter teams that have at least one participant meeting the condition
                const filteredTeams = response.data.filter(team =>
                    team.participants && team.participants.some(participant =>
                        (isRezFilter || logementRezOk !== null) ? participant.logementRezOk === false : true &&
                        (isCautionFilter || cautionOK !== null) ? participant.cautionOK === false : true
                    )
                );
                setTeams(filteredTeams);
            } else {
                setTeams(response.data);
            }
            setLoading(false);
        })
        .catch((error) => {
            console.log("Error fetching data:", error);
            showSnackbar("Erreur lors du chargement des données", "error");
            setLoading(false);
        });
    };

    const fetchSports = () => {
        ApiTossConnected.get('/sports')
            .then((response) => {
                setSports(response.data);
            })
            .catch((error) => {
                console.log("Error fetching sports:", error);
                showSnackbar("Erreur lors du chargement des sports", "error");
            });
    };

    useEffect(() => {
        fetchSports();
        fetchTeams("Validated");
    }, []);

    const handleChangeTab = (event, newValue) => {
        setTabValue(newValue);
        const status = event.target.id;
        
        // Reset state before fetching new data
        setLoading(true);
    
        if (status === "RezNon") {
            
            setCautionFilter(false);
            setIsRezFilter(true);
            setCurrentStatus(null);
            fetchTeams(null, selectedSport, false);
        } else if (status === "CautionNon") {
            
            setIsRezFilter(false);
            setCautionFilter(true);
            setCurrentStatus(null);
            fetchTeams(null, selectedSport, null, false);
        } else {
            
            setIsRezFilter(false);
            setCautionFilter(false);
            setCurrentStatus(status);
            fetchTeams(status, selectedSport);
        }
    };

    const handleChangeSport = (event) => {
        const sportId = event.target.value;
        setSelectedSport(sportId);
        
        setLoading(true);
        if (isRezFilter) {
            fetchTeams(null, sportId || null, false);
        } else {
            fetchTeams(currentStatus, sportId || null);
        }
    };

    const handleValidateParticipantRez = async (teamId, participantId) => {
        try {
            await ApiTossConnected.put(`/teams/${teamId}/participant/${participantId}/validate-rez`);
            fetchTeams(null, selectedSport, false);
        } catch (error) {
            console.error("Error validating participant rez:", error);
            showSnackbar("Erreur lors de la validation de la résidence", "error");
        }
    };

    const handleValidateCaution = async (teamId, participantId) => {
        try {
            await ApiTossConnected.put(`/teams/${teamId}/participant/${participantId}/validate-caution`);
            fetchTeams(null, selectedSport, null, false);
        } catch (error) {
            console.error("Error validating caution", error);
            showSnackbar("Erreur lors de la validation de la caution", "error");
        }
    };


    const handleResendCautionEmail = async (teamId, participantId) => {
        try {
            await ApiTossConnected.post(`/teams/${teamId}/participant/${participantId}/resend-caution-email`);
            showSnackbar("Email de caution renvoyé avec succès", "success");
        } catch (error) {
            console.error("Error sending email:", error);
            showSnackbar("Erreur lors de l'envoie de l'email de caution", "error");
        }
    };
    
    // New function to update team status
    const handleUpdateStatus = async (teamId, newStatus) => {
        try {
            setLoading(true);
            await ApiTossConnected.put('teams/' + teamId + '/status?status=' + newStatus);
            fetchTeams(currentStatus, selectedSport);
        } catch (error) {
            console.error("Error updating team status:", error);
            setLoading(false);
        }
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar({...snackbar, open: false});
    };

    const { permission } = useAuth();
    const routes = permission === 'SuperAdminStatus' ? routesForSuperAdmin : routesForAdmin;

    // Calculate counts
    const incompleteTeamsCount = teams?.filter(team => team.status === 'Incomplete').length || ' - ';
    const waitingTeamsCount = teams?.filter(team => team.status === 'Waiting').length || ' - ';
    const awaitingauthorizationTeamsCount = teams?.filter(team => team.status === 'Awaitingauthorization').length || ' - ';
    const principalTeamsCount = teams?.filter(team => team.status === 'PrincipalList').length || " - ";
    const validatedTeamsCount = teams?.filter(team => team.status === 'Validated').length || " - ";
    const rezNoTeamsCount = isRezFilter ? participants?.length || ' - ' : ' - ';
    const cautionCount = isCautionFilter ? participants?.length || ' - ' : ' - ';
    
    
    return (
        <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ overflowX: 'hidden', bgcolor: 'background.drawer' }}>
            {/* Navbar */}
            <Navbar navigation={routes} />

            <Box display={'flex'} justifyContent={'center'}>
                <Box sx={{ mt: 5, textAlign: 'center' }}>
                    <Typography variant={'h2'}>Tableau de bord</Typography>
                </Box>
            </Box>

            <Box display={'flex'} justifyContent={'center'} mt={4}>
                <FormControl sx={{ minWidth: 200, mr: 2, fontWeight:'bold', display:'flex',flexDirection:"row", alignItems:"center", gap:3 }}>
                    <Typography>Sport: </Typography>                   
                    <TextField
                        select
                        value={selectedSport}
                        onChange={handleChangeSport}
                        variant="outlined"
                        fullWidth
                    >
                        <MenuItem value="">Tous les sports</MenuItem>
                        {sports.map((sport) => (
                            <MenuItem key={sport.id} value={sport.id}>
                                {sport.sport}
                            </MenuItem>
                        ))}
                    </TextField>
                </FormControl>
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
                    <Tab label={`Rez (${rezNoTeamsCount})`} id="RezNon" />
                    <Tab label={`Caution non validée (${cautionCount})`} id="CautionNon" />
                </Tabs>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" my={5}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box display={'flex'} justifyContent={'center'} mt={4}>
                    {isRezFilter ? (
                        participants.length > 0 ? (
                            <ParticipantList 
                                columns={participantColumns} 
                                participants={participants} 
                                onValidate={handleValidateParticipantRez}
                                caution= {false}
                                onTeamClick={(teamId) => navigation(`/team/${teamId}`)}
                            />
                        ) : (
                            <Card sx={{ width: '100%', maxWidth: 1200, mb: 4, borderRadius: '0.8rem' }}>
                                <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <Typography variant="h6">
                                        Plus de travail ! Tous les participants en rez ont été validés !
                                    </Typography>
                                </CardContent>
                            </Card>
                        )
                    ) :
                    isCautionFilter ? (
                        participants.length > 0 ? (
                            <ParticipantList 
                                columns={participantColumns} 
                                participants={participants} 
                                onValidate={handleValidateCaution}
                                onResendCautionEmail={handleResendCautionEmail}
                                caution= {true}
                                onTeamClick={(teamId) => navigation(`/team/${teamId}`)}
                            />
                        ) : (
                            <Card sx={{ width: '100%', maxWidth: 1200, mb: 4, borderRadius: '0.8rem' }}>
                                <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <Typography variant="h6">
                                        Plus de travail ! Tous les participants avec caution approuvée ont été validés !
                                    </Typography>
                                </CardContent>
                            </Card>
                        )
                    ) : currentStatus === "Awaitingauthorization" ? (
                        // Special case for Awaitingauthorization tab with logement count
                        <TeamListWithCounts 
                            headerItem={<Typography>Liste des équipes

                                </Typography>} 
                            columns={columnsWithLogementCount} 
                            teams={teams} 
                            onModify={(team) => { navigation("/team/" + team.id) }} 
                            onUpdateStatus={handleUpdateStatus} // Pass the update status function
                        />
                    ) : (
                        // Default TeamList for other tabs
                        <TeamList 
                            headerItem={headerItem} 
                            columns={columns} 
                            teams={teams} 
                            admin={true} 
                            onModify={(team) => { navigation("/team/" + team.id) }} 
                        />
                    )}
                </Box>
            )}
            
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};



// In the ParticipantList component, modify to include navigation functionality
const ParticipantList = ({ columns, participants, onValidate,onResendCautionEmail,onTeamClick,caution }) => {
    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mb: 4 }}>
            <Card sx={{ borderRadius: '0.8rem' }}>
                <CardContent>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow variant="head">
                                    {columns.map((column, index) => (
                                        <TableCell key={index} align={column?.align}>{column?.label}</TableCell>
                                    ))}
                                    <TableCell align="center">
                                        {caution ? 'Valider caution' : 'Valider rez'}
                                    </TableCell>
                                    {caution ? 
                                        <TableCell align="center">Renvoi caution</TableCell> : 
                                        null
                                    }
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {participants.length > 0 ? participants.map((participant, index) => (
                                    <TableRow key={index}>
                                        {columns.map((column, columnIndex) => {
                                            if (column.type === 'index') {
                                                return (
                                                    <TableCell key={columnIndex} align={column?.align}>
                                                        {index + 1}
                                                    </TableCell>
                                                );
                                            }
                                            
                                            // Handle nested properties (e.g. pack.name)
                                            const value = column.key.includes('.') 
                                                ? column.key.split('.').reduce((obj, key) => obj && obj[key], participant)
                                                : participant[column.key];
                                                
                                            // Special handling for teamName column to make it clickable
                                            if (column.key === 'teamName') {
                                                return (
                                                    <TableCell 
                                                        key={columnIndex} 
                                                        align={column?.align}
                                                        onClick={() => onTeamClick(participant.teamId)}
                                                        sx={{ 
                                                            cursor: 'pointer',
                                                            color: 'primary.main',
                                                            '&:hover': { 
                                                                textDecoration: 'underline',
                                                                fontWeight: 'bold'
                                                            }
                                                        }}
                                                    >
                                                        {value || 'N/A'}
                                                    </TableCell>
                                                );
                                            }
                                                
                                            return (
                                                <TableCell key={columnIndex} align={column?.align}>
                                                    {value || 'N/A'}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell align="center">
                                            <IconButton 
                                                color="primary"
                                                onClick={() => onValidate(participant.teamId, participant.id)}
                                            >
                                                {caution ? <AttachMoneyIcon /> : <HomeIcon />}
                                            </IconButton>
                                        </TableCell>
                                        {caution ? 
                                         <TableCell align="center">
                                            <IconButton 
                                                color="primary"
                                                onClick={() => onResendCautionEmail(participant.teamId, participant.id)}
                                            >
                                                <LocalAtmIcon />
                                            </IconButton>
                                        </TableCell> : 
                                        null
                                    }
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length + 1} align="center">
                                            <Typography component="h2" sx={{ color: 'divider', marginTop: '1rem' }}>
                                                Aucun participant à valider
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
};

const PackRatioCell = ({ sportId, align }) => {
    const [ratio, setRatio] = useState(null);

    useEffect(() => {
        if (sportId) {
            ApiTossConnected.get(`/sports/${sportId}/pack-ratio`)
                .then(response => {
                    setRatio(response.data.ratio);
                })
                .catch(error => {
                    console.error("Error fetching pack ratio:", error);
                });
        }
    }, [sportId]);

    return (
        <TableCell align={align}>
            {ratio !== null ? `${(ratio * 100).toFixed(1)}%` : 'Loading...'}
            </TableCell>
    );
};

// Add TeamListWithCounts component for teams with logement count
const TeamListWithCounts = ({ headerItem, columns, teams, onModify, onUpdateStatus }) => {
    // Function to count participants with packId 17
    const countPackId17 = (participants) => {
        if (!participants || !Array.isArray(participants)) return 0;
        return participants.filter(p => p.packId === 17).length;
    };
    const countPackId16 = (participants) => {
        if (!participants || !Array.isArray(participants)) return 0;
        return participants.filter(p => p.packId === 1 || p.packId === 6).length;
    };


    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mb: 4 }}>
            <Card sx={{ borderRadius: '0.8rem' }}>
                <CardContent>
                    {headerItem && <Box mb={2}>{headerItem}</Box>}
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow variant="head">
                                    {columns.map((column, index) => (
                                        <TableCell key={index} align={column?.align}>
                                            {column?.label}
                                        </TableCell>
                                    ))}
                                    <TableCell align="center">Sélectionner l'équipe</TableCell>
                                    <TableCell align="center">Refuser l'équipe</TableCell>
                                    <TableCell align="center">Modifier</TableCell>


                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {teams && teams.length > 0 ? teams.map((team, index) => (
                                    <TableRow key={index}>
                                    {columns.map((column, columnIndex) => {
                                        const count = countPackId17(team.participants);
                                        const countrez= countPackId16(team.participants);
                                        if (column.type === 'index') {
                                            return <TableCell key={columnIndex} align={column.align}>{index + 1}</TableCell>;
                                        } else if (column.type === 'logementCount') {
                                            return <TableCell key={columnIndex} align={column.align}>
                                                {count > 0 ? count : 'Aucun'}
                                            </TableCell>;
                                        } else if (column.type === 'rezCount') {
                                            return <TableCell key={columnIndex} align={column.align}>
                                                {countrez > 0 ? countrez : 'Aucun'}
                                            </TableCell>;
                                        }  else if (column.type === 'tenteCount') {
                                            return <PackRatioCell key={columnIndex} sportId={team.sport?.id} align={column.align} />;
                                        }                                 
                                        else {
                                            return <TableCell key={columnIndex} align={column.align}>
                                                {column.key.includes('.') 
                                                    ? column.key.split('.').reduce((obj, key) => obj && obj[key], team)
                                                    : team[column.key]}
                                            </TableCell>;
                                        }
                                    })}
                                    <TableCell align="center" sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                            <IconButton 
                                                color="primary"
                                                size="small" 
                                                onClick={() => onUpdateStatus(team.id, 'PrincipalList')}
                                            >
                                                <CheckIcon />
                                            </IconButton>
                                            
                                            
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton 
                                                color="primary"
                                                size="small" 
                                                onClick={() => onUpdateStatus(team.id, 'Waiting')}
                                            >
                                                <CloseIcon />
                                            </IconButton>

                                        </TableCell>
                                        <TableCell align="center">
                                        <IconButton 
                                                
                                                size="small" 
                                                onClick={() => onModify(team)}
                                            >
                                                <Edit />
                                            </IconButton>
                                        </TableCell>
                                        
                                        
                                        
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length + 1} align="center">
                                            <Typography component="h2" sx={{ color: 'divider', my: 2 }}>
                                                Aucune équipe trouvée
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
};

export default SuperAdminDashboard;

const headerItem = <Typography>Liste des équipes</Typography>;

const columns = [
    { label: "N°", align: "left", key: "id", type: 'index' },
    { label: "Nom", align: "center", key: "name" },
    { label: "Sport", align: "center", key: "sport.sport" },
    { label: "Ecole", align: "center", key: "school.name" },
    { label: "Status", align: "center", key: "status", type: "status" },
];

// Columns for participant list in the Rez tab
const participantColumns = [
    { label: "N°", align: "left", type: 'index' },
    { label: "Prénom", align: "center", key: "firstname" },
    { label: "Nom", align: "center", key: "lastname" },
    { label: "Équipe", align: "center", key: "teamName" },
    { label: "Sport", align: "center", key: "sportName" },
    { label: "École", align: "center", key: "schoolName" },
];

// Add this with your other column definitions at the bottom of the file
const columnsWithLogementCount = [
    { label: "N°", align: "left", key: "id", type: 'index' },
    { label: "Nom", align: "center", key: "name" },
    { label: "Sport", align: "center", key: "sport.sport" },
    { label: "Ecole", align: "center", key: "school.name" },
    { label: "Participants en tente", align: "center", key: "participants", type: "logementCount" },
    { label: "Participants en rez", align: "center", key: "participants", type: "rezCount" },
    {label: "Pourcentage tente", align: "center", key: "participants", type: "tenteCount"},

];