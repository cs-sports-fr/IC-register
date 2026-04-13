import { 
  Box, 
  Typography, 
  FormControl, 
  Select, 
  MenuItem, 
  Paper, 
  Chip,
  CircularProgress,
  OutlinedInput,
  Checkbox,
  ListItemText,
  IconButton,
  TextField,
} from "@mui/material";
import Navbar from "../../components/navbar/Navbar";
import { routesForAdmin, routesForSuperAdmin } from "../../routes/routes";
import { useEffect, useState, useCallback, useRef } from "react";
import { ApiICConnected } from "../../service/axios";
import { useAuth } from "../../provider/authProvider";
import ParticipantList from "../../components/team/PartcipantList";
import * as XLSX from 'xlsx';

// Import necessary icons
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';

const SuperAdminParticipants = () => {
  // State for filters
  const [sports, setSports] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teamStatuses, setTeamStatuses] = useState([]);
  const [packs, setPacks] = useState([]);
  const [genderOptions, setGenderOptions] = useState(['M', 'F', 'preferNotToSay']); 
  
  // State for selected filters
  const [selectedSports, setSelectedSports] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedTeamStatuses, setSelectedTeamStatuses] = useState([]);
  const [selectedPacks, setSelectedPacks] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  
  // State for participants data
  const [participantsData, setParticipantsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const searchTimeout = useRef(null);

  const { permission } = useAuth();
  const routes = permission === 'SuperAdminStatus' ? routesForSuperAdmin : routesForAdmin;
  
  // Helper function to format products list
  const formatProducts = (products) => {
    if (!products || products.length === 0) return "Aucun";
    return products.map(p => p.name).join(", ");
  };
  // Compute total price for all fetched participants
  const totalPrice = participantsData && participantsData.participants
  ? participantsData.participants.reduce((acc, participant) => acc + participant.total_price, 0)
  : 0;
  // Define columns for ParticipantList
  const columns = [
    {
      key: 'name',
      label: 'Participant',
      render: (participant) => (
        <Typography variant="body1" fontWeight="medium">
          {participant.firstname} {participant.lastname}
        </Typography>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: (participant) => participant.email
    },
    {
      key: 'school',
      label: 'École',
      render: (participant) => participant.school ? participant.school.name : "N/A"
    },
    {
      key: 'team',
      label: 'Équipe',
      render: (participant) => participant.team ? (
        <a 
          href={`/team/${participant.team.id}`}
          style={{ textDecoration: 'none' }}            
        >
          <Typography sx={{ 
            cursor: 'pointer',
            color: 'primary.main',
            fontSize: '0.875rem',
            '&:hover': { 
              textDecoration: 'underline',
              fontWeight: 'bold'
            }
          }}>
          {participant.team.name}
          </Typography>
        </a>
      ) : "N/A"
    },
    {
      key: 'sport',
      label: 'Sport',
      render: (participant) => participant.sport ? participant.sport.name : "N/A"
    },
    {
      key: 'pack',
      label: 'Pack',
      render: (participant) => participant.pack ? participant.pack.name : "N/A"
    },
    {
      key: 'products',
      label: 'Produits',
      render: (participant) => (
        <Typography noWrap sx={{ maxWidth: 150, fontSize: '0.875rem' }}>
          {formatProducts(participant.products)}
        </Typography>
      )
    },
    {
      key: 'total_price',
      label: 'Prix Total',
      render: (participant) => (
        <Typography fontWeight="bold">
          {participant.total_price.toFixed(2)} €
        </Typography>
      )
    }
  ];
  
  // Fetch participants data based on filters
  const fetchParticipantsData = useCallback(async (searchValue = search) => {
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

      // Add search parameter if provided
      if (searchValue) {
        params.append('search', searchValue);
      }
      
      // Make the API call to the endpoint
      const response = await ApiICConnected.get(`/teams/participants/details?${params.toString()}`);
      setParticipantsData(response.data);
    } catch (err) {
      console.error("Error fetching participants data:", err);
      setError("Failed to load participants data");
    } finally {
      setLoading(false);
    }
  }, [search, selectedSports, selectedSchools, selectedTeamStatuses, selectedPacks, selectedGenders]);

  // Fetch all sports, schools, team statuses and packs for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // Fetch sports
        const sportsResponse = await ApiICConnected.get('/sports');
        setSports(sportsResponse.data);
        
        // Fetch schools and sort alphabetically
        const schoolsResponse = await ApiICConnected.get('/schools');
        const sortedSchools = schoolsResponse.data.sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        setSchools(sortedSchools);
        
        // Fetch packs
        const packsResponse = await ApiICConnected.get('/packs');
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
  
  // Fetch data on initial load
  useEffect(() => {
    fetchParticipantsData();
  }, [fetchParticipantsData]);
  
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
  
  const handleGendersChange = (event) => {
    setSelectedGenders(event.target.value);
  };
  
  const handleApplyFilters = () => {
    fetchParticipantsData();
  };

  // Update search state and trigger search with setTimeout instead of debounce
  const onSearchChange = (event) => {
    const value = event.target.value;
    setSearch(value);
    
    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Set a new timeout to delay the API call until typing stops
    searchTimeout.current = setTimeout(() => {
      fetchParticipantsData(value);
    }, 300);  // 300ms delay
  };
  
  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);
  
  const exportToCSV = () => {
    if (!participantsData || !participantsData.participants) return;
    
    // Prepare data for Excel export
    const excelData = participantsData.participants.map(participant => {
      // Create an object with each column as a property
      return {
        'Participant': `${participant.firstname} ${participant.lastname}`,
        'Genre': participant.gender || 'Non spécifié',
        'Email': participant.email || '',
        'École': participant.school ? participant.school.name : 'N/A',
        'Équipe': participant.team ? participant.team.name : 'N/A',
        'Sport': participant.sport ? participant.sport.name : 'N/A',
        'Pack': participant.pack ? participant.pack.name : 'Aucun',
        'Produits': formatProducts(participant.products),
        'Prix Total': `${participant.total_price.toFixed(2)}`
      };
    });
    
    // Create a worksheet from the data
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Create a workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 25 }, // Participant
      { wch: 15 }, // Genre
      { wch: 30 }, // Email
      { wch: 20 }, // École
      { wch: 20 }, // Équipe
      { wch: 15 }, // Sport
      { wch: 15 }, // Pack
      { wch: 30 }, // Produits
      { wch: 12 }  // Prix Total
    ];
    
    worksheet['!cols'] = colWidths;
    
    // Generate file name with current date
    const fileName = `participants-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Write the file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  const headerItem = (
    <Box>
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h6">
          Prix total: {totalPrice.toFixed(2)} €
        </Typography>
      </Box>
      <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'} sx={{ mb: 2 }}>
        <TextField
          id="search"
          placeholder="Rechercher un utilisateur | Prénom, Nom, Email"
          type="search"
          variant="outlined"
          size="small"
          fullWidth
          onChange={onSearchChange}
          value={search}
        />
      </Box>
    </Box>
  );
  
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
                      <Chip key={status} label={status} size="small" />
                    ))}
                  </Box>
                )}
              >
                {teamStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    <Checkbox checked={selectedTeamStatuses.indexOf(status) > -1} />
                    <ListItemText primary={status} />
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
          
          {/* Gender filter */}
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
            <IconButton 
              onClick={exportToCSV}
            >
              <DownloadIcon sx={{color:'primary.main'}} />
            </IconButton>
          </Box>
        </Box>

        
        {error && !loading && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'error.light', color: 'error.contrastText', width: '100%' }}>
            <Typography>{error}</Typography>
          </Paper>
        )}
        
        {/* Use the ParticipantList component */}
        {!error && participantsData && (
          <ParticipantList
            data={participantsData.participants}
            columns={columns}
            headerItem={headerItem}
          />
        )}
      </Box>
    </Box>
  );
};

export default SuperAdminParticipants;