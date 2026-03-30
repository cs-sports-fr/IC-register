import { useNavigate } from "react-router-dom";
import LayoutUnauthenticated from "../components/layouts/LayoutUnauthenticated";
import { useSnackbar } from "../provider/snackbarProvider";
import { Box, Button, Divider, Grid, InputLabel, TextField, Typography } from "@mui/material";
import { useState } from "react";
import * as yup from 'yup';
import { ApiTossNotConnected } from "../service/axios";

const ForgotPassword = () => {

    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const isDarkMode = true;

    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");

    const handleChangeEmail = (text) => {
        setEmail(text.target.value);
    }

    const validationSchema = yup.object().shape({
        email: yup.string().required('L\'email est obligatoire').email('L\'email n\'est pas valide'),
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Valider les données du formulaire
            await validationSchema.validate({ email: email }, { abortEarly: false });
            setEmailError(""); // Réinitialiser les erreurs

            // Envoyer les données du formulaire
            ApiTossNotConnected.post("/password-reset-request?email=" + email).then(() => {
                showSnackbar("Un email de réinitialisation de mot de passe a été envoyé.", 3000, "success")
                navigate("/");
            }).catch(() => {
                showSnackbar("L'email n'existe pas.", 3000, "error")
            });

        } catch (error) {
            if (error instanceof yup.ValidationError) {
                setEmailError(error.inner[0].message);
            }
        }
    }


    return (
        <LayoutUnauthenticated isDarkMode={isDarkMode}>
            <Grid container spacing={2} height={'102vh'}>
                <Grid item md={6} xs={12} sx={{ textAlign: 'center', alignSelf: "center" }}> {/* xs={12} md={6} pour responsive a faire */}
                    <Grid py={'10vh'} px={'22%'} sx={{}}>
                        <Typography variant="h1" sx={{ fontSize: '2rem', fontWeight: 'bold' }}>Mot de passe oublié ?</Typography>
                        <Divider variant="lighter" sx={{ my: 4, mx: 8 }} />
                        <form
                            onSubmit={handleSubmit}
                        >
                            <Box sx={{ justifyContent: 'left', textAlign: 'left' }}>
                                <InputLabel htmlFor="email" sx={{ marginBottom: 1 }}>Email</InputLabel>
                                <TextField id="email"
                                    placeholder="toss@cs-sports.fr"
                                    variant="outlined"
                                    value={email}
                                    onChange={handleChangeEmail}
                                    fullWidth
                                    autoComplete="email"
                                    error={!!emailError}
                                    helperText={emailError}
                                />
                            </Box>
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                sx={{ mt: 2 }}
                                type="submit"
                            >
                                Réinitialiser le mot de passe
                            </Button>
                            <Button
                                onClick={() => navigate("/")}
                                variant="lighter"
                                fullWidth
                                sx={{ mt: 2 }}
                            >
                                Retour au site
                            </Button>
                        </form>
                    </Grid>
                </Grid>
                <Grid item md={6} xs={12}
                    sx={{
                        backgroundImage: 'url(/images/soiree.jpeg)', // Remplacez chemin/vers/votre/image.jpg par le chemin réel de votre image
                        backgroundSize: 'cover', // Couvre toute la zone disponible sans perdre les proportions de l'image
                        backgroundPosition: 'center', // Centre l'image dans la zone disponible
                        display: 'flex',
                        flexDirection: 'column', // Organise les enfants en colonne
                        justifyContent: 'center', // Centre verticalement
                        alignItems: 'center', // Centre horizontalement
                    }}
                >
                    <Typography variant="login" sx={{ fontSize: '6rem', textAlign: 'center' }}>ESPACE PARTICIPANT</Typography>
                </Grid>
            </Grid>


        </LayoutUnauthenticated >
    );
}

export default ForgotPassword;