import { Box, Button, Grid, InputLabel, TextField, Typography, Checkbox, FormControlLabel, FormHelperText } from "@mui/material";
import DividerText from "../components/DividerText";
import { useState } from "react";
import { useSnackbar } from "../provider/snackbarProvider";
import { useNavigate } from "react-router-dom";
import { validateEmail } from "../service/validation";
import { ApiICNotConnected } from "../service/axios";
import LayoutUnauthenticated from "../components/layouts/LayoutUnauthenticated";


function Chartes() {
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const [insuranceAgreed, setInsuranceAgreed] = useState(false);
    const [insuranceError, setInsuranceError] = useState("");
    const isDarkMode = true;

    const handleInsuranceChange = (event) => {
        setInsuranceAgreed(event.target.checked);
        if (event.target.checked) {
            setInsuranceError("");
        }
    };
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const handleChangeEmail = (text) => {
        setEmail(text.target.value);
    }

    const handleChangePassword = (text) => {
        setPassword(text.target.value);
    };

    const handleSign = (event) => {
        event.preventDefault();
        let hasError = false;

        if (!validateEmail(email)) {
            setEmailError("Veuillez entrer une adresse e-mail valide.");
            showSnackbar("Email : veuillez entrer une adresse e-mail valide.", 5000, "error");
            hasError = true;
        } else {
            setEmailError("");
        }

        if (password === "") {
            setPasswordError("Veuillez entrer le mot de passe de la charte.");
            if (!hasError) showSnackbar("Mot de passe : ce champ est obligatoire.", 5000, "error");
            hasError = true;
        } else {
            setPasswordError("");
        }

        if (!insuranceAgreed) {
            setInsuranceError("Vous devez attester avoir une assurance personnelle pour continuer.");
            if (!hasError) showSnackbar("Assurance : vous devez cocher la case avant de signer.", 5000, "error");
            hasError = true;
        } else {
            setInsuranceError("");
        }

        if (hasError) return;

        ApiICNotConnected.post('/teams/participant/sign-charte?email=' + email.toLowerCase() + '&charte_password=' + password)
            .then(() => {
                showSnackbar("Charte signée avec succès !", 3000, "success");
                navigate("/");
            }).catch((e) => {
                console.log(e);
                if (!e.response) {
                    showSnackbar("Impossible de contacter le serveur. Vérifiez votre connexion puis réessayez.", 7000, "error");
                } else if (e.response.status === 403) {
                    showSnackbar("Mot de passe incorrect. Vérifiez le mot de passe fourni par email.", 7000, "error");
                } else if (e.response.status === 404) {
                    showSnackbar("Aucun compte trouvé avec cet email. Vérifiez l'adresse saisie.", 7000, "error");
                } else {
                    showSnackbar(`Une erreur est survenue (code ${e.response.status}). Réessayez ou contactez un membre de l'organisation du TOSS.`, 7000, "error");
                }
            });
    };

    const handleReadCharte = () => {
        window.open('./Charte/[TOSS 2026] Charte_participant.pdf', '_blank');
    }
    const handleReadCGI = () => {
        window.open('./CGI/CGI_indiv.pdf', '_blank');
    }

    return (
        <LayoutUnauthenticated isDarkMode={isDarkMode}>
            <Grid container spacing={2} height={'102vh'}>
                <Grid item md={6} xs={12} sx={{ textAlign: 'center', alignSelf: "center" }}>
                    <Grid py={'10vh'} px={'25%'} sx={{}}>
                        <Typography sx={{ fontSize: '2rem', fontWeight: 'bold', mb: 1.5, letterSpacing: '0.001rem' }}>CHARTE INDIVIDUELLE DU TOSS et CGI</Typography>
                        <Box m={'1vw'}><Button fullWidth onClick={handleReadCharte}>Consulter la charte</Button></Box>
                        <Box m={'1vw'}><Button fullWidth onClick={handleReadCGI}>Consulter les CGI</Button></Box>

                        <DividerText text="Signer la charte et accepter les CGI" />
                        <Box m={'1vw'}>
                            <form onSubmit={handleSign}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 0.5 }}>
                                        <InputLabel htmlFor="password" sx={{ marginBottom: 1 }} >Mot de passe charte</InputLabel>
                                        <TextField id="passwordCharte"
                                            variant="outlined"
                                            value={password}
                                            onChange={handleChangePassword}
                                            fullWidth
                                            placeholder="ksSD82Fs"
                                            error={!!passwordError}
                                            helperText={passwordError}
                                        />
                                    </Box>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 0.5 }}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox 
                                                    checked={insuranceAgreed}
                                                    onChange={handleInsuranceChange}
                                                    name="insuranceAgreed"
                                                    color="primary"
                                                />
                                            }
                                            label="Je m'engage à avoir une assurance personnelle permettant de couvrir les dommages corporels. "
                                        />
                                        {!!insuranceError && (
                                            <FormHelperText error>{insuranceError}</FormHelperText>
                                        )}
                                    </Box>
                                                                        
                                    <Button type="submit" fullWidth>Signer la charte et accepter les CGI </Button>
                                    <Button href="/" variant="lighter" fullWidth >Retour</Button>

                                </Box>
                            </form>
                        </Box>
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
                    {/* <Box sx={{ mt: 'auto', display: 'block' }}>
                        <Typography variant="body1">&ldquo;On peut mettre une quote ici si jamais.&rdquo;</Typography>
                        <Typography variant="caption">Sofia Davis</Typography>
                    </Box> */}
                </Grid>
            </Grid>
        </LayoutUnauthenticated>
    );
}

export default Chartes;
