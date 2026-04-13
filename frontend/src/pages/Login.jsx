import { useNavigate } from "react-router-dom";
import { useAuth } from "../provider/authProvider";
import { useState } from "react";
import { Box, Button, Grid, InputLabel, Link, TextField, Typography, CircularProgress } from "@mui/material";
// eslint-disable-next-line no-unused-vars
import { validateEmail } from "../service/validation";
import { ApiICNotConnected } from "../service/axios";
import { useSnackbar } from "../provider/snackbarProvider";
import DividerText from "../components/DividerText";
import LayoutUnauthenticated from "../components/layouts/LayoutUnauthenticated";

const Login = () => {
    const { setToken } = useAuth();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();

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

    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (event) => {
        event.preventDefault();
        
        if (!validateEmail(email)) {
            setEmailError("Veuillez entrer une adresse e-mail valide.");
            showSnackbar("Veuillez entrer une adresse e-mail valide.", 3000, "error");
        } else if (password === "") {
            setPasswordError("Veuillez entrer un mot de passe valide.");
            showSnackbar("Veuillez entrer un mot de passe valide.", 3000, "error");
        } else {
            setEmailError("");
            setPasswordError("");
            setIsLoading(true); // Set loading state to true
            
            try {
                const formData = new FormData();
                formData.append('username', email);
                formData.append('password', password);
                
                const response = await ApiICNotConnected.post(
                    "/login", 
                    formData, 
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
                
                await setToken(response.data.access_token);
                showSnackbar("Connexion réussie.", 3000, "success");

                setTimeout(() => {
                    window.location.reload();
                }, 500);
                
            } catch (e) {
                console.log(e);
                showSnackbar("Identifiants incorrects.", 3000, "error");
            } finally {
                setIsLoading(false);
            }
        }
    };
    const isDarkMode = true;


    return (
        <LayoutUnauthenticated isDarkMode={isDarkMode}>
            <Grid container spacing={2} height={'102vh'}>
                <Grid item md={6} xs={12} sx={{ textAlign: 'center', alignSelf: "center" }}> {/* xs={12} md={6} pour responsive a faire */}
                    <Grid py={'10vh'} px={'22%'} sx={{}}>
                        <Typography variant="h1" sx={{ fontSize: '7rem', fontWeight: 'bold' }}>IC</Typography>
                        <DividerText text="Connexion" />
                        <Box m={'1vw'}>
                            <form onSubmit={handleLogin}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left' }}>
                                        <InputLabel htmlFor="email" sx={{ marginBottom: 1 }}>Email</InputLabel>
                                        <TextField id="email"
                                            placeholder="ic@cs-sports.fr"
                                            variant="outlined"
                                            value={email}
                                            onChange={handleChangeEmail}
                                            fullWidth
                                            autoComplete="email"
                                            error={!!emailError}
                                            helperText={emailError}
                                        />
                                    </Box>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left' }}>
                                        <InputLabel htmlFor="password" sx={{ marginBottom: 1 }} >Mot de passe</InputLabel>
                                        <TextField id="password"
                                            variant="outlined"
                                            type="password"
                                            value={password}
                                            onChange={handleChangePassword}
                                            fullWidth
                                            autoComplete="current-password"
                                            error={!!passwordError}
                                            helperText={passwordError}
                                        />
                                    </Box>
                                    <Link href="/forgot-password" underline="hover" sx={{ textAlign: 'left' }}>Mot de passe oublié ?</Link>
                                    <Button 
                                        type="submit" 
                                        fullWidth
                                        disabled={isLoading}
                                        sx={{
                                            position: 'relative',
                                        }}
                                    >
                                        {isLoading ? (
                                            <>
                                                <CircularProgress 
                                                    size={24} 
                                                    color="inherit" 
                                                    sx={{ 
                                                        position: 'absolute',
                                                        left: '50%',
                                                        marginLeft: '-12px'
                                                    }} 
                                                />
                                                <span style={{ visibility: 'hidden' }}>Se connecter</span>
                                            </>
                                        ) : (
                                            'Se connecter'
                                        )}
                                    </Button>                                
                                    </Box>
                            </form>
                        </Box>
                        <DividerText text="Autres" />
                        <Box m={2} >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                <Link href="/charte" sx={{ width: '100%', mr: 1 }}><Button fullWidth>Signer la charte</Button></Link>
                                <Link href="/register" sx={{ width: '100%', ml: 1 }}><Button fullWidth>Inscription</Button></Link>
                            </Box>
                            <Button href="https://www.cs-sports.fr/ic/" variant="lighter" sx={{ mt: 2, width: '100%' }}>Retour au site</Button>
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
};

export default Login;