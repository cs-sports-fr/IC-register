import { Box, Button, Divider, InputLabel, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { ApiTossConnected } from "../../service/axios";
import * as Yup from 'yup';
import { useSnackbar } from "../../provider/snackbarProvider";


const ProfilModification = () => {

    const { showSnackbar } = useSnackbar();

    const [user, setUser] = useState({
        email: "",
        firstname: "",
        lastname: "",
        mobile: "",
    });
    const [errors, setErrors] = useState({}); // State to hold validation errors

    // Yup schema for validation
    const userSchema = Yup.object().shape({
        firstname: Yup.string().required('Prénom est requis'),
        lastname: Yup.string().required('Nom est requis'),
        mobile: Yup.string().matches(/^\+?\d{10,}$/, 'Numéro de téléphone invalide').required('Numéro de téléphone est requis'),
    });


    const fetchData = () => {
        ApiTossConnected.get('/users/me')
            .then(response => {
                setUser(response.data);
            }).catch(error => {
                console.log(error);
            });
    }

    useEffect(() => {
        fetchData();
    }, []);

    const [isModified, setIsModified] = useState(false);

    const handleButton = async () => {
        if (isModified) {
            try {
                // Valide les données par rapport au schéma
                await userSchema.validate(user, { abortEarly: false });
                setErrors({}); // Réinitialise les erreurs en cas de succès
                const userId = localStorage.getItem('id');
                if (!userId) {
                    showSnackbar('Une erreur est survenue', 3000, 'error');
                    return;
                }
                const dataString = `?email=${user.email}&firstname=${user.firstname}&lastname=${user.lastname}&mobile=${user.mobile}`;
                ApiTossConnected.put('users/' + userId + dataString)
                    .then(() => {
                        showSnackbar('Modifications effectuées', 3000, 'success');
                        fetchData();
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
        setIsModified(!isModified);
    }

    const handleChange = (e) => {
        const { id, value } = e.target;
        setUser(prevState => ({
            ...prevState,
            [id]: value,
        }));
    }

    return (
        <>
            <Typography variant="h4">Modifier mon profil</Typography>
            <Typography variant="body1" >Voici les informations relatives à ton compte</Typography>
            <Box sx={{ width: '40vw' }}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                    <InputLabel htmlFor="email" sx={{ marginBottom: 1 }}>Email</InputLabel>
                    <TextField id="email"
                        placeholder="email"
                        variant="outlined"
                        value={user?.email}
                        fullWidth
                        disabled
                    />
                </Box>
                <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                    <InputLabel htmlFor="firstname" sx={{ marginBottom: 1 }}>Prénom</InputLabel>
                    <TextField id="firstname"
                        placeholder="Prénom"
                        variant="outlined"
                        value={user?.firstname}
                        onChange={handleChange}
                        fullWidth
                        error={!!errors.firstname}
                        helperText={errors.firstname}
                        disabled={!isModified}
                    />
                </Box>
                <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                    <InputLabel htmlFor="lastname" sx={{ marginBottom: 1 }}>Nom</InputLabel>
                    <TextField id="lastname"
                        placeholder="Nom"
                        variant="outlined"
                        value={user?.lastname}
                        onChange={handleChange}
                        fullWidth
                        error={!!errors.lastname}
                        helperText={errors.lastname}
                        disabled={!isModified}
                    />
                </Box>
                <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                    <InputLabel htmlFor="mobile" sx={{ marginBottom: 1 }}>Numéro de téléphone</InputLabel>
                    <TextField id="mobile"
                        placeholder="+3360000000"
                        variant="outlined"
                        value={user?.mobile}
                        onChange={handleChange}
                        fullWidth
                        type="tel"
                        error={!!errors.mobile}
                        helperText={errors.mobile}
                        disabled={!isModified}
                    />
                </Box>
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleButton}>{isModified ? 'Enregistrer' : 'Modifier'}</Button>
            </Box>
        </>
    );
}

export default ProfilModification;