import { Autocomplete, Box, Button, Checkbox, Divider, Grid, InputLabel, Link, ListItem, ListItemText, TextField, Typography } from "@mui/material";
import LayoutUnauthenticated from "../components/layouts/LayoutUnauthenticated"
import PasswordInput from "../components/PasswordInput";
import { useSnackbar } from "../provider/snackbarProvider";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import * as yup from 'yup';
import { ApiICNotConnected } from "../service/axios";
import axios from "axios";

const Register = () => {
    const isDarkMode = true;

    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        firstname: '',
        email: '',
        school: null,
        tel: '',
        password: '',
        confirmPassword: '',
        checkbox: false,
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validationSchema = yup.object().shape({
        name: yup.string().required('Le nom est obligatoire').matches(/^[a-zA-ZÀ-ÿ ]*$/, 'Le nom ne doit pas contenir de chiffres'),
        firstname: yup.string().required('Le prénom est obligatoire').matches(/^[a-zA-ZÀ-ÿ ]*$/, 'Le prénom ne doit pas contenir de chiffres'),
        email: yup.string().required('L\'email est obligatoire').email('L\'email n\'est pas valide'),
        tel: yup.string().required('Le numéro de téléphone est obligatoire')
            .matches(/^\+?\d+$/, "Le numéro de téléphone doit être numérique")
            .min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres'),
        password: yup.string().required('Le mot de passe est obligatoire').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Le mot de passe doit contenir minimum 8 caractères, 1 chiffre, 1 majuscule et 1 caractère spécial : @$!%*?&'),
        confirmPassword: yup.string().required('Le mot de passe est obligatoire').oneOf([yup.ref('password'), null], 'Les mots de passe doivent correspondre'),
        checkbox: yup.bool().oneOf([true], 'Vous devez accepter les conditions générales'),
        school: yup.object().required('L\'école est obligatoire'),
    });

    const handleChange = (e, newInput) => {
        // console.log('newInput', newInput);
        const { name, value, checked, type } = e.target;
        if (newInput != undefined && type != 'checkbox') {
            setFormData({
                ...formData,
                school: newInput,
            });
        } else {
            setFormData({
                ...formData,
                [name]: type === 'checkbox' ? checked : value,
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Create a copy of formData with email converted to lowercase
            const normalizedFormData = {
                ...formData,
                email: formData.email.toLowerCase().trim() // Convert to lowercase and remove any whitespace
            };
            
            // Validate the normalized data
            await validationSchema.validate(normalizedFormData, { abortEarly: false });
            setErrors({}); // Reset errors

            const userData = {
                lastname: normalizedFormData.name,
                firstname: normalizedFormData.firstname,
                email: normalizedFormData.email, // This is now lowercase
                schoolId: normalizedFormData.school.id,
                mobile: normalizedFormData.tel,
                password: normalizedFormData.password,
            };
            
            // Send form data
            ApiICNotConnected.post('/signup/', userData, { headers: { 'Content-Type': 'application/json' } }).then(() => {
                showSnackbar('Inscription réussie, veuillez vous connecter', 3000, 'success',);
                navigate('/');
            }).catch((error) => {
                console.log('Error', error);
                if (error.response.data.detail === "User with this email already exists") {
                    showSnackbar('Un compte avec cet email existe déjà', 2000, 'error');
                } else {
                    showSnackbar('Erreur lors de l\'inscription', 1500, 'error');
                }
                setIsSubmitting(false);
            });
        } catch (err) {
            if (err instanceof yup.ValidationError) {
                const newErrors = {};
                err.inner.forEach((error) => {
                    newErrors[error.path] = error.message;
                });
                setErrors(newErrors);
            }
            setIsSubmitting(false);
        }
    }

    const [schools, setSchools] = useState([]);
    const fetchData = () => {
        const endpoints = [
            'schools',
        ]
        axios.all(endpoints.map(url => ApiICNotConnected.get(url)))
            .then(axios.spread((...responses) => {
                // Sort schools alphabetically by name before setting state
                const sortedSchools = [...responses[0].data].sort((a, b) => 
                    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
                );
                setSchools(sortedSchools);
            })).catch((error) => {
                console.log(error);
            });
    }
    
    useEffect(() => {
        fetchData();
    }, []);

    return (
        <LayoutUnauthenticated isDarkMode={isDarkMode}>
            <Box display={'flex'} flexDirection={'column'} height={'100vh'} >
                <Grid container spacing={2} height={'102vh'}>
                    <Grid item xs={12} md={7} >
                        <Grid py={'10vh'} px={'13%'} sx={{}}>
                            <Typography sx={{
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                mb: 1.5,
                                letterSpacing: '0.001rem',
                            }}>
                                <span style={{ textDecoration: 'underline', textDecorationColor: '#DBA802', textUnderlineOffset: '0.7rem', textDecorationThickness: '4px', }}>Inscr</span>iption au <span style={{ color: "#DBA802" }}>IC 2026</span>
                            </Typography>

                            <form >
                                <Grid container columnSpacing={6}>
                                    <Grid item xs={12} md={6}>
                                        <InputLabel htmlFor="name" sx={{ marginBottom: 1 }}>Nom</InputLabel>
                                        <TextField id="name"
                                            placeholder="Doe"
                                            variant="outlined"
                                            fullWidth
                                            value={formData.name}
                                            name="name"
                                            error={!!errors.name}
                                            helperText={errors.name}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <InputLabel htmlFor="firstname" sx={{ marginBottom: 1 }}>Prénom</InputLabel>
                                        <TextField id="firstname"
                                            placeholder="John"
                                            variant="outlined"
                                            fullWidth
                                            value={formData.firstname}
                                            name="firstname"
                                            error={!!errors.firstname}
                                            helperText={errors.firstname}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                </Grid>
                                <Grid mt={errors.name || errors.firstname ? 0 : 2} mb={errors.school ? 0 : 2}>
                                    <InputLabel htmlFor="school" sx={{ marginBottom: 1 }}>Ecole</InputLabel>
                                    <Autocomplete id="school"
                                        variant="outlined"
                                        fullWidth
                                        options={schools}
                                        getOptionLabel={(option) => option.name}
                                        renderInput={(params) =>
                                            <TextField {...params}
                                                placeholder="Rechercher votre école"
                                                InputLabelProps={{ shrink: true }}
                                                inputProps={{
                                                    ...params.inputProps,
                                                    style: {
                                                        paddingTop: 0,
                                                    },
                                                }}
                                                error={!!errors.school}
                                                helperText={errors.school}
                                            />}
                                        renderOption={(props, option) => (
                                            <ListItem
                                                key={option.id}
                                                {...props}
                                                variant="school"
                                            >
                                                <ListItemText primary={option.name} />
                                            </ListItem>
                                        )}
                                        value={formData.school}
                                        onChange={handleChange}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                    />
                                </Grid>
                                <Grid container columnSpacing={6}>
                                    <Grid item xs={12} md={6}>
                                        <InputLabel htmlFor="email" sx={{ marginBottom: 1 }}>Email</InputLabel>
                                        <TextField id="email"
                                            placeholder="Doe"
                                            variant="outlined"
                                            fullWidth
                                            value={formData.email}
                                            name="email"
                                            error={!!errors.email}
                                            helperText={errors.email}
                                            onChange={handleChange}
                                            autoComplete="email"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <InputLabel htmlFor="tel" sx={{ marginBottom: 1 }}>Téléphone</InputLabel>
                                        <TextField id="tel"
                                            placeholder="06 .. .. .. .."
                                            variant="outlined"
                                            fullWidth
                                            value={formData.tel}
                                            name="tel"
                                            error={!!errors.tel}
                                            helperText={errors.tel}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                </Grid>

                                <Divider variant="lighter" sx={{ mb: 3, mt: errors.tel || errors.email ? 1 : 3 }} />

                                <Grid container columnSpacing={6}>
                                    <Grid item xs={12} md={6}>
                                        <InputLabel htmlFor="password" sx={{ marginBottom: 1 }}>Mot de passe</InputLabel>
                                        <PasswordInput id="password"
                                            variant="outlined"
                                            fullWidth
                                            password={formData.password}
                                            name="password"
                                            error={!!errors.password}
                                            helperText={errors.password}
                                            handlePassword={handleChange}
                                            autoComplete="new-password"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <InputLabel htmlFor="confirm-password" sx={{ marginBottom: 1 }}>Confirmer le mot de passe</InputLabel>
                                        <PasswordInput id="confirm-password"
                                            variant="outlined"
                                            fullWidth
                                            password={formData.confirmPassword}
                                            name="confirmPassword"
                                            error={!!errors.confirmPassword}
                                            helperText={errors.confirmPassword}
                                            handlePassword={handleChange}
                                            autoComplete="new-password"
                                        />
                                    </Grid>
                                </Grid>
                                <Typography sx={{ marginY: 2, fontSize: '0.8rem', fontStyle: 'italic', fontWeight: 'bolder', textAlign: 'center' }} >
                                    Le mot de passe doit contenir minimum 8 caractères, 1 chiffre, 1 majuscule et 1 caractère spécial
                                </Typography>

                                <Divider variant="lighter" sx={{ marginY: 3, marginX: 20 }} />

                                <Grid container>
                                    <Grid item xs={1} md={1}>
                                        <Checkbox
                                            sx={{
                                                color: !errors.checkbox ? "#DBA802" : 'red',
                                                '&.Mui-checked': {
                                                    color: "#DBA802",
                                                },
                                            }}
                                            name="checkbox"
                                            checked={formData.checkbox}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid item xs={11} md={11}>
                                        <Typography sx={{ fontSize: '0.8rem' }}>
                                            Je certifie avoir lu et approuvé les{" "}
                                            <Link href="/CGI/CGI_indiv.pdf" target="_blank" style={{ fontWeight: "600", color: "#DBA802", textDecorationColor: "#DBA802" }}>
                                                Conditions Générales d&apos;Inscription{" "}
                                            </Link>{" "}
                                            ou les{" "}
                                            <Link href="/CGI/CGI_delegations.pdf" target="_blank" style={{ fontWeight: "600", color: "#DBA802", textDecorationColor: "#DBA802" }}>
                                                CGI Délégations
                                            </Link>{" "}
                                            si mon école est une délégation.
                                        </Typography>
                                    </Grid>
                                </Grid>

                                <Grid container columnSpacing={6} sx={{ mt: 3 }}>
                                    <Grid item xs={12} md={6}>
                                        <Button variant="yellow_lighter" onClick={() => navigate('/')} fullWidth>Retour</Button>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Button variant="yellow" type="submit" fullWidth
                                            disabled={isSubmitting}
                                            onClick={handleSubmit}
                                        >
                                            {isSubmitting ? 'Envoi en cours...' : 'S\'inscrire'}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        </Grid>
                    </Grid>
                    <Grid item xs={12} md={5}
                        sx={{
                            backgroundImage: 'url(/images/register.jpeg)', // Remplacez chemin/vers/votre/image.jpg par le chemin réel de votre image
                            backgroundSize: 'cover', // Couvre toute la zone disponible sans perdre les proportions de l'image
                            backgroundPosition: 'center', // Centre l'image dans la zone disponible
                            display: 'flex',
                            flexDirection: 'column', // Organise les enfants en colonne
                            justifyContent: 'center', // Centre verticalement
                            alignItems: 'center', // Centre horizontalement
                        }}
                    >

                    </Grid>
                </Grid >
            </Box>
        </LayoutUnauthenticated >
    )
}


export default Register;