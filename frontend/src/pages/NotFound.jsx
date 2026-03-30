import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';


const NotFoundPage = () => {
    const navigation = useNavigate();

    const handleRedirect = () => {
        navigation('/', { replace: true });
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                backgroundImage: `url(images/soiree.jpeg)`,
                backgroundSize: 'cover',
            }}
        >
            <Box
                sx={{
                    textAlign: 'center',
                    maxWidth: '50%',
                    backgroundColor: (theme) => alpha(theme.palette.background.drawer, 0.7),
                    borderRadius: '1rem',
                    padding: '1rem',
                }}
            >
                <Typography variant="h1" sx={{
                    fontSize: { xs: '2rem', md: '3rem', lg: '4rem' },
                    marginBottom: '1rem'
                }}>
                    Erreur 4<img src='images/logo_toss_light.png' alt="logo" style={{ width: { xs: '2rem', md: '3rem', lg: '4rem' }, height: '3rem', paddingTop: '1rem' }} />4 :
                </Typography>
                <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '3rem', lg: '4rem' }, marginBottom: '1rem' }}>
                    Cette page n&apos;existe pas
                </Typography>
                <Button variant="contained" color="primary" onClick={handleRedirect} startIcon={<ArrowBack />} sx={{ marginTop: '1rem' }}>
                    Retourner à l&apos;accueil
                </Button>
            </Box>
        </Box>
    );
};

export default NotFoundPage;
