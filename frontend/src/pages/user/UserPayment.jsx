import { Box, Card, CardContent, CardHeader, Table, TableBody, TableCell, TableContainer, TableRow, Typography, Button, Dialog, DialogContent, IconButton } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import Navbar from "../../components/navbar/Navbar";
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { routesForUser } from "../../routes/routes";
import { useEffect, useState } from "react";
import { ApiTossConnected } from "../../service/axios";
import { calculatePrice } from "../../utils/calculatePrice";
import TeamPaymentList from "../../components/team/TeamsPaymentList";
import { parseTeamDashboard } from "../../utils/parseTeam";
import { useSnackbar } from "../../provider/snackbarProvider";
import axios from "axios";

const UserPayment = () => {
    // eslint-disable-next-line no-unused-vars
    const [user, setUser] = useState({});
    const [teams, setTeams] = useState([]);
    const [principalTeams, setPrincipalTeams] = useState([]);
    const [paymentData, setPaymentData] = useState({});

    const { showSnackbar } = useSnackbar();

    const [config, setConfig] = useState({
        isRegistrationOpen: false,
        isPaymentOpen: false,
    });
    const [openImageDialog, setOpenImageDialog] = useState(false);
    const [currentImage, setCurrentImage] = useState('');
    
    // Function to handle opening image dialog
    const handleOpenImage = (imagePath) => {
        setCurrentImage(imagePath);
        setOpenImageDialog(true);
    };
    
    // Function to handle closing image dialog
    const handleCloseImage = () => {
        setOpenImageDialog(false);
    };
    
    const handleLydiaPayment = (team) => {
        const amountLeft = (team.amountToPayInCents - team.amountPaidInCents) / 100;
        
        // Confirmation avant d'ouvrir le paiement
        if (window.confirm(`Vous allez être redirigé vers Lydia pour payer ${amountLeft.toFixed(2)} € pour l'équipe "${team.name}".\n\nContinuer ?`)) {
            showSnackbar('Création du paiement en cours...', 2000, 'info');
            
            ApiTossConnected.post('/payment/request?team_id=' + team.id)
                .then((response) => {
                    if (response.data) {
                        showSnackbar('Redirection vers Lydia...', 2000, 'success');
                        window.open(response.data, '_blank');
                    } else {
                        showSnackbar('Erreur : URL de paiement non reçue', 3000, 'error');
                    }
                }).catch((error) => {
                    console.error('Erreur paiement Lydia - Détails complets:', error);
                    console.error('Response data:', error.response?.data);
                    console.error('Response status:', error.response?.status);
                    
                    let errorMessage = 'Erreur lors de la création du paiement';
                    
                    // Récupérer le message d'erreur du backend
                    if (error.response?.data?.detail) {
                        errorMessage = error.response.data.detail;
                    } else if (error.response?.data?.message) {
                        errorMessage = error.response.data.message;
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    // Messages plus clairs pour l'utilisateur (mais garder les détails techniques)
                    if (errorMessage.includes('Payment is still closed')) {
                        errorMessage = 'Les paiements sont actuellement fermés. Veuillez contacter un administrateur.';
                    } else if (errorMessage.includes('No payment needed')) {
                        errorMessage = 'Cette équipe est déjà entièrement payée.';
                    } else if (errorMessage.includes('not found')) {
                        errorMessage = 'Équipe introuvable ou vous n\'avez pas les droits pour payer cette équipe.';
                    } else if (errorMessage.includes('is not configured')) {
                        // Afficher le message exact pour les variables manquantes
                        errorMessage = `Configuration manquante : ${errorMessage}`;
                    } else if (errorMessage.includes('Cannot connect')) {
                        // Afficher le message exact pour les problèmes de connexion
                        errorMessage = `Problème de connexion : ${errorMessage}`;
                    } else if (errorMessage.includes('Lydia API')) {
                        // Afficher le message détaillé au lieu d'un message générique
                        // Le message du backend contient déjà les détails (code d'erreur, etc.)
                        errorMessage = errorMessage; // Garder le message original avec les détails
                        
                        // Message plus clair pour l'erreur code 5
                        if (errorMessage.includes('error: 5') || errorMessage.includes('code 5')) {
                            errorMessage = 'Erreur de paiement : Votre carte n\'a pas été débitée. Cela peut être dû à :\n' +
                                         '- Carte bancaire refusée ou fonds insuffisants\n' +
                                         '- Restrictions de sécurité de votre banque\n' +
                                         '- Pour un montant très faible (0.01€), certains systèmes refusent les micro-transactions\n\n' +
                                         'Veuillez réessayer ou contacter votre banque si le problème persiste.';
                        }
                    }
                    
                    // Afficher le message d'erreur (plus long pour les messages détaillés)
                    const duration = errorMessage.length > 100 ? 8000 : 5000;
                    showSnackbar(errorMessage, duration, 'error');
                });
        }
    }

    const fetchConfig = () => {
        ApiTossConnected.get('/config')
            .then((response) => {
                setConfig(response?.data);
            }).catch((error) => {
                console.log(error);
            });
    }

    const fetchTeams = () => {
        ApiTossConnected.get('/teams')
            .then((response) => {
                setTeams(parseTeamDashboard(response?.data));
                setPaymentData(calculatePrice(response?.data));
                setPrincipalTeams(parseTeamDashboard(response?.data.filter(team => team.status === 'PrincipalList')));
            }).catch((error) => {
                console.log(error);
            });
    }

    const fetchUserData = () => {
        ApiTossConnected.get('/users/me')
            .then((response) => {
                setUser(response.data); // Assuming the user data is directly in the response data
            })
            .catch((error) => {
                console.log(error);
                showSnackbar('Erreur lors de la récupération des données utilisateur', 3000, 'error');
            });
    };

    
        const isDelegation = [
            43, 6,38, 8, 10, 11, 12, 15, 16, 19, 20, 21, 22, 24, 25, 29, 30, 31, 32, 40 ,41, 34, 36, 39, 5 ,9 ,18, 26, 3,7, 14, 17, 23, 27, 33 ,35, 42, 28, 13, 37, 
        ];
    
    /*
        const calculateCautionSport = () => {
            let cautionDeleg = 0;
            let cautionSport = 0;
            let cautionHebergement = 0;
            if (user.schoolID && isDelegation.includes(Participant.schoolID)) {
                cautionDeleg = 2500;
                const participantsFromSameSchool = participants.filter(participant => Participant.schoolId === Participant.schoolId);
                participantsFromSameSchool.forEach(participant => {
                    cautionSport += 200;
                    cautionHebergement += (Participant.packId === 5 || Participant.packId === 6 || Participant.packId === 11 || Participant.packId === 12) ? 600 : 0;
                });
            
        };
    
        const calculateCautionDeleg = () => {
            let cautionDeleg = 0;
            if (Participant.schoolID && isDelegation.includes(Participant.schoolID)) {
                cautionDeleg = 2500;
            };
        }
    
        const calculateCautionHebergement = () => {
            let cautionHebergement = 0;
            if (participant.schoolID && isDelegation.includes(participant.schoolID)) {
                const participantsFromSameSchool = participants.filter(participant => participant.schoolId === participant.schoolId);
                participantsFromSameSchool.forEach(participant => {
                    cautionHebergement += (participant.packId === 5 || participant.packId === 6 || participant.packId === 11 || participant.packId === 12) ? 600 : 0;
                });
            }
        };
    */
    useEffect(() => {
        fetchConfig();
        fetchTeams();
        fetchUserData();
    }, []);

    return (
        <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ overflowX: 'hidden', backgroundColor: 'background.drawer' }}>
            {/* Navbar */}
            <Navbar navigation={routesForUser} />
            <Dialog
                open={openImageDialog}
                onClose={handleCloseImage}
                maxWidth="md"
                fullWidth
            >
                <DialogContent sx={{ position: 'relative', p: 0, overflow: 'hidden', height: '80vh' }}>
                    <IconButton
                        aria-label="close"
                        onClick={handleCloseImage}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: 'grey.500',
                            bgcolor: 'rgba(255,255,255,0.7)',
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.9)',
                            }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <img 
                        src={currentImage} 
                        alt="Payment Information" 
                        style={{ 
                            height: '100%', 
                            objectFit: 'cover' 
                        }} 
                    />
                </DialogContent>
            </Dialog>

            {/* Main Content */}
            {config?.isPaymentOpen ?
                <Box flexGrow={1} display={'flex'} alignContent={'center'} p={8} flexDirection={'column'}>
                    <Card variant='outlined' sx={{ borderRadius: '0.8rem', width: '100%', mb: 3 }}>
                        <CardHeader title={'Récapitulatif'} />
                        <CardContent>
                            <Box sx={{ width: '50%', ml: 5 }}>
                                <TableContainer>
                                    <Table size="small">
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '1rem' }}>Nombre de joueurs·euses inscrit·es : </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '1rem' }}>{paymentData?.PrincipalList?.totalPlayers}</Typography>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '1rem' }}>Nombre d&apos;équipes inscrites : </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '1rem' }}>{paymentData?.PrincipalList?.totalTeams}</Typography>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '1rem' }}>Montant déjà réglé :</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '1rem' }}>{paymentData?.PrincipalList?.amountPaid} €</Typography>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '1.25rem' }}>Reste à payer : </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '1.25rem' }}>{paymentData?.PrincipalList?.amountToPay.toFixed(2)} €</Typography>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card variant='outlined' sx={{ borderRadius: '0.8rem', width: '100%', mb: 3 }}>
                        <CardHeader title={'Paiement en ligne via Lydia'} />
                        <CardContent>
                            <Box sx={{ mb: 2 }}>
                                <Typography sx={{ fontSize: '1rem', mb: 2, color: 'text.secondary' }}>
                                    💳 Payez facilement et sécurisé en ligne avec <strong>Lydia</strong>. Le paiement est instantané et votre inscription est validée automatiquement.
                                </Typography>
                                <Typography sx={{ fontSize: '0.9rem', mb: 2, color: 'text.secondary' }}>
                                    Vous pouvez payer par équipe ou le montant total. Chaque paiement est traité individuellement et de manière sécurisée.
                                </Typography>
                            </Box>
                            <TeamPaymentList columns={columns} teams={principalTeams} modify={true} onModify={(team) => handleLydiaPayment(team)} disabled={(team) => checkPayment(team)} />
                            {(paymentData?.PrincipalList?.amountToPay >= 1000 || user.school?.isDeleg) && (
                                <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                                    <Typography sx={{ fontSize: '0.95rem', color: 'info.dark' }}>
                                        ℹ️ <strong>Pour les montants importants ou les délégations :</strong> Vous pouvez toujours utiliser Lydia pour payer, ou contacter votre BDS pour un virement groupé si vous préférez.
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                    <Card variant='outlined' sx={{ borderRadius: '0.8rem', width: '100%', mb: 3, marginTop: '2%' }}>
                        <CardHeader title={'Comment payer avec Lydia ?'} />
                        <CardContent>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                                    📱 Paiement en ligne sécurisé
                                </Typography>
                                <Box component="ol" sx={{ pl: 3, '& li': { mb: 1.5 } }}>
                                    <Typography component="li" sx={{ fontSize: '1rem' }}>
                                        Cliquez sur le bouton <strong>"Payer"</strong> à côté de l'équipe que vous souhaitez régler
                                    </Typography>
                                    <Typography component="li" sx={{ fontSize: '1rem' }}>
                                        Une page de paiement Lydia s'ouvrira dans un nouvel onglet
                                    </Typography>
                                    <Typography component="li" sx={{ fontSize: '1rem' }}>
                                        Payez via l'application <strong>Lydia</strong> (mobile ou web) ou par carte bancaire
                                    </Typography>
                                    <Typography component="li" sx={{ fontSize: '1rem' }}>
                                        Votre paiement est confirmé <strong>automatiquement</strong> et votre inscription validée instantanément
                                    </Typography>
                                </Box>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button 
                                    variant="outlined" 
                                    color="primary" 
                                    onClick={() => handleOpenImage('/Payment/caution.png')}
                                    sx={{ flex: 1, minWidth: '200px' }}
                                >
                                    ℹ️ Informations cautions
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    color="secondary" 
                                    onClick={() => handleOpenImage('/Payment/info.png')}
                                    sx={{ flex: 1, minWidth: '200px' }}
                                >
                                    💳 Informations virement (alternative)
                                </Button>
                            </Box>
                            
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                                <Typography sx={{ fontSize: '0.95rem', color: 'success.dark' }}>
                                    ✅ <strong>Avantages du paiement Lydia :</strong> Paiement instantané, validation automatique, pas besoin de contacter le BDS, reçu électronique automatique.
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
                :
                <Box flexGrow={1} display={'flex'} >
                    <Box sx={{ bgcolor: 'background.drawer', width: '100%', display: 'flex', justifyContent: 'center', textAlign: 'center', flexDirection: 'column' }}>
                        <Typography variant="h4" align="center">Le paiement est fermé</Typography>
                    </Box>
                </Box>
            }
        </Box>
    );
}

const columns = [
    { label: "N°", align: "left", key: "id", type: 'index' },
    { label: "Nom", align: "center", key: "name" },
    { label: "Sport", align: "center", key: "sport" },
    { label: "Nombre de joueurs·euses", align: "center", key: "len" },
    { label: "Statut", align: "center", key: "status", type: "status" },
    { label: "Prix total", align: "center", key: "price" },
]

const checkPayment = (team) => {
    return team?.amountToPayInCents <= team?.amountPaidInCents;
}

export default UserPayment;