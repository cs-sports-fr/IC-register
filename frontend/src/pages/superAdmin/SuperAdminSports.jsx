import { 
    Box, 
    Typography, 
    Paper,
    CircularProgress,

  } from "@mui/material";
  import Navbar from "../../components/navbar/Navbar";
  import { routesForAdmin, routesForSuperAdmin } from "../../routes/routes";
  import { useEffect, useState } from "react";
  import { ApiICConnected } from "../../service/axios";
  import { useAuth } from "../../provider/authProvider";
  import ParticipantList from "../../components/team/PartcipantList";
  import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
  
  
  const SuperAdminSports = () => {
   
    // State for participants data
    const [sportsData, setSportsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
   
    
    const { permission } = useAuth();
    const routes = permission === 'SuperAdminStatus' ? routesForSuperAdmin : routesForAdmin;
    const columns = [
      {
        key: 'name',
        label: 'Sport',
        render: (sport) => (
          <Typography variant="body1" fontWeight="medium">
            {sport.sport}
          </Typography>
        )
      },
      {
        key: 'incomplete',
        label: 'Dossier Incomplet',
        render: (sport) => (
          <Typography align="center">
            {sport.team_status_counts?.Incomplete ?? 0}
          </Typography>
        )
      },
      {
        key: 'waiting',
        label: "Liste d'attente",
        render: (sport) => (
          <Typography align="center">
            {sport.team_status_counts?.Waiting ?? 0}
          </Typography>
        )
      },
      {
        key: 'principalList',
        label: 'Selectionné',
        render: (sport) => (
          <Typography align="center">
            {sport.team_status_counts?.PrincipalList ?? 0}
          </Typography>
        )
      },
      {
        key: 'validated',
        label: 'Inscris',
        render: (sport) => (
          <Typography align="center">
            {sport.team_status_counts?.Validated ?? 0}
          </Typography>
        )
      },
      {
        key: 'percent',
        label: 'Pourcentage d\'inscription',
        render: (sport) => (
          <Typography align="center">
           {(((sport.team_status_counts?.Validated ?? 0) + (sport.team_status_counts?.PrincipalList ?? 0)) / (sport.max_teams) * 100).toFixed(1)} %
          </Typography>
        )
      },
      {
        key: 'maxteams',
        label: "Nombre d'équipes max",
        render: (sport) => (
          <Typography align="center">
            {sport.max_teams}
          </Typography>
        )
      },
    ];
    const fetchSportsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
       
        
        const response = await ApiICConnected.get(`/sports/team-status-count/all`);
        setSportsData(response.data);
      } catch (err) {
        console.error("Error fetching sports data:", err);
        setError("Failed to load sports data");
      } finally {
        setLoading(false);
      }
    };
    
    useEffect(() => {
      fetchSportsData();
    }, []);
    
  
 
  
    return (
        <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ overflowX: 'hidden', bgcolor: 'background.drawer' }}>
        <Navbar navigation={routes} />
        
        <Box sx={{ px: 4, py: 3, flexDirection: 'column', alignItems: 'center', display: 'flex'}}>
        
           <Box sx={{display: 'flex', flexDirection:'row', justifyContent:'center', alignItems: 'center', p: 2, gap:5, width: '100%', mb: 5, borderRadius: 1}}>
           <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
          {loading && (
            <Box display="flex" justifyContent="center" my={5}>
              <CircularProgress />
            </Box>
          )}
          
          {error && !loading && (
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'error.light', color: 'error.contrastText', width: '100%' }}>
              <Typography>{error}</Typography>
            </Paper>
          )}
          
          {!loading && !error && sportsData && (
            <ParticipantList
              data={sportsData}
              columns={columns}
               headerItem={
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SportsBasketballIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Répartition des équipes par sports</Typography>
                </Box>
                            }
            />
          )}
        </Box>
      </Box>
      </Box>
      </Box>
    );
  };
  
  export default SuperAdminSports;