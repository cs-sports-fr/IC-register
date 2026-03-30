
import { Box, Card, CardContent, Typography } from "@mui/material";
import { BarChart } from '@mui/x-charts/BarChart';
import axios from "axios";
import PropTypes from 'prop-types';
import { useEffect, useState } from "react";
import { ApiTossConnected } from "../../service/axios";
import { parseTeamDashboard } from "../../utils/parseTeam";

function GoodiesCardUser({ minHeight }) {

    const [loading, setLoading] = useState(true);

    const [teams, setTeams] = useState([]);
    const fetchData = () => {
        const endpoints = [
            'teams',
        ]
        axios.all(endpoints.map(url => ApiTossConnected.get(url)))
            .then(axios.spread((...responses) => {
                setTeams(parseTeamDashboard(responses[0].data));
                setLoading(false);
            })).catch((error) => {
                console.log(error);
            });
    }

    useEffect(() => {
        setLoading(true);
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Ensure teams is always an array to avoid iteration issues
    const safeTeams = Array.isArray(teams) ? teams : [];
    const goodies = extractGoodiesWithStatus(safeTeams) || {};
    const keys = Object.values(goodies).flatMap(status => Object.keys(status))

    const xAxis = [
        {
            data: Object.values(goodies).flatMap(status => Object.keys(status)) || [],
            scaleType: 'band',
        },
    ]

    const series = [
        {
            data: keys?.length > 0 ? Object.keys(goodies["Waiting"])?.sort((a, b) => a.localeCompare(b))?.map(k => goodies["Waiting"][k]) : [],
            stack: 'total',
            id: 'Waiting',
            label: 'Liste d\'attente'
        },
        {
            data: keys?.length > 0 ? Object.keys(goodies["PrincipalList"])?.sort((a, b) => a.localeCompare(b))?.map(k => goodies["PrincipalList"][k]) : [],
            stack: 'total',
            id: 'PrincipalList',
            label: 'Liste principale'
        },
        {
            data: keys?.length > 0 ? Object.keys(goodies["Validated"])?.sort((a, b) => a.localeCompare(b))?.map(k => goodies["Validated"][k]) : [],
            stack: 'total',
            id: 'Validated',
            label: 'Validée'
        },
    ]

    return (
        <Card variant='outlined' sx={{ borderRadius: '0.8rem', minHeight: minHeight }}>
            <CardContent sx={{ minHeight: `calc(${minHeight} - 40px)`, }}>
                <Typography variant="h5" sx={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', mb: 2 }}>
                    Nombre de goodies total
                </Typography>
                <Card sx={{ border: '0.08rem dashed grey', borderRadius: '0.6rem', height: '75%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', height: '100%' }}>
                        {!loading && teams?.length && keys?.length > 0 ? <BarChart
                            series={series}
                            xAxis={xAxis}
                            height={150}
                            slotProps={{
                                legend: {
                                    position: { vertical: 'top', horizontal: 'middle' },
                                    padding: 0,
                                    direction: 'row',
                                    itemGap: 5,
                                    itemMarkHeight: 12,
                                    itemMarkWidth: 12,
                                    markGap: 3,
                                }
                            }}
                        />
                            :
                            <Typography sx={{ textAlign: 'center', my: 5 }}>Pas de données</Typography>
                        }
                    </Box>
                </Card>
            </CardContent >
        </Card >
    );
}

GoodiesCardUser.propTypes = {
    minHeight: PropTypes.string,
    teams: PropTypes.array
};

export default GoodiesCardUser;

function extractGoodiesWithStatus(data) {
    const goodiesStatusCount = {
        "Waiting": {},
        "PrincipalList": {},
        "Validated": {},
    }; // Pour stocker les goodies avec leur compte et le statut de l'équipe

    data?.forEach(team => {
        const status = team.status; // Obtenir le statut de l'équipe
        const productsData = team.productsData; // Obtenir les données des produits pour l'équipe

        for (const productName in productsData) {
            const quantity = productsData[productName]; // Obtenir la quantité pour le produit

            // Initialiser le compteur pour le statut si ce n'est pas déjà fait
            if (!goodiesStatusCount[status][productName]) {
                goodiesStatusCount[status][productName] = 0;
            }

            // Ajouter la quantité au compteur pour ce produit et ce statut
            goodiesStatusCount[status][productName] += quantity;
        }
    });

    return goodiesStatusCount; // Retourner l'objet contenant le comptage
}

