import React, { useState, useEffect } from 'react';
import Navbar from "../../components/navbar/Navbar";
import { routesForUser } from "../../routes/routes";
import { 
    Box, 
    Typography, 
    Paper,
    Grid,
    CircularProgress,
    Container,
    Collapse,
    Button
} from '@mui/material';
import { ApiTossConnected } from '../../service/axios';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const DelegationDistances = () => {
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSchoolId, setSelectedSchoolId] = useState(null);
    const [schoolContacts, setSchoolContacts] = useState({});
    const [loadingContact, setLoadingContact] = useState(false);

    useEffect(() => {
        const fetchDelegationDistances = async () => {
            try {
                setLoading(true);
                const response = await ApiTossConnected.get('/schools/delegations/distances');
                setSchools(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching delegation distances:', err);
                setError('Impossible de récupérer les distances des délégations');
            } finally {
                setLoading(false);
            }
        };

        fetchDelegationDistances();
    }, []);

    const handleSchoolClick = async (schoolId) => {
        // Toggle selected school
        if (selectedSchoolId === schoolId) {
            setSelectedSchoolId(null);
            return;
        }
        
        setSelectedSchoolId(schoolId);
        
        // If we already have the contact info, don't fetch again
        if (schoolContacts[schoolId]) return;
        
        try {
            setLoadingContact(true);
            // Updated to use school ID instead of name
            const response = await ApiTossConnected.get(`/schools/contact/${schoolId}`);
            setSchoolContacts(prev => ({
                ...prev,
                [schoolId]: response.data
            }));
        } catch (err) {
            console.error('Error fetching school contact:', err);
            // Add a placeholder in case of error
            setSchoolContacts(prev => ({
                ...prev,
                [schoolId]: { 
                    error: true,
                    contact: "Information non disponible"
                }
            }));
        } finally {
            setLoadingContact(false);
        }
    };

    return (
        <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#161C24', // Appliquer le dégradé global pour toute la page
                }}>
                <Navbar navigation={routesForUser} />
                <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 3,
                alignItems: 'center',
                py: 8,
                background: 'transparent', // Fond transparent pour conserver le dégradé général
            }}>
                <Typography sx={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '2rem',
                }}>
                    Délegations les plus proches
                </Typography>

                <Typography sx={{
                    color: 'white',
                    fontWeight: 'bold',
                    width: '70%',
                }}>
Depuis quelques années, le TOSS essaie de s'aligner avec les enjeux contemporains et propose de plus en plus de démarches éco-responsables destinées à réduire son impact environnemental 💡<br />
Cette année, après avoir remarqué qu'un nombre important de bus de délégations fait le trajet chaque année avec des places vacantes, nous souhaitons favoriser le covoiturage entre les écoles ! 🚌<br />
L'idée est simple : Si une école ramène un nombre faible de participants, elle regarde si une délégation est à proximité d'elle afin de la contacter et d'éventuellement combler les places vacantes dans les cars ! 
Cette démarche est gagnante pour tout le monde : <br /> <br />
• Pour la délégation, le prix par personne du transport est diminué 💸<br />
• ⁠Pour l'école la contactant, elle dispose d'une solution de transport à moindre prix 💰<br />
• ⁠Pour notre impact, le nombre de voitures individuelles se rendant sur le TOSS est diminué ! 🎉<br />
<br />
Vous trouverez ci-dessous les contacts des délégations les plus proches de votre école ! 

N'hésitez pas à les contacter pour covoiturer !               </Typography>
            </Box>
                
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Typography color="error" align="center">{error}</Typography>
                ) : schools.length === 0 ? (
                    <Typography align="center" sx={{ color: 'white' }}>Aucune délégation disponible.</Typography>
                ) : (
                    <Grid container spacing={3} justifyContent="center" sx={{ mb: 4 }}>
                        {schools.map((school) => (
                            <Grid item xs={8} sm={8} md={8} key={school.id}>
                                <Paper 
                                    elevation={3}
                                    onClick={() => handleSchoolClick(school.id)}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderRadius: 2,
                                        p: 3,
                                        transition: 'all 0.2s',
                                        border: selectedSchoolId === school.id ? '2px solid' : '1px solid',
                                        borderColor: selectedSchoolId === school.id ? 'primary.main' : 'divider',
                                        ":hover": {
                                            transform: 'translateY(-3px)',
                                            boxShadow: 4,
                                            cursor: 'pointer',  
                                        }
                                    }}
                                >
                                    <Box sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'row', 
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>  
                                            <LocationOnIcon 
                                                color="primary" 
                                                fontSize="large" 
                                                sx={{ mr: 1 }} 
                                            />
                                            <Typography 
                                                variant="h6" 
                                                component="h2"
                                                sx={{ fontWeight: 'bold' }}
                                            >
                                                {school.name}
                                            </Typography>
                                        </Box>
                                        
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography 
                                                sx={{ 
                                                    fontWeight: 'medium',
                                                    fontSize: '1.1rem',
                                                    mr: 2
                                                }}
                                            >
                                                Distance : <strong>{school.distance} km</strong>
                                            </Typography>
                                            {selectedSchoolId === school.id ? 
                                                <ExpandLessIcon color="primary" /> : 
                                                <ExpandMoreIcon color="action" />
                                            }
                                        </Box>
                                    </Box>

                                    <Collapse in={selectedSchoolId === school.id} timeout="auto">
                                        <Box 
                                            sx={{ 
                                                mt: 2, 
                                                pt: 2, 
                                                borderTop: '1px solid',
                                                borderColor: 'divider' 
                                            }}
                                        >
                                            {loadingContact && !schoolContacts[school.id] ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                                    <CircularProgress size={24} />
                                                </Box>
                                            ) : schoolContacts[school.id]?.error ? (
                                                <Typography color="error">
                                                    Impossible de récupérer les informations de contact.
                                                </Typography>
                                            ) : (
                                                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                        Contact de délégation : 
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                                <PersonIcon color="primary" sx={{ mr: 1 }} />
                                                                <Typography>
                                                                    {schoolContacts[school.id]?.contact|| "N/A"}
                                                                </Typography>
                                                    </Box>

            

                                                </Box>
                                            )}
                                        </Box>
                                    </Collapse>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )}

            </Box>
    );
};

export default DelegationDistances;