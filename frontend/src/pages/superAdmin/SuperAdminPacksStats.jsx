import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  Grid, 
  Paper, 
  Chip,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardHeader,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Button,
  IconButton
} from "@mui/material";
import Navbar from "../../components/navbar/Navbar";
import { routesForAdmin, routesForSuperAdmin } from "../../routes/routes";
import { useEffect, useState } from "react";
import { ApiTossConnected } from "../../service/axios";
import { useAuth } from "../../provider/authProvider";

// Import chart components from MUI X
import { 
  PieChart, 
  pieArcLabelClasses,
  BarChart,
  LineChart
} from '@mui/x-charts';

// Import necessary icons
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GroupIcon from '@mui/icons-material/Group';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import SchoolIcon from '@mui/icons-material/School';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';

const SuperAdminPacksStats = () => {
  // State for filters
  const [sports, setSports] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teamStatuses, setTeamStatuses] = useState([]);
  const [packs, setPacks] = useState([]);
  const [genderOptions, setGenderOptions] = useState(['M', 'F', 'preferNotToSay']); // Add gender options
  
  // State for selected filters
  const [selectedSports, setSelectedSports] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedTeamStatuses, setSelectedTeamStatuses] = useState([]);
  const [selectedPacks, setSelectedPacks] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]); // Add state for selected genders
  const [includeCaptain, setIncludeCaptain] = useState(true);
  
  // State for stats data
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const STATUS_LABELS = {
    "Validated": "Inscris",
    "Incomplete": "Dossier incomplet",
    "Waiting": "Liste d'attente",
    "Awaitingauthorization": "Attente validation logement",
    "PrincipalList": "Selectionné"
};

  // Colors for charts
  const CHART_COLORS = [
    '#2196F3', '#FF9800', '#4CAF50', '#E91E63',
    '#9C27B0', '#00BCD4', '#FFC107', '#3F51B5',
    '#CDDC39', '#795548', '#607D8B', '#F44336'
  ];
  
  const { permission } = useAuth();
  const routes = permission === 'SuperAdminStatus' ? routesForSuperAdmin : routesForAdmin;
  
  // Fetch all sports, schools, team statuses and packs for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // Fetch sports
        const sportsResponse = await ApiTossConnected.get('/sports');
        setSports(sportsResponse.data);
        
        // Fetch schools and sort alphabetically
        const schoolsResponse = await ApiTossConnected.get('/schools');
        const sortedSchools = schoolsResponse.data.sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        setSchools(sortedSchools);
        
        // Fetch packs
        const packsResponse = await ApiTossConnected.get('/packs');
        setPacks(packsResponse.data);
        
        // Team statuses (hardcoded since these are enum values)
        setTeamStatuses(['Incomplete','Waiting','Awaitingauthorization','PrincipalList','Validated']);
        
      } catch (err) {
        console.error("Error fetching filter data:", err);
        setError("Failed to load filter options");
      }
    };
    
    fetchFilterData();
  }, []);
  
  // Fetch stats data based on filters
  const fetchStatsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (selectedSports.length > 0) {
        selectedSports.forEach(sportId => {
          params.append('sport_ids', sportId);
        });
      }
      
      if (selectedSchools.length > 0) {
        selectedSchools.forEach(schoolId => {
          params.append('school_ids', schoolId);
        });
      }
      
      if (selectedTeamStatuses.length > 0) {
        selectedTeamStatuses.forEach(status => {
          params.append('team_status', status);
        });
      }
      
      if (selectedPacks.length > 0) {
        selectedPacks.forEach(packId => {
          params.append('pack_ids', packId);
        });
      }
      
      // Add gender filter
      if (selectedGenders.length > 0) {
        selectedGenders.forEach(gender => {
          params.append('gender', gender);
        });
      }
      
      params.append('include_captain', includeCaptain);
      
      // Make the API call
      const response = await ApiTossConnected.get(`/teams/packs/statistics?${params.toString()}`);
      setStatsData(response.data);
    } catch (err) {
      console.error("Error fetching stats data:", err);
      setError("Failed to load statistics data");
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data on initial load
  useEffect(() => {
    fetchStatsData();
  }, []);
  
  // Handle filter changes
  const handleSportsChange = (event) => {
    setSelectedSports(event.target.value);
  };
  
  const handleSchoolsChange = (event) => {
    setSelectedSchools(event.target.value);
  };
  
  const handleTeamStatusesChange = (event) => {
    setSelectedTeamStatuses(event.target.value);
  };
  
  const handlePacksChange = (event) => {
    setSelectedPacks(event.target.value);
  };
  
  // Add handler for gender filter changes
  const handleGendersChange = (event) => {
    setSelectedGenders(event.target.value);
  };
  
  const handleIncludeCaptainChange = (event) => {
    setIncludeCaptain(event.target.checked);
  };
  
  const handleApplyFilters = () => {
    fetchStatsData();
  };
  
  
  
  // Prepare data for charts
  const preparePieChartData = () => {
    if (!statsData || !statsData.by_pack) return [];
    
    return Object.entries(statsData.by_pack).map(([packId, packData], index) => ({
      id: packId,
      value: packData.count,
      label: packData.name,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
  };
  
  const prepareBarChartData = () => {
    if (!statsData || !statsData.by_pack) return { packNames: [], counts: [] };
    
    const packNames = [];
    const counts = [];
    
    Object.entries(statsData.by_pack).forEach(([packId, packData]) => {
      packNames.push(packData.name);
      counts.push(packData.count);
    });
    
    return { packNames, counts };
  };
  
  const prepareSchoolChartData = () => {
    if (!statsData || !statsData.by_school) return { schoolNames: [], counts: [] };
    
    const schoolNames = [];
    const counts = [];
    
    Object.entries(statsData.by_school)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10) // Top 10 schools
      .forEach(([schoolId, schoolData]) => {
        schoolNames.push(schoolData.name);
        counts.push(schoolData.count);
      });
    
    return { schoolNames, counts };
  };
  
  const prepareSportChartData = () => {
    if (!statsData || !statsData.by_sport) return { sportNames: [], counts: [] };
    
    const sportNames = [];
    const counts = [];
    
    Object.entries(statsData.by_sport)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([sportId, sportData]) => {
        sportNames.push(sportData.name);
        counts.push(sportData.count);
      });
    
    return { sportNames, counts };
  };

  const prepareSportTentChartData = () => {
    if (!statsData || !statsData.by_sport) return { sportNames: [], counts: [] };
  
    const sportNames = [];
    const counts = [];
  
    Object.entries(statsData.by_sport).forEach(([sportId, sportData]) => {
      if (sportData.pack17_ratio !== null && sportData.pack17_ratio !== undefined) {
        sportNames.push(sportData.name);
        counts.push((sportData.pack17_ratio * 100).toFixed(1)); // convert ratio to percentage
      }
    });
  
    return { sportNames, counts };
  };
  
  // Add this new function to prepare product statistics data
  const calculateProductRevenue = () => {
    if (!statsData || !statsData.by_product) return [];
    
    return Object.entries(statsData.by_product).map(([productId, productData]) => ({
      name: productData.name,
      count: productData.count,
      price: productData.price,
      revenue: productData.total_revenue
    })).sort((a, b) => b.revenue - a.revenue);
  };

  // Update the getSummaryData function to include the new revenue breakdowns
  const getSummaryData = () => {
    if (!statsData) return { 
      total: 0, 
      revenue: 0, 
      packsRevenue: 0, 
      productsRevenue: 0, 
      avgPrice: 0, 
      packCount: 0,
      productCount: 0
    };
    
    return {
      total: statsData.total || 0,
      revenue: statsData.total_revenue || 0,
      packsRevenue: statsData.packs_revenue || 0,
      productsRevenue: statsData.products_revenue || 0,
      avgPrice: statsData.average_price_per_participant || 0,
      packCount: Object.keys(statsData.by_pack || {}).length,
      productCount: Object.keys(statsData.by_product || {}).length
    };
  };
  
  // Calculate pack-based revenue
  const calculatePackRevenue = () => {
    if (!statsData || !statsData.by_pack) return [];
    
    return Object.entries(statsData.by_pack).map(([packId, packData]) => ({
      name: packData.name,
      revenue: packData.count * packData.price
    })).sort((a, b) => b.revenue - a.revenue);
  };
  
  const summaryData = getSummaryData();
  const packRevenue = calculatePackRevenue();
  
  return (
    <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ overflowX: 'hidden', bgcolor: 'background.drawer' }}>
      {/* Navbar */}
      <Navbar navigation={routes} />
      
      <Box sx={{ px: 4, py: 3, flexDirection: 'column', alignItems: 'center', display: 'flex'}}>
      
         <Box sx={{display: 'flex', flexDirection:'row', justifyContent:'center', alignItems: 'center', p: 2, gap:5, width: '100%', mb: 5, borderRadius: 1}}>
         <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
         <Box sx={{width: '8rem'}}>
         <Typography>Sport:</Typography>
              </Box>
              <FormControl fullWidth>
                <Select
                  labelId="sports-filter-label"
                  multiple
                  value={selectedSports}
                  onChange={handleSportsChange}
                  input={<OutlinedInput label="Sports" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((sportId) => {
                        const sport = sports.find(s => s.id === sportId);
                        return <Chip key={sportId} label={sport ? sport.sport : sportId} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {sports.map((sport) => (
                    <MenuItem key={sport.id} value={sport.id}>
                      <Checkbox checked={selectedSports.indexOf(sport.id) > -1} />
                      <ListItemText primary={sport.sport} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* Schools filter */}
            <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
              <Box sx={{width: '8rem'}}>
              <Typography>Ecole:</Typography>
              </Box>
              <FormControl fullWidth size="small">
                <Select
                  labelId="schools-filter-label"
                  multiple
                  value={selectedSchools}
                  onChange={handleSchoolsChange}
                  input={<OutlinedInput label="Écoles" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((schoolId) => {
                        const school = schools.find(s => s.id === schoolId);
                        return <Chip key={schoolId} label={school ? school.name : schoolId} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {schools.map((school) => (
                    <MenuItem key={school.id} value={school.id}>
                      <Checkbox checked={selectedSchools.indexOf(school.id) > -1} />
                      <ListItemText primary={school.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* Team status filter */}
            <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
              <Box sx={{width: '8rem'}}>
                <Typography>Statut d'équipe:</Typography>
              </Box>
              <FormControl fullWidth size="small">
                <Select
                  labelId="team-status-filter-label"
                  multiple
                  value={selectedTeamStatuses}
                  onChange={handleTeamStatusesChange}
                  input={<OutlinedInput label="Statut d'équipe" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((status) => (
                        <Chip key={status} label={STATUS_LABELS[status] || status} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {teamStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      <Checkbox checked={selectedTeamStatuses.indexOf(status) > -1} />
                      <ListItemText primary={STATUS_LABELS[status] || status} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* Pack filter */}
            <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
              <Box sx={{width: '8rem'}}>
                <Typography>Pack:</Typography>
              </Box>
              <FormControl fullWidth size="small">
                <Select
                  labelId="packs-filter-label"
                  multiple
                  value={selectedPacks}
                  onChange={handlePacksChange}
                  input={<OutlinedInput label="Packs" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((packId) => {
                        const pack = packs.find(p => p.id === packId);
                        return <Chip key={packId} label={pack ? pack.name : packId} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {packs.map((pack) => (
                    <MenuItem key={pack.id} value={pack.id}>
                      <Checkbox checked={selectedPacks.indexOf(pack.id) > -1} />
                      <ListItemText primary={pack.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* NEW: Gender filter */}
            <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
              <Box sx={{width: '8rem'}}>
                <Typography>Genre:</Typography>
              </Box>
              <FormControl fullWidth size="small">
                <Select
                  labelId="gender-filter-label"
                  multiple
                  value={selectedGenders}
                  onChange={handleGendersChange}
                  input={<OutlinedInput label="Genre" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((gender) => (
                        <Chip key={gender} label={gender} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {genderOptions.map((gender) => (
                    <MenuItem key={gender} value={gender}>
                      <Checkbox checked={selectedGenders.indexOf(gender) > -1} />
                      <ListItemText primary={gender} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          
            {/* Action buttons */}
            <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
              <IconButton 
                onClick={handleApplyFilters}
              >
                <RefreshIcon sx={{color:'primary.main'}} />
              </IconButton>
            </Box>
          </Box>

          {loading && (
            <Box display="flex" justifyContent="center" my={5}>
              <CircularProgress />
            </Box>
          )}
          
          {error && !loading && (
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
              <Typography>{error}</Typography>
            </Paper>
          )}
          
          {/* Dashboard Content */}
          {!loading && !error && statsData && (
            <>
              {/* Summary Cards */}
              <Grid container spacing={3} sx={{display: 'flex', justifyContent: 'center',pb:2}}>
                <Grid item xs={11} sm={5.5} md={2.9} sx={{display: 'flex', justifyContent: 'center',alignItems: 'center'}}>
                <Card sx={{width: '80%',pb:2}}>
                <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <GroupIcon color="primary" fontSize="large" sx={{ mr: 1 }} />
                        <Typography variant="h6">Participants</Typography>
                      </Box>
                      <Typography variant="h4">{summaryData.total}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
             
                
                <Grid item xs={11} sm={5.5} md={2.9} sx={{display: 'flex', justifyContent: 'center',alignItems: 'center'}}>
                <Card sx={{width: '80%',pb:2}}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <ShoppingBagIcon color="primary" fontSize="large" sx={{ mr: 1 }} />
                        <Typography variant="h6">Types de packs</Typography>
                      </Box>
                      <Typography variant="h4">{summaryData.packCount}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={11} sm={5.5} md={2.9} sx={{display: 'flex', justifyContent: 'center',alignItems: 'center'}}>
                <Card sx={{width: '80%',pb:2}}>
                <CardContent>
                      <Box display="flex" alignItems="center" mb={1} >
                        <AttachMoneyIcon color="primary" fontSize="large" sx={{ mr: 1 }} />
                        <Typography variant="h6">Prix moyen</Typography>
                      </Box>
                      <Typography variant="h4">{summaryData.avgPrice.toFixed(2)} €</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={11} sm={5.5} md={2.9} sx={{display: 'flex', justifyContent: 'center',alignItems: 'center'}}>
                <Card sx={{width: '80%',pb:2}}>
                    <CardContent>
                      <Box display="flex" alignItems="center">
                        <AttachMoneyIcon color="primary" fontSize="large" sx={{ mr: 1 }} />
                        <Typography variant="h6">Revenus totaux</Typography>
                      </Box>
                      <Typography variant="h4">{summaryData.revenue.toFixed(2)} €</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              
              <Grid container spacing={3}>
                {/* Pack Distribution Pie Chart */}
                <Grid item xs={12} md={5.9} >
                    <Paper sx={{ p: 2, height: 400, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
                      <Typography variant="h6" gutterBottom>
                        <Box display="flex" alignItems="center">
                        <ShoppingBagIcon sx={{ mr: 1 }} />
                        <span>Distrubtion par Packs</span>
                        </Box>
                    </Typography>                    {preparePieChartData().length > 0 ? (
                        <PieChart
                          series={[
                            {
                            data: preparePieChartData(),
                              arcLabel: (item) => `${item.value} (${Math.round(item.value / summaryData.total * 100)}%)`,
                              arcLabelMinAngle: 20,
                            },
                          ]}
                          width={500}
                          height={320}
                        legend={{ hidden: true }} // Add this line to hide the legend

                        />
                      ) : (
                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                          <Typography>Pas assez de données pour afficher le graphique</Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                
                
                
                {/* School Distribution Chart */}
                <Grid item xs={12} md={5.9} >
                <Paper sx={{ p: 2, height: 400, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
                <Typography variant="h6" gutterBottom>
                      <Box display="flex" alignItems="center">
                        <SchoolIcon sx={{ mr: 1 }} />
                        <span>Distrubtion par Écoles</span>
                      </Box>
                    </Typography>
                    {prepareSchoolChartData().schoolNames.length > 0 ? (
                      <BarChart
                        xAxis={[{ 
                          scaleType: 'band', 
                          data: prepareSchoolChartData().schoolNames,
                          tickLabelStyle: {
                            angle: 45,
                            textAnchor: 'start',
                            fontSize: 12
                          }
                        }]}
                        legend={{ hidden: true }} // Add this line to hide the legend
                        series={[{ 
                          data: prepareSchoolChartData().counts,
                          label: 'Participants' 
                        }]}
                        height={320}
                      />
                    ) : (
                      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <Typography>Pas assez de données pour afficher le graphique</Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
                
                {/* Sport Distribution Chart */}
                <Grid item xs={12} md={5.9} >
                <Paper sx={{ p: 2, height: 400, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
                    <Typography variant="h6" gutterBottom>
                      <Box display="flex" alignItems="center">
                        <SportsSoccerIcon sx={{ mr: 1 }} />
                        <span>Distribution par Sport</span>
                      </Box>
                    </Typography>
                    {prepareSportChartData().sportNames.length > 0 ? (
                      <BarChart
                        xAxis={[{ 
                          scaleType: 'band', 
                          data: prepareSportChartData().sportNames,
                          tickLabelStyle: {
                            angle: 45,
                            textAnchor: 'start',
                            fontSize: 12
                          }
                        }]}
                        series={[{ 
                          data: prepareSportChartData().counts,
                          label: 'Participants'
                        }]}
                        legend={{ hidden: true }}
                        height={320}
                      />
                    ) : (
                      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <Typography>Pas assez de données pour afficher le graphique</Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>

                {/* Ratio Distribution Chart */}
                <Grid item xs={12} md={5.9} >
                <Paper sx={{ p: 2, height: 400, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center' }}>
                    <Typography variant="h6" gutterBottom>
                      <Box display="flex" alignItems="center">
                        <SportsSoccerIcon sx={{ mr: 1 }} />
                        <span>Distribution Tentes par Sport</span>
                      </Box>
                    </Typography>
                    {prepareSportTentChartData().sportNames.length > 0 ? (
                      <BarChart
                        xAxis={[{ 
                          scaleType: 'band', 
                          data: prepareSportTentChartData().sportNames,
                          tickLabelStyle: {
                            angle: 45,
                            textAnchor: 'start',
                            fontSize: 12
                          }
                        }]}
                        series={[{ 
                          data: prepareSportTentChartData().counts,
                          label: 'Pourcentage de Tentes',
                        }]}
                        legend={{ hidden: true }}
                        height={320}
                      />
                    ) : (
                      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <Typography>Pas assez de données pour afficher le graphique</Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
                
                {/* Detailed Tables */}
                <Grid item xs={12} md={5.9} >
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Détail des Packs</Typography>
                    <Box sx={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>Pack</th>
                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>Participants</th>
                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>Prix unitaire</th>
                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>Revenu total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(statsData.by_pack).map(([packId, packData]) => {
                            const revenue = packData.count * packData.price;
                            const percentage = (packData.count / summaryData.total * 100).toFixed(1);
                            
                            return (
                              <tr key={packId}>
                                <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{packData.name}</td>
                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{packData.count}</td>
                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{packData.price} €</td>
                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{revenue} €</td>
                              </tr>
                            );
                          })}
                          <tr style={{ fontWeight: 'bold', backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                            <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>Total</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{summaryData.total}</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{summaryData.avgPrice.toFixed(2)} €</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{summaryData.packsRevenue?.toFixed(2) || summaryData.revenue.toFixed(2)} €</td>
                          </tr>
                        </tbody>
                      </table>
                    </Box>
                  </Paper>
                </Grid>
                {/* Products Details Table */}
                <Grid item xs={12} md={5.9}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Détail des Produits</Typography>
                    {statsData.by_product && Object.keys(statsData.by_product).length > 0 ? (
                      <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>Produit</th>
                              <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>Quantité</th>
                              <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>Prix unitaire</th>
                              <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>Revenu total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(statsData.by_product).map(([productId, productData]) => (
                              <tr key={productId}>
                                <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{productData.name}</td>
                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{productData.count}</td>
                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{productData.price} €</td>
                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{productData.total_revenue?.toFixed(2) || (productData.count * productData.price).toFixed(2)} €</td>
                              </tr>
                            ))}
                            <tr style={{ fontWeight: 'bold', backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                              <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>Total</td>
                              <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
                                {Object.values(statsData.by_product).reduce((sum, product) => sum + product.count, 0)}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>-</td>
                              <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>{summaryData.productsRevenue?.toFixed(2) || '0.00'} €</td>
                            </tr>
                          </tbody>
                        </table>
                      </Box>
                    ) : (
                      <Typography variant="body1" sx={{ py: 2 }}>Aucun produit vendu dans la sélection actuelle.</Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
      </Box>
    </Box>
  );
};

export default SuperAdminPacksStats;