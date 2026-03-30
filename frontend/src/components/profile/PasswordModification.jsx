import { Box, Button, Divider, InputLabel, Typography } from "@mui/material";
import * as yup from 'yup';
import PasswordInput from "../PasswordInput";
import { useState } from "react";
import { ApiTossConnected } from "../../service/axios";
import { useSnackbar } from "../../provider/snackbarProvider";

const PasswordModification = () => {

    const { showSnackbar } = useSnackbar();

    const [passwordData, setPasswordData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const handleInputChange = (event) => {
        const { id, value } = event.target;

        setPasswordData((prevData) => ({
            ...prevData,
            [id]: value,
        }));
    };

    const validationSchema = yup.object({
        oldPassword: yup.string().required('L\'ancien mot de passe est requis'),
        newPassword: yup.string().required('Le nouveau mot de passe est requis').min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
        confirmPassword: yup.string().oneOf([yup.ref('newPassword'), null], 'Les mots de passe doivent correspondre'),
    });

    const [errors, setErrors] = useState({});
    const handleButton = async () => {
        try {
            // Valide les données par rapport au schéma
            await validationSchema.validate(passwordData, { abortEarly: false });
            setErrors({}); // Réinitialise les erreurs en cas de succès
            const userId = localStorage.getItem('id');
            if (!userId) {
                showSnackbar('Une erreur est survenue', 3000, 'error');
                return;
            }
            ApiTossConnected.put('users/' + userId + '/password?old_password=' + passwordData.oldPassword + '&new_password=' + passwordData.newPassword)
                .then(() => {
                    showSnackbar('Mot de passe modifié', 3000, 'success');
                    setPasswordData({
                        oldPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                    });
                })
                .catch((err) => {
                    console.log(err);
                    showSnackbar('Une erreur est survenue', 3000, 'error');
                });


        } catch (err) {
            const formattedErrors = err.inner.reduce((acc, error) => {
                acc[error.path] = error.message;
                return acc;
            }, {});
            setErrors(formattedErrors); // Stocke les erreurs de validation pour les afficher
        }
    }

    return (
        <>
            <Typography variant="h4">Modifier mon mot de passe</Typography>
            <Box sx={{ width: '40vw' }}>
                <Divider sx={{ my: 2 }} />
                <form>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="oldPassword" sx={{ marginBottom: 1 }}>Ancien mot de passe</InputLabel>
                        <PasswordInput
                            id="oldPassword"
                            placeholder="Ancien mot de passe"
                            variant="outlined"
                            value={passwordData.oldPassword}
                            onChange={handleInputChange}
                            fullWidth
                            autoComplete="new-password"
                            error={!!errors.oldPassword}
                            helperText={errors.oldPassword}
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="newPassword" sx={{ marginBottom: 1 }}>Nouveau mot de passe</InputLabel>
                        <PasswordInput
                            id="newPassword"
                            placeholder="Nouveau mot de passe"
                            variant="outlined"
                            value={passwordData.newPassword}
                            onChange={handleInputChange}
                            fullWidth
                            autoComplete="new-password"
                            error={!!errors.newPassword}
                            helperText={errors.newPassword}
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="confirmPassword" sx={{ marginBottom: 1 }}>Confirmer le mot de passe</InputLabel>
                        <PasswordInput
                            id="confirmPassword"
                            placeholder="Confirmer le mot de passe"
                            variant="outlined"
                            value={passwordData.confirmPassword}
                            onChange={handleInputChange}
                            fullWidth
                            autoComplete="new-password"
                            error={!!errors.confirmPassword}
                            helperText={errors.confirmPassword}
                        />
                    </Box>
                    <Button variant="contained" sx={{ mt: 2 }} onClick={handleButton}>Valider</Button>
                </form>
            </Box>
        </>
    );
}

export default PasswordModification;