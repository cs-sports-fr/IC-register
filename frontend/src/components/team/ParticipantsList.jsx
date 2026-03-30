import { Cancel, CheckCircle, Edit, MailOutline, Visibility } from '@mui/icons-material';
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import PropTypes from 'prop-types';
import { useSnackbar } from "../../provider/snackbarProvider";
import { ApiTossConnected } from "../../service/axios";
import HomeIcon from '@mui/icons-material/Home';
import DoneIcon from '@mui/icons-material/Done';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import { useState } from 'react';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const ParticipantsList = ({ headerItem, columns, players, modify, onModify, teamId, resendCharterEmail, modifyrez, caution, showLicenceValidation, allowDocumentValidation }) => {

    const { showSnackbar } = useSnackbar();
    // Add state for the delete confirmation dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [participantToDelete, setParticipantToDelete] = useState(null);

    const handleResendCharterEmail = async (teamId, participantId) => {
        try {
            // Construct the URL for the resend charter email endpoint
            const url = `/teams/${teamId}/participant/${participantId}/resend-charte-email`;

            await ApiTossConnected.post(url, {}, { headers: { 'Content-Type': 'application/json' } });

            // Show success feedback to the user
            showSnackbar('Email de charte renvoyé avec succès', 3000, 'success');
        } catch (error) {
            console.error("Failed to resend charter email:", error);

            // Error handling and user feedback
            let errorMessage = 'Une erreur est survenue lors de la tentative de renvoi de l\'email de charte';
            if (error.response && error.response.data && error.response.data.detail) {
                errorMessage = error.response.data.detail;
            }

            showSnackbar(errorMessage, 3000, 'error');
        }
    };



    const handleResendCautionEmail = async (teamId, participantId) => {
        try {
            // Construct the URL for the resend charter email endpoint
            const url = `/teams/${teamId}/participant/${participantId}/resend-caution-email`;

            await ApiTossConnected.post(url, {}, { headers: { 'Content-Type': 'application/json' } });

            // Show success feedback to the user
            showSnackbar('Email de caution renvoyé avec succès', 3000, 'success');
        } catch (error) {
            console.error("Failed to resend charter email:", error);

            // Error handling and user feedback
            let errorMessage = 'Une erreur est survenue lors de la tentative de renvoi de l\'email de caution';
            if (error.response && error.response.data && error.response.data.detail) {
                errorMessage = error.response.data.detail;
            }

            showSnackbar(errorMessage, 3000, 'error');
        }
    };


    const handleValidateRez = async (teamId, participantId) => {
        try {
            const url = `/teams/${teamId}/participant/${participantId}/validate-rez`;
            await ApiTossConnected.put(url);
            
            showSnackbar('Logement validé avec succès', 3000, 'success');
        } catch (error) {
            console.error("Failed to validate accommodation:", error);
    
            // Error handling and user feedback
            let errorMessage = 'Une erreur est survenue lors de la validation du logement';
            if (error.response && error.response.data && error.response.data.detail) {
                errorMessage = error.response.data.detail;
            }
    
            showSnackbar(errorMessage, 3000, 'error');
        }
    };

    const handleValidateCaution = async (teamId, participantId) => {
        try {
            const url = `/teams/${teamId}/participant/${participantId}/validate-caution`;
            await ApiTossConnected.put(url);
            
            showSnackbar('Caution validé avec succès', 3000, 'success');
        } catch (error) {
            console.error("Failed to validate accommodation:", error);
    
            // Error handling and user feedback
            let errorMessage = 'Une erreur est survenue lors de la validation de la caution';
            if (error.response && error.response.data && error.response.data.detail) {
                errorMessage = error.response.data.detail;
            }
    
            showSnackbar(errorMessage, 3000, 'error');
        }
    };
        
    
    const handleValidateCertificate = async (teamId, participantId) => {
        try {
            const url = `/teams/${teamId}/participant/${participantId}/validate-certificate`;
            await ApiTossConnected.put(url);
                
            showSnackbar('Certificat validé/dévalidé avec succès', 3000, 'success');
          

        } catch (error) {
            console.error("Erreur lors de la validation", error);
        
            // Error handling and user feedback
            let errorMessage = 'Une erreur est survenue lors de la validation du certificat';
            if (error.response && error.response.data && error.response.data.detail) {
                errorMessage = error.response.data.detail;
            }
        
            showSnackbar(errorMessage, 3000, 'error');
        }
    };

    const handleValidateLicence = async (teamId, participantId) => {
        try {
            const url = `/teams/${teamId}/participant/${participantId}/validate-licence`;
            await ApiTossConnected.put(url);
            showSnackbar('Licence validée/dévalidée avec succès', 3000, 'success');
        } catch (error) {
            console.error("Erreur lors de la validation de la licence", error);

            let errorMessage = 'Une erreur est survenue lors de la validation de la licence';
            if (error.response && error.response.data && error.response.data.detail) {
                errorMessage = error.response.data.detail;
            }

            showSnackbar(errorMessage, 3000, 'error');
        }
    };


    
    // Open the delete dialog instead of deleting immediately
    const openDeleteDialog = (teamId, participant) => {
        setParticipantToDelete({ id: participant.id, name: `${participant.firstname} ${participant.lastname}`, teamId });
        setDeleteDialogOpen(true);
    };
    
    // Close the dialog without deleting
    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setParticipantToDelete(null);
    };
       
    // Actual deletion happens here when confirmed
    const handleDeleteParticipant = async () => {
        try {
            if (!participantToDelete) return;
            
            const { teamId, id: participantId } = participantToDelete;
            
            // Use the bulk delete endpoint with a single participant ID
            const url = `/teams/${teamId}/participants`;
            
            // Send the participant IDs directly as a list in the request body
            await ApiTossConnected.delete(url, { 
                data: [participantId]  // Send as a direct array, not inside an object
            });
            
            showSnackbar('Joueur supprimé avec succès', 3000, 'success');
            
            // Close the dialog
            handleCloseDeleteDialog();
            
            // Refresh the page to show updated data
            window.location.reload();
            
        } catch (error) {
            console.error("Failed to delete participant:", error);
            // Error handling and user feedback
            let errorMessage = 'Une erreur est survenue lors de la suppression du joueur';
            if (error.response && error.response.data && error.response.data.detail) {
                errorMessage = error.response.data.detail;
            }
            showSnackbar(errorMessage, 3000, 'error');
            handleCloseDeleteDialog();
        }
    };

    const handleDocument = async (teamId, participantId, routeSegment, label) => {
        try {
            const response = await ApiTossConnected.get(`/teams/${teamId}/participant/${participantId}/${routeSegment}`, { responseType: 'blob' });

            if (response.status === 200) {
                const blob = response.data;
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL, '_blank');
            } else {
                console.error(`Erreur lors de la récupération du ${label}, statut:`, response.status);
            }
        } catch (error) {
            console.error(`Erreur lors de la récupération du ${label}:`, error);
            showSnackbar(`Une erreur est survenue lors de la récupération du ${label}`, 3000, 'error');
        }
    }


    return (
        <>
            <Card sx={{ borderRadius: '0.8rem' }}>
                <CardContent>
                    <Box>
                        {headerItem && headerItem}
                    </Box>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow variant="head">
                                    {columns.map((column, index) => (
                                        <TableCell key={index} align={column?.align}>{column?.label}</TableCell>
                                    ))}
                                    {caution && <TableCell align="center">Caution validée</TableCell>}
                                    {resendCharterEmail && <TableCell align="center">Renvoi charte</TableCell>}
                                    {caution && <TableCell align="center">Renvoi caution</TableCell>}
                                    {allowDocumentValidation && <TableCell align="center">Valider Certificat | Attestation</TableCell>}
                                    {showLicenceValidation && <TableCell align="center">Valider Licence</TableCell>}
                                    {caution && <TableCell align="center">Valider caution</TableCell>}
                                    {modifyrez && <TableCell align="center">Valider Rez</TableCell>}
                                    {modify && <TableCell align="center">Modifier</TableCell>}
                                    {resendCharterEmail && <TableCell align="center">Effacer joueur</TableCell>}


                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {players ? players.map((player, indexP) => (
                                    <TableRow key={indexP}>
                                        {columns.map((column, indexC) => (
                                            // Existing cell rendering code...
                                            column?.type === "boolean" ?
                                                <TableCell key={indexC} align={column?.align}>
                                                    {player[column?.name] ? <CheckCircle color="success" /> : <Cancel color="error" />}
                                                </TableCell>
                                                :
                                                column?.type === "date" ?
                                                    <TableCell key={indexC} align={column?.align}>
                                                        {new Date(player[column?.name]).toLocaleDateString()}
                                                    </TableCell>
                                                    :
                                                    column?.type === "index" ?
                                                        <TableCell key={indexC} align={column?.align}>
                                                            {indexP + 1}
                                                        </TableCell>
                                                        :
                                                        column?.type === "booleanrez" ? (
                                                            <TableCell key={indexC} align={column?.align}>
                                                                {player.packId && [1,6].includes(player.packId) ? (
                                                                    player[column?.name] ? 
                                                                        <CheckCircle color="success" /> : 
                                                                        <Cancel color="error" />
                                                                ) : null}
                                                            </TableCell>
                                                        ) 
                                                            :
                                                            column?.type === "document" ?
                                                                <TableCell
                                                                    key={indexC}
                                                                    align={column?.align}
                                                                    sx={{ cursor: player[column?.fileField] ? 'pointer' : 'default' }}
                                                                    onClick={() => {
                                                                        if (player[column?.fileField]) {
                                                                            handleDocument(teamId, player.id, column?.routeSegment, column?.label.toLowerCase());
                                                                        }
                                                                    }}
                                                                >
                                                                    {player[column?.name] ? player[column?.fileField] ?
                                                                        <Visibility color="success" /> : <CheckCircle color="success" /> : <Cancel color="error" />}
                                                                </TableCell>
                                                                :
                                                                <TableCell key={indexC} align={column?.align}>
                                                                    {player[column?.name]}
                                                                </TableCell>
                                        ))}
                                        {caution && (
                                            <TableCell align="center">
                                            {player["cautionOK"] ? <CheckCircle color="success" /> : <Cancel color="error" />}
                                            </TableCell>
                                        )}
                                        
                                        {resendCharterEmail && (
                                            <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={() => handleResendCharterEmail(teamId, player.id)}>
                                                <MailOutline />
                                            </TableCell>
                                        )}
                                        {caution && (
                                            <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={() => handleResendCautionEmail(teamId, player.id)}>
                                                <LocalAtmIcon />
                                            </TableCell>
                                        )}
                                       
                                        {allowDocumentValidation && (
                                            <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={() => handleValidateCertificate(teamId, player.id)}>
                                                <DoneIcon />
                                            </TableCell>
                                        )}
                                        {showLicenceValidation && (
                                            <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={() => handleValidateLicence(teamId, player.id)}>
                                                <DoneIcon />
                                            </TableCell>
                                        )}
                                         {caution && (
                                            <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={() => handleValidateCaution(teamId, player.id)}>
                                                <AttachMoneyIcon />
                                            </TableCell>
                                        )}
                                        {modifyrez && (
                                            <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={() => handleValidateRez(teamId, player.id)}>
                                                <HomeIcon />
                                            </TableCell>
                                        )}
                                        {modify && <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={() => onModify(player.id)}>
                                            <Edit />
                                        </TableCell>}
                                        {resendCharterEmail && (
                                            <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={() => openDeleteDialog(teamId, player)}>
                                                <DeleteIcon />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                )) :
                                    <TableRow>
                                        <TableCell colSpan={columns.length + (modify ? 1 : 0)} align="center">
                                            <Typography component="h2" sx={{ color: 'divider', marginTop: '1rem' }}>
                                                Aucune joueurs dans l&apos;équipe
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                }
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Delete confirmation dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">
                    Confirmer la suppression
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Es-tu sûr de vouloir supprimer {participantToDelete?.name} ? Cette action est irréversible !
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="primary">
                        Annuler
                    </Button>
                    <Button onClick={handleDeleteParticipant} color="error" variant="contained" autoFocus>
                        Supprimer
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

ParticipantsList.propTypes = {
    headerItem: PropTypes.element,
    columns: PropTypes.array.isRequired,
    players: PropTypes.array,
    modify: PropTypes.bool,
    onModify: PropTypes.func,
    teamId: PropTypes.string.isRequired,
    resendCharterEmail: PropTypes.bool,
    modifyrez: PropTypes.bool,
    caution: PropTypes.bool,
    showLicenceValidation: PropTypes.bool,
    allowDocumentValidation: PropTypes.bool,
};
export default ParticipantsList;