import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, IconButton, TextField } from "@mui/material";
import Navbar from "../../components/navbar/Navbar";
import { routesForAdmin, routesForSuperAdmin } from "../../routes/routes";
import { useEffect, useState } from "react";
import axios from "axios";
import { ApiTossConnected } from "../../service/axios";
import * as yup from 'yup';
import { useSnackbar } from "../../provider/snackbarProvider";
import PlayerList from "../../components/team/ParticipantsList";
import { useLocation, useNavigate } from "react-router-dom";
import { parseTeam } from "../../utils/parseTeam";
import AddParticipant from "../../components/team/AddParticipant";
import { useAuth } from "../../provider/authProvider";
import ModifyParticipant from "../../components/team/ModifyParticipant";
import { Edit, Delete } from "@mui/icons-material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const AdminTeamDetail = () => {
    const navigation = useNavigate();
    const { permission } = useAuth();
    const route = permission === 'SuperAdminStatus' ? routesForSuperAdmin : routesForAdmin;

    const [team, setTeam] = useState();
    const teamId = useLocation().pathname.split('/').pop();

    const { showSnackbar } = useSnackbar();

    const [drawerOpenModify, setDrawerOpenModify] = useState(false);
    const [drawerOpenAdd, setDrawerOpenAdd] = useState(false);

    const [selectedParticipant, setSelectedParticipant] = useState(null);
    
    // Add state for delete confirmation dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleModifyParticipant = (id) => {
        const nextParticipant = team.participants.find(participant => participant.id === id);
        if (drawerOpenModify) {
            setDrawerOpenModify(false);
            setSelectedParticipant(null);
            setTimeout(() => {
                setSelectedParticipant(nextParticipant);
                setDrawerOpenModify(true);
            }, 0);
            return;
        }
        setSelectedParticipant(nextParticipant);
        setDrawerOpenModify(true);
    }
    
    const handleCloseDrawer = () => {
        setDrawerOpenModify(false);
        setSelectedParticipant(null);
        fetchData();
        setErrors({})
    }

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState(null);

    const [packs, setPacks] = useState([]);
    const [goodies, setGoodies] = useState([]);
    
    const fetchData = () => {
        const endpoints = [
            'packs',
            'products',
            'teams/' + teamId,
        ]
        axios.all(endpoints.map(url => ApiTossConnected.get(url)))
            .then(axios.spread((...responses) => {
                setPacks(responses[0].data);
                setGoodies(responses[1].data);
                setTeam(parseTeam(responses[2].data));
            })).catch((error) => {
                console.log(error);
            });
    }

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // eslint-disable-next-line no-unused-vars
    const handleChange = (e, newInput) => {
        const { name, value } = e.target;
        // console.log("name ", name, " value ", value);
        setSelectedParticipant({ ...selectedParticipant, [name]: value })
    }
    
    const handleCheckboxChange = (goodieId, checked) => {
        const updatedGoodies = checked
            ? [...selectedParticipant.productsIds, goodieId]
            : selectedParticipant.productsIds.filter(id => id !== goodieId);
        setSelectedParticipant({ ...selectedParticipant, productsIds: updatedGoodies });
    };

    //** Validation de données */
    const playerSchema = yup.object().shape({
        email: yup.string().email('Email invalide').required('Email requis'),
        lastname: yup.string().required('Nom requis'),
        firstname: yup.string().required('Prénom requis'),
        dateOfBirth: yup.date().required('Date de naissance requise'),
        gender: yup.string().required('Genre requis'),
        packId: yup.number().required('Pack requis')
    });

    const [errors, setErrors] = useState({});
    
    const handleSubmit = async (event) => {
        event.preventDefault()
        try {
            await playerSchema.validate(selectedParticipant, { abortEarly: false });
            setErrors({});
            ApiTossConnected.put('teams/' + teamId + '/participant/' + selectedParticipant.id, selectedParticipant)
                .then(() => {
                    handleCloseDrawer();
                    fetchData();
                    showSnackbar('Modification réussie', 3000, 'success');
                })
                .catch((err) => {
                    console.log(err);
                    showSnackbar('Une erreur est survenue', 3000, 'error');
                });
        }
        catch (err) {
            const newErrors = {};
            err.inner.forEach((error) => {
                newErrors[error.path] = error.message;
            });
            setErrors(newErrors);
        }
    }

    const handleUpdateStatus = (status) => () => {
        setStatusToUpdate(status);
        setConfirmDialogOpen(true);
    };

    const confirmStatusUpdate = () => {
        if (!statusToUpdate) return;
        
        ApiTossConnected.put('teams/' + teamId + '/status?status=' + statusToUpdate)
            .then(() => {
                fetchData();
                showSnackbar('Status modifié', 2000, 'success');
                setConfirmDialogOpen(false);
            })
            .catch((err) => {
                console.log(err);
                showSnackbar('Une erreur est survenue', 3000, 'error');
                setConfirmDialogOpen(false);
            });
    };
    
    // Add delete team handler
    const handleDeleteTeam = () => {
        setDeleteDialogOpen(true);
    };
    
    // Add confirm delete handler
    const confirmDeleteTeam = () => {
        ApiTossConnected.delete(`/teams/${teamId}/admin`)
            .then(() => {
                showSnackbar('Équipe supprimée avec succès', 3000, 'success');
                setDeleteDialogOpen(false);
                // Navigate back to previous page or dashboard after deletion
                navigation(-1);
            })
            .catch((err) => {
                console.log(err);
                showSnackbar('Une erreur est survenue lors de la suppression', 3000, 'error');
                setDeleteDialogOpen(false);
            });
    };
    
    const PlayerListHeader =
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2.5 }}>
                       
            {team?.status === "PrincipalList"  && <Box sx={{ width: '15%', mx: 2.5 }}>
                <Button onClick={handleUpdateStatus('Validated')}>Finaliser l'inscription</Button>
            </Box>}

            {team?.status === "Awaitingauthorization"&& permission === 'SuperAdminStatus' && <Box sx={{ width: '15%', mx: 2.5 }}>
                <Button onClick={handleUpdateStatus('PrincipalList')}>Valider le logement</Button>
            </Box>}

            {team?.status === "Incomplete" &&  <Box sx={{ width: '15%', mx: 2.5 }}>
                <Button onClick={handleUpdateStatus('Waiting')}>Valider le dossier</Button>
            </Box>}

            {team?.status === "Waiting" && (
                <Box sx={{ width: '15%', mx: 2.5 }}>
                    <Button onClick={() => {
                        // Check if any participant has a pack that requires lodging validation
                        const needsLodgingValidation = team.participants.some(
                            participant => [1, 6, 17].includes(participant.packId)
                        );
                        
                        // Set the appropriate status based on pack IDs
                        const newStatus = needsLodgingValidation ? 'Awaitingauthorization' : 'PrincipalList';
                        handleUpdateStatus(newStatus)();
                    }}>
                        Selectionner l'équipe
                    </Button>
                </Box>
            )}

            <Box sx={{ width: '15%', mx: 2.5 }}>
                <Button disabled={team?.participants?.length >= team?.sport?.nbPlayersMax} onClick={() => setDrawerOpenAdd(true)}>Ajouter un joueur</Button>
            </Box>
            
            {/* Add the delete team button */}
            <Box sx={{ width: '15%', mx: 2.5 }}>
                <Button 
                    variant="outlined" 
                    color="error" 
                    startIcon={<Delete />} 
                    onClick={handleDeleteTeam}
                >
                    Supprimer l'équipe
                </Button>
            </Box>
        </Box>
    
        const [teamEditDialogOpen, setTeamEditDialogOpen] = useState(false);
        const [editTeamName, setEditTeamName] = useState("");
        const [teamNameError, setTeamNameError] = useState("");

        const handleOpenTeamEdit = () => {
        setEditTeamName(team?.name || "");
        setTeamNameError("");
        setTeamEditDialogOpen(true);
        };

        const handleSaveTeamName = () => {
            if (!editTeamName.trim()) {
                setTeamNameError("Le nom de l'équipe ne peut pas être vide");
                return;
            }
            
            // Use the correct endpoint and pass name as a query parameter
            ApiTossConnected.put(`teams/${teamId}?name=${encodeURIComponent(editTeamName)}`)
                .then(() => {
                    fetchData();
                    showSnackbar('Nom de l\'équipe modifié avec succès', 2000, 'success');
                    setTeamEditDialogOpen(false);
                })
                .catch((err) => {
                    console.log(err);
                    if (err.response?.data?.detail === "A team with this name already exists") {
                        setTeamNameError("Une équipe avec ce nom existe déjà");
                    } else {
                        showSnackbar('Une erreur est survenue lors de la modification du nom', 3000, 'error');
                    }
                });
        };
    return (
        <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ overflowX: 'hidden', backgroundColor: 'background.drawer' }}>
            {/* // Navbar */}
            <Navbar navigation={route} />

            <Box >
                <Box sx={{ ml: 5, mt: 5 }}>
                <Box sx={{ m: 5, width: '15%' }}>
                    <IconButton onClick={() => navigation(-1)} >
                        <ArrowBackIcon sx={{
                        color: 'primary.main',
                        position: 'absolute',
                        right: 20
                    }} />
                    </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant={'h4'}>Détail de l&apos;équipe : <span style={{fontWeight: 'bold'}}>{team?.name} ({team?.sport?.sport})</span></Typography>
                    <IconButton onClick={handleOpenTeamEdit}><Edit /></IconButton>
                </Box>
                    <Typography variant={'h5'} sx={{ mb: 1 }}>Niveau de l&apos;équipe : <span style ={{fontWeight: 'bold'}}>{team?.level}</span> </Typography>
                    <Typography variant={'h6'}>L&apos;équipe est actuellement {team?.status == "Incomplete" ? "en finalisation de dossier" : team?.status == "Validated" ? "inscrite" : team?.status == "PrincipalList" ? "sélectionnée" : "en liste d'attente"}</Typography>
                </Box>
                <Box sx={{ m: 5 }}>
                <PlayerList
                    headerItem={PlayerListHeader}
                    columns={getColumns(team?.sport?.sport === 'Golf')}
                    players={team?.participants}
                    modify={true}
                    onModify={handleModifyParticipant}
                    teamId={teamId}
                    resendCharterEmail={true}
                    allowDocumentValidation={true}
                    modifyrez={permission === 'SuperAdminStatus'}
                    caution={team?.status === 'PrincipalList' || team?.status === 'Validated'}
                    showLicenceValidation={team?.sport?.sport === 'Golf'}
                />
                </Box>
            </Box>

            <ModifyParticipant
                key={selectedParticipant?.id ?? 'no-participant'}
                open={drawerOpenModify}
                onClose={handleCloseDrawer}
                participant={selectedParticipant}
                setSelectedParticipant={setSelectedParticipant}
                packs={packs}
                goodies={goodies}
                errors={errors}
                handleSubmit={handleSubmit}
                handleChange={handleChange}
                handleCheckboxChange={handleCheckboxChange}
                deleteEnabled={team?.participants?.length >= team?.sport?.nbPlayersMin && selectedParticipant?.isCaptain === false}
                teamId={teamId}
                sport={team?.sport?.sport}
            />

            <AddParticipant
                open={drawerOpenAdd}
                onClose={() => { setDrawerOpenAdd(false); fetchData(); }}
                teamId={teamId}
                packs={packs}
                goodies={goodies}
            />
            
            {/* Status confirmation dialog */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {"Changement de statut de l'équipe"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {statusToUpdate === "Waiting" && "Es-tu sûr de vouloir valider ce dossier ? L'équipe passera en liste d'attente."}
                        {statusToUpdate === "Awaitingauthorization" && "Es-tu sûr de vouloir sélectionner cette équipe ?"}
                        {statusToUpdate === "PrincipalList" && "Es-tu sûr de vouloir sélectionner cette équipe ?"}
                        {statusToUpdate === "Validated" && "Es-tu sûr de vouloir finaliser l'inscription de cette équipe ?"}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Annuler</Button>
                    <Button onClick={confirmStatusUpdate} autoFocus>
                        Confirmer
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Team edit dialog */}
            <Dialog
                open={teamEditDialogOpen}
                onClose={() => setTeamEditDialogOpen(false)}
                aria-labelledby="edit-team-dialog-title"
            >
                <DialogTitle id="edit-team-dialog-title">
                    Modifier le nom de l'équipe
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                    Entrez le nouveau nom pour cette équipe.
                    </DialogContentText>
                    <TextField
                    autoFocus
                    margin="dense"
                    id="name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    error={!!teamNameError}
                    helperText={teamNameError}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTeamEditDialogOpen(false)}>Annuler</Button>
                    <Button onClick={handleSaveTeamName}>Enregistrer</Button>
                </DialogActions>
            </Dialog>
            
            {/* New delete confirmation dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">
                    {"Supprimer l'équipe"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Es-tu sûr de vouloir supprimer l'équipe <strong>{team?.name}</strong> et tous ses participants ? 
                        Cette action est irréversible et supprimera toutes les données associées.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
                    <Button 
                        onClick={confirmDeleteTeam} 
                        color="error" 
                        variant="contained" 
                        autoFocus
                    >
                        Supprimer définitivement
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

const getColumns = (isGolf) => [
    { label: "N°", align: "left", name: "id", type: 'index' },
    { label: "Prénom", align: "center", name: "firstname" },
    { label: "NOM", align: "center", name: "lastname" },
    { label: "Email", align: "center", name: "email" },
    { label: "Téléphone", align: "center", name: "mobile" },
    { label: "Genre", align: "center", name: "gender" },
    { label: "Capitaine", align: "center", name: "isCaptain", type: "boolean" },
    { label: "Date de naissance", align: "center", name: "dateOfBirth", type: "date" },
    { label: "Régime alimentaire", align: "center", name: "diet" },
    { label: "Charte signée", align: "center", name: "charteIsValidated", type: "boolean" },
    { label: "Logement en résidence", align: "center", name: "logementRezOk", type: "booleanrez" },
    { label: "Certificat | Attestation Ajouté", align: "center", name: "certif", type: "document", fileField: "certificateLink", routeSegment: "certificate" },
    { label: "Certificat | Attestion Validé", align: "center", name: "certificateOK", type: "boolean" },
    ...(isGolf ? [
        { label: "Numéro de licence", align: "center", name: "licenceID" },
        { label: "Licence PDF ajoutée", align: "center", name: "licencePdf", type: "document", fileField: "licenceLink", routeSegment: "licence" },
        { label: "Licence validée", align: "center", name: "licenceOK", type: "boolean" },
    ] : []),
    { label: "Pack", align: "center", name: "packname" },
    { label: "Prix", align: "center", name: "price" },
]

export default AdminTeamDetail;