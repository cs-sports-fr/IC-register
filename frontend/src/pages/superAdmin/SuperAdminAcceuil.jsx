import { 
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, CircularProgress 
  } from "@mui/material";
  import Navbar from "../../components/navbar/Navbar";
  import { routesForAdmin, routesForSuperAdmin } from "../../routes/routes";
  import { useEffect, useState } from "react";
  import { ApiICConnected } from "../../service/axios";
  import { useAuth } from "../../provider/authProvider";
  import DownloadIcon from '@mui/icons-material/Download';
  import RefreshIcon from '@mui/icons-material/Refresh';
  import * as XLSX from 'xlsx';
  
  const SuperAdminSchoolsTeams = () => {
    const [schoolsData, setSchoolsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSport, setSelectedSport] = useState(null);
    const [sports, setSports] = useState([]);
  
    const { permission } = useAuth();
    const routes = permission === 'SuperAdminStatus' ? routesForSuperAdmin : routesForAdmin;
  
    // Fetch sports for dropdown
    useEffect(() => {
      ApiICConnected.get('/sports').then(res => setSports(res.data));
    }, []);
  
    // Fetch schools/teams/captains/packs/products for a sport
    useEffect(() => {
      if (!selectedSport) return;
      setLoading(true);
      setError(null);
      ApiICConnected.get(`/participants/sport/${selectedSport}/schools`)
        .then(res => setSchoolsData(res.data))
        .catch(() => setError("Erreur lors du chargement des données"))
        .finally(() => setLoading(false));
    }, [selectedSport]);
  
    // Excel export
   const exportToExcel = () => {
    const excelData = [];
    schoolsData.forEach(school => {
      school.teams.forEach(team => {
        // Join packs and products into single strings
        const packsString = Object.entries(team.packs_count)
          .map(([name, count]) => `${name}: ${count}`)
          .join("\n ");
        const productsString = Object.entries(team.products_count)
          .map(([name, count]) => `${name}: ${count}`)
          .join("\n");
        // Build a string of any non-validated participants
        const notValidated = (team.participant_not_validated || [])
          .map(([first, last]) => `${first} ${last}`)
          .join(", ");

        excelData.push({
          "École": school.school_name,
          "Équipe": team.team_name,
          "Statut Équipe": team.status,
          "Nombre de participants": team.number_of_participants,
          "Capitaine": team.captain_name || "",
          "Téléphone Capitaine": team.captain_phone || "",
          "Participants non validés": notValidated,
          "Pack": packsString,
          "Produits": productsString,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Équipes');
    XLSX.writeFile(
      workbook,
      `ecoles-equipes-export-${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };
    return (
      <Box>
        <Navbar navigation={routes} />
        <Box sx={{ p: 4 }}>
          {/* Sport selector */}
          <Box sx={{ mb: 3, width: 300 }}>
            <select
              value={selectedSport || ""}
              onChange={e => setSelectedSport(e.target.value)}
              style={{ width: "100%", padding: 8, fontSize: 16 }}
            >
              <option value="" disabled>Choisir un sport</option>
              {sports.map(sport => (
                <option key={sport.id} value={sport.id}>{sport.sport}</option>
              ))}
            </select>
          </Box>
          <Box sx={{ mb: 2 }}>
            <IconButton onClick={exportToExcel} disabled={loading || !schoolsData.length}>
              <DownloadIcon sx={{ color: 'primary.main' }} />
            </IconButton>
            <IconButton onClick={() => setSelectedSport(selectedSport)} disabled={loading || !selectedSport}>
              <RefreshIcon sx={{ color: 'primary.main' }} />
            </IconButton>
          </Box>
          {loading && <CircularProgress />}
          {error && <Typography color="error">{error}</Typography>}
        </Box>
      </Box>
    );
  };
  
  export default SuperAdminSchoolsTeams;