import { Box, Typography, Button, IconButton } from "@mui/material";
import Navbar from "../../components/navbar/Navbar";
import AdvancementBar from "../../components/register-team/AdvancementBar";
import SelectSport from "../../components/register-team/SelectSport";
import { routesForUser } from "../../routes/routes";
import { useEffect, useState } from "react";
import RegisterTeam from "../../components/register-team/RegisterTeam";
import { ApiICConnected } from "../../service/axios";
import axios from "axios";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Onboarding component
const Onboarding = ({ onFinish }) => {
    const [slideIndex, setSlideIndex] = useState(0);

    // Customize the slides with different content types (text, title, image, etc.)
    const slides = [
        {
            title: "Bienvenue sur le site d'inscription !",
            content: "Lisez attentivement les instructions pour inscrire votre équipe au TOSS.",
            image: null,
        },
        {
            title: "Le processus d'inscription",
            content: "Votre équipe passera par différentes étapes jusqu'à la validation finale de l'inscription.",
            image: null,
        },
        {
            title: "1. Dossier Incomplet",
            content: "Une fois votre équipe créée, son statut initial est 'Dossier Incomplet'. Vous devrez fournir les certificats médicaux ou attestations de chaque participant·e !",
            content2: "Chaque participant·e devra aussi valider la charte d'inscription reçue par mail. ",
            content3: "Le·a responsable de votre sport vérifiera votre dossier sous 48h pour le valider.",
            image: null,
        },
        {
            title: "2. En liste d'attente",
            content: "Après avoir complété votre dossier, votre équipe passe en 'Liste d'attente'. ",
            content2: "Vous serez contacté·es dès lors que votre équipe sera sélectionnée. ",
            image: null,
        },
        {
            title: "3. Sélectionné·e",
            content: "Si votre équipe est sélectionnée, elle passe en 'Sélectionné.e'. ",
            content2: "Vous devez alors procéder au paiement pour confirmer votre participation.",
            image: null,
        },
        {
            title: "4. Inscrit·e",
            content: "Une fois le paiement effectué, votre équipe obtient le statut 'Inscrit.e'. ",
            content2: "Vous êtes officiellement inscrit·es au tournoi !",
            image: null,
        },
        {
            title: "Prêt·e à commencer ?",
            content: "Choisissez un sport et suivez les instructions pour inscrire votre équipe.",
            image: null,
        }
    ];

    const nextSlide = () => {
        if (slideIndex < slides.length - 1) {
            setSlideIndex(slideIndex + 1);
        } else {
            onFinish();  // Finish the onboarding process
        }
    };
    const previousSlide = () => {
        if (slideIndex > 0) {
            setSlideIndex(slideIndex - 1);
        }
    };

    return (
        <Box sx={{ bgcolor: 'background.paper', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <Box sx={{height: '25vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>   
            {slides[slideIndex].title && (
                <Typography variant="h5" align="center" sx={{ mb: 2, fontWeight:'bold', fontSize:40 }}>
                    {slides[slideIndex].title}
                </Typography>
            )}
            <Typography variant="h6" align="center" sx={{ mb: 1 }}>
                {slides[slideIndex].content}
            </Typography>
            <Typography variant="h6" align="center" sx={{ mb: 1 }}>
                {slides[slideIndex].content2}
            </Typography>
            <Typography variant="h6" align="center" sx={{ mb: 1 }}>
                {slides[slideIndex].content3}
            </Typography>
            {slides[slideIndex].image && (
                <img src={slides[slideIndex].image} alt="Slide image" />
            )}
            
            </Box>
            <Box>
            {slideIndex == 0 ?
                <Button onClick={nextSlide} variant="contained" sx={{ width: '12rem' }}>
                C'est parti !
                </Button>
            :
                    slideIndex < slides.length - 1 ? 
                <Box>
                    <IconButton onClick={previousSlide} sx={{color:'primary.main'}} >
                        <ArrowBackIcon />
                    </IconButton>
                    <IconButton onClick={nextSlide} sx={{color:'primary.main'}} >
                        <ArrowForwardIcon />
                    </IconButton>
                    
                </Box>
            :                             
            <Button onClick={nextSlide} variant="contained" sx={{ width: '12rem' }}>
            Commencer l'inscription           
            </Button>}           
            </Box>
            
        </Box>
    );
};
const RespoDelegRegisterTeam = () => {
    const [config, setConfig] = useState({
        isRegistrationOpen: false,
        isPaymentOpen: false,
        expectedRegistrationDate: null,
    });

    const [sports, setSports] = useState([]);
    const [sportId, setSportId] = useState(null);
    const [isSportCollective, setIsSportCollective] = useState(null);
    const [onboardingComplete, setOnboardingComplete] = useState(false);  // New state

    const fetchData = () => {
        const endpoints = ['/sports'];
        axios.all(endpoints.map(url => ApiICConnected.get(url)))
            .then(axios.spread((...responses) => {
                setSports(responses[0].data);
            })).catch((error) => {
                console.log(error);
            });
    };

    const fetchConfig = () => {
        ApiICConnected.get('/config')
            .then((response) => {
                setConfig(response?.data);
            }).catch((error) => {
                console.log(error);
            });
    };

    useEffect(() => {
        fetchData();
        fetchConfig();
    }, []);

    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const registrationDate = new Date(config?.expectedRegistrationDate);
            const difference = registrationDate - now;

            if (difference <= 0) {
                clearInterval(countdownInterval);
                fetchConfig();
                setCountdown('');
                return;
            }
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            setCountdown(`${days} jours ${hours} heures ${minutes} minutes ${seconds} secondes`);
        };
        const countdownInterval = setInterval(updateCountdown, 1000);
        return () => clearInterval(countdownInterval);
    }, [config?.expectedRegistrationDate]);

    return (
        <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ overflowX: 'hidden' }}>
            {/* // Navbar */}
            <Navbar navigation={routesForUser} />

            {/* // Barre d'avancement */}
            <AdvancementBar sportSelected={sportId} isCollective={isSportCollective} resetCallback={() => { setSportId(null); setIsSportCollective(null) }} />

            {/* // Page d'inscription d'une équipe */}
            <Box flexGrow={1} display={'flex'}>
                {onboardingComplete ? (  // Show onboarding or registration form based on state
                    config?.isRegistrationOpen ? (
                        <>
                            {sportId == null && <SelectSport callback={(id) => setSportId(id)} sports={sports} callbackType={(bool) => setIsSportCollective(bool)} isCollective={isSportCollective} />}
                            {sportId !== null && <RegisterTeam sport={sportId} />}
                        </>
                    ) : (
                        <Box sx={{ bgcolor: 'background.drawer', width: '100%', display: 'flex', justifyContent: 'center', textAlign: 'center', flexDirection: 'column' }}>
                            <Typography variant="h4" align="center">Les inscriptions sont fermées</Typography>
                            {config?.expectedRegistrationDate && <Typography variant="h6" align="center">Ouverture des inscriptions dans {countdown}</Typography>}
                        </Box>
                    )
                ) : (
                    <Onboarding onFinish={() => setOnboardingComplete(true)} />  // Onboarding component
                )}
            </Box>
        </Box>
    );
};

export default RespoDelegRegisterTeam;
