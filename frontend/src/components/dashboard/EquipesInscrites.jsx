import { Typography, IconButton, Box, Chip, Alert } from "@mui/material";
import PropTypes from 'prop-types';
import TeamList from "../team/TeamList";
import { useNavigate } from "react-router-dom";
import AddIcon from '@mui/icons-material/Add';
import { useEffect, useState } from "react";
import { ApiICConnected } from "../../service/axios";

function EquipesInscritesPage({ height, teams }) {

    const navigation = useNavigate();
    const [sportsAvailability, setSportsAvailability] = useState({});
    
    useEffect(() => {
        // Récupérer les informations de disponibilité pour chaque sport
        ApiICConnected.get('/sports/availability-info')
            .then(response => {
                const availabilityMap = {};
                response.data.forEach(sport => {
                    availabilityMap[sport.sport_id] = sport;
                });
                setSportsAvailability(availabilityMap);
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des disponibilités:", error);
            });
    }, []);

    const headerItem =
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center', 
                position: 'relative',
                mb: "1rem"
            }}>
                <Typography 
                    sx={{
                        fontWeight: 'bold', 
                        textAlign: 'center'
                    }} 
                    variant="h5"
                >
                    Mes équipes
                </Typography>
                
                <IconButton 
                    href="/register-team" 
                    sx={{
                        color: 'primary.main',
                        position: 'absolute',
                        right: 20
                    }}
                >
                    <AddIcon />
                </IconButton>
            </Box>


    // Fonction pour obtenir l'info de disponibilité d'une équipe
    const getAvailabilityInfo = (team) => {
        if (!team.sportId) return null;
        return sportsAvailability[team.sportId];
    };

    return (
        <Box>
            {[...new Map(teams.filter(team => team.status === 'Incomplete' && team.sportId).map(team => [team.sportId, team])).values()].sort((a, b) => (sportsAvailability[a.sportId]?.sport_name ?? '').localeCompare(sportsAvailability[b.sportId]?.sport_name ?? '')).map((team) => {
                const availability = getAvailabilityInfo(team);
                if (!availability) return null;

                const isUrgent = availability.remaining_spots !== null && availability.remaining_spots > 0 && availability.remaining_spots <= 5;
                
                return (
                    <Alert 
                        key={team.id}
                        severity={isUrgent ? "warning" : "info"} 
                        sx={{ mb: 2 }}
                    >
                        {availability.is_collective ? (
                            <>
                                <strong>{availability.sport_name}</strong> : {availability.selected_teams} équipe{availability.selected_teams > 1 ? 's' : ''} sélectionnée{availability.selected_teams > 1 ? 's' : ''} sur {availability.max_teams}
                                {availability.remaining_spots !== null && availability.remaining_spots > 0 ? (
                                    <> - <strong>{availability.remaining_spots} place{availability.remaining_spots > 1 ? 's' : ''} restante{availability.remaining_spots > 1 ? 's' : ''}</strong></>
                                ) : (
                                    <> - <strong>Tournoi complet</strong></>
                                )}
                            </>
                        ) : (
                            <>
                                <strong>{availability.sport_name}</strong> : 
                                {availability.remaining_spots !== null && availability.remaining_spots > 0 ? (
                                    <> <strong>{availability.remaining_spots} place{availability.remaining_spots > 1 ? 's' : ''} restante{availability.remaining_spots > 1 ? 's' : ''}</strong> disponible{availability.remaining_spots > 1 ? 's' : ''}</>
                                ) : (
                                    <> <strong>Tournoi complet</strong></>
                                )}
                            </>
                        )}
                        {isUrgent && (
                            <> - <strong>Dépêchez-vous pour finaliser votre inscription !</strong></>
                        )}
                    </Alert>
                );
            })}
            <TeamList headerItem={headerItem} columns={columns}
                teams={teams}
                onModify={(team) => navigation('/team/' + team.id)}
                modify={true} sx={{ borderRadius: '0.8rem', height: height, p: '16px' }} variant="outlined" />
        </Box>
    );
}

EquipesInscritesPage.propTypes = {
    height: PropTypes.string,
    teams: PropTypes.array.isRequired
};

export default EquipesInscritesPage;

const columns = [
    { label: "N°", align: "left", key: "id", type: 'index' },
    { label: "Nom", align: "center", key: "name" },
    { label: "Sport", align: "center", key: "sport" },
    { label: "Nombre de joueurs·euses", align: "center", key: "len" },
    { label: "Statut", align: "center", key: "status", type: "status" },
    { label: "Prix total", align: "center", key: "price" },
]