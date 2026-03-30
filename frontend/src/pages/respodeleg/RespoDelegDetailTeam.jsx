import { Box, Typography,Alert } from "@mui/material";
import Navbar from "../../components/navbar/Navbar";
import { routesForUser } from "../../routes/routes";
import { useEffect, useState } from "react";
import axios from "axios";
import { ApiTossConnected } from "../../service/axios";
import * as yup from 'yup';
import { useSnackbar } from "../../provider/snackbarProvider";
import PlayerList from "../../components/team/ParticipantsList";
import ModifyParticipants from "../../components/team/ModifyParticipant";
import { useLocation } from "react-router-dom";
import { parseTeam } from "../../utils/parseTeam";
import AddParticipant from "../../components/team/AddParticipant";



const RespoDelegDetailTeam = () => {

    const [team, setTeam] = useState();
    const teamId = useLocation().pathname.split('/').pop();

    const { showSnackbar } = useSnackbar();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerOpenAdd, setDrawerOpenAdd] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState(null);

    const handleModifyParticipant = (id) => {
        const nextParticipant = team.participants.find(participant => participant.id === id);
        if (drawerOpen) {
            setDrawerOpen(false);
            setSelectedParticipant(null);
            setTimeout(() => {
                setSelectedParticipant(nextParticipant);
                setDrawerOpen(true);
            }, 0);
            return;
        }
        setSelectedParticipant(nextParticipant);
        setDrawerOpen(true);
    }
    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedParticipant(null);
        setErrors({})
    }

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
        setSelectedParticipant(prev => ({ ...prev, [name]: value }))
    }
    const handleCheckboxChange = (goodieId, checked) => {
        const updatedGoodies = checked
            ? [...selectedParticipant.productsIds, goodieId]
            : selectedParticipant.productsIds.filter(id => id !== goodieId);
        setSelectedParticipant({ ...selectedParticipant, productsIds: updatedGoodies });
    };

    const fieldLabelMap = {
        email: 'Email',
        lastname: 'Nom',
        firstname: 'Prénom',
        dateOfBirth: 'Date de naissance',
        gender: 'Genre',
        packId: 'Pack',
        mailHebergeur: 'Email hébergeur',
    };

    //** Validation de données */
    const playerSchema = yup.object().shape({
        email: yup.string().email('Email invalide').required('Email requis'),
        lastname: yup.string().required('Nom requis'),
        firstname: yup.string().required('Prénom requis'),
        dateOfBirth: yup.date().required('Date de naissance requise'),
        gender: yup.string().required('Genre requis'),
        packId: yup.number().required('Pack requis'),
        mailHebergeur: yup.string().email('Email invalide').when(['packId'], {
            is: (packId) => packId == '5' || packId == '6' || packId == '11' || packId == '12', // Vérifie si packId est un des rez
            then: schema => schema.email("Email invalide").required("Email de l'hébergeur requis"),  // Rend emailHebergeur obligatoire si la condition est vraie
            otherwise: schema => schema.notRequired() // Rend emailHebergeur non obligatoire si la condition est fausse
        })
    });

    const [errors, setErrors] = useState({});
    const handleSubmit = async (event) => {
        event.preventDefault()
        try {
            await playerSchema.validate(selectedParticipant, { abortEarly: false });
            setErrors({});
            const payload = { ...selectedParticipant, email: selectedParticipant.email ? selectedParticipant.email.toLowerCase() : selectedParticipant.email };
            ApiTossConnected.put('teams/' + teamId + '/participant/' + selectedParticipant.id, payload)
                .then(() => {
                    handleCloseDrawer();
                    fetchData();
                    showSnackbar('Modification réussie', 3000, 'success');
                })
                .catch((err) => {
                    console.log(err);
                    const detail = err?.response?.data?.detail;
                    const message = err?.response?.data?.message;
                    const status = err?.response?.status;

                    let snackMessage;
                    if (!err?.response) {
                        snackMessage = "Impossible de contacter le serveur. Vérifiez votre connexion puis réessayez.";
                    } else if (typeof detail === 'string' && detail.trim()) {
                        snackMessage = `Erreur (${status}) : ${detail}`;
                    } else if (Array.isArray(detail) && detail.length > 0) {
                        const formatted = detail.map(item => typeof item === 'string' ? item : item?.msg || JSON.stringify(item)).join(' | ');
                        snackMessage = `Erreur (${status}) : ${formatted}`;
                    } else if (typeof message === 'string' && message.trim()) {
                        snackMessage = `Erreur (${status}) : ${message}`;
                    } else {
                        snackMessage = `Une erreur est survenue lors de la modification (code ${status}).`;
                    }
                    showSnackbar(snackMessage, 7000, 'error');
                });
        }
        catch (err) {
            const newErrors = {};
            if (err.inner) {
                err.inner.forEach((error) => {
                    newErrors[error.path] = error.message;
                });
                const firstError = err.inner[0];
                const fieldLabel = fieldLabelMap[firstError.path] || firstError.path;
                showSnackbar(`${fieldLabel} : ${firstError.message}`, 7000, 'error');
            }
            setErrors(newErrors);
        }
    }

    
    const PlayerListHeader =
    <></>
    /*
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', my: 2.5 }}>
            <Box sx={{ width: '15%', mr: 2.5 }}>
                <Button disabled={team?.participants?.length >= team?.sport?.nbPlayersMax} onClick={() => setDrawerOpenAdd(true)}>Ajouter un joueur</Button>
            </Box>
        </Box>
    */

    return (
        <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ overflowX: 'hidden', backgroundColor: 'background.drawer' }}>
            {/* // Navbar */}
            <Navbar navigation={routesForUser} />

            <Box >
                <Box sx={{ ml: 5, mt: 5 }}>
                    <Typography variant={'h4'} sx={{ mb: 1 }}>Détail de l&apos;équipe : {team?.name} ({team?.sport?.sport})</Typography>
                    <Typography variant={'h6'}>{team?.status == "Incomplete" ? "Le dossier d'inscription n'est pas encore finalisé." : team?.status == "PrincipalList" ? "L'équipe a été sélectionnée." : team?.status == "Validated" ? "L'équipe est inscrite." : "L'équipe est actuellement en liste d'attente."}</Typography>
                </Box>
                 {/* Add alert for incomplete registration */}
            {team?.status == "Incomplete"  && (

                <Box sx={{ mx: 5, mt: 2, display:'flex',flexDirection: 'column', gap: 2 }}>
                    <Alert severity="info">
                    Une fois toutes les pièces transmises et la charte signée, comptez un délai de 48h pour que votre dossier soit vérifié et actualisé par le·la responsable de votre sport !
                    </Alert>
{[12, 25, 26].includes(team?.sportId) && (
    <Alert severity="error">
        Pour vous inscrire dans ce sport en particulier, il est obligatoire de fournir un certificat médical qui datera de <span style={{ fontWeight: "bold" }}>MOINS DE 1 AN</span> le 8-10 mai avec la mention <span style={{ fontWeight: "bold" }}>"votre sport en compétition"</span> que vous mettez en ligne.
    </Alert>
)}
                     
{[3, 4, 5, 6, 7, 9, 10, 13, 16, 19, 20, 17, 21, 22, 23, 24, 27, 28, 29, 30, 8, 32, 33, 34, 11, 18, 31].includes(team?.sportId) && (
    <Alert severity="error">       
        Vous avez deux options ! <br /> <br />
        1.&nbsp;Vous avez un certificat médical qui datera de <span style={{ fontWeight: "bold" }}>MOINS DE 1 AN</span> le 8-10 mai avec la mention <span style={{ fontWeight: "bold" }}>"pratique sportive en compétition"</span> que vous mettez en ligne. 
        <br /><br />
        2.&nbsp; Vous n'avez pas de certificat médical. Vous téléchargez le&nbsp;
  <a href="https://www.formulaires.service-public.fr/gf/cerfa_15699.do" 
     target="_blank" 
     rel="noopener noreferrer">
    CERFA
  </a> ! Si vous avez répondu OUI à une question OU PLUS il faut un certificat médical qui datera de <span style={{ fontWeight: "bold" }}>MOINS DE 1 AN</span> le 8-10 mai avec la mention <span style={{ fontWeight: "bold" }}>"pratique sportive en compétition"</span>. 
  Dans le cas contraire, vous téléchargez&nbsp; 
  <a href="https://toss-images.s3.eu-west-3.amazonaws.com/documents/Attestation+CERFA+-+2026.pdf" 
     target="_blank" 
     rel="noopener noreferrer">
    l'attestation de santé
  </a> où vous indiquez votre <span style={{fontWeight:"bold"}}> nom, prénom, signature manuscrite et la date !  </span>              
  <br /><br />
  Vous ne mettez en ligne que le certficat médical ou l'attestation de santé en fonction de votre situation. <strong>PAS DE CERFA !</strong>
    </Alert>
)}
             


{team?.participants && team.participants.some(participant => 
            [1, 6].includes(participant.packId)
        ) && (
            <Alert severity="error">
                Pour le logement chez un·e ami·e ! <br /> <br />
            Ton hébergeur et toi-même avez reçu des mails contenant toutes les informations. N'hésite pas à rappeler à ton hébergeur de signer l'accord d'hébergement demandé dans le mail qu'il·elle a reçu sans quoi ton inscription au TOSS ne peut être validée.         
            </Alert>
        )}


                </Box>
            )}
            {team?.status == "Waiting"  && (
                <Box sx={{ mx: 5, mt: 2, display:'flex',flexDirection: 'column', gap: 2 }}>
                    <Alert severity="info"> 
                    Votre dossier a bien été complété ! Vous êtes désormais en liste d'attente, vous serez contacté dés qu'une place vous sera attribuée !
                    </Alert>               
                </Box>
            )}
            {team?.status == "PrincipalList"  && (
                <Box sx={{ mx: 5, mt: 2, display:'flex',flexDirection: 'column', gap: 2 }}>
                    <Alert severity="info">
                    Votre place est réservée, il ne vous reste plus qu’à régler les frais d’inscription pour confirmer votre participation.                    
                    </Alert>
                </Box>
            )}

            {team?.status == "Validated"  && (
                <Box sx={{ mx: 5, mt: 2, display:'flex',flexDirection: 'column', gap: 2 }}>
                    <Alert severity="info">
                    Toutes les démarches sont finalisées, vous êtes officiellement inscrit·es au tournoi.
                    </Alert>            
                </Box>
            )}  

            
                <Box sx={{ m: 5 }}>
                    <PlayerList
                        headerItem={PlayerListHeader}
                        columns={getColumns(team?.sport?.sport === 'Golf')}
                        players={team?.participants}
                        modify={team?.status == "Incomplete"}
                        onModify={handleModifyParticipant}
                        teamId={teamId}
                        resendCharterEmail={false}
                        allowDocumentValidation={true}
                        showLicenceValidation={team?.sport?.sport === 'Golf'}
                    />
                </Box>
            </Box>

            <ModifyParticipants
                key={selectedParticipant?.id ?? 'no-participant'}
                open={drawerOpen}
                onClose={handleCloseDrawer}
                participant={selectedParticipant}
                setSelectedParticipant={setSelectedParticipant}
                packs={packs}
                goodies={goodies}
                errors={errors}
                handleSubmit={handleSubmit}
                handleChange={handleChange}
                handleCheckboxChange={handleCheckboxChange}
                deleteEnabled={team?.participants?.length > team?.sport?.nbPlayersMin && selectedParticipant?.isCaptain === false}
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
    { label: "Logement chez un·e ami·e validé", align: "center", name: "logementRezOk", type: "booleanrez" },
    { label: "Certificat | Attestation Ajouté", align: "center", name: "certif", type: "document", fileField: "certificateLink", routeSegment: "certificate" },
    { label: "Certificat | Attestation Validé", align: "center", name: "certificateOK", type: "boolean" },
    ...(isGolf ? [
        { label: "Numéro de licence", align: "center", name: "licenceID" },
        { label: "Licence PDF ajoutée", align: "center", name: "licencePdf", type: "document", fileField: "licenceLink", routeSegment: "licence" },
        { label: "Licence validée", align: "center", name: "licenceOK", type: "boolean" },
    ] : []),
    { label: "Pack", align: "center", name: "packname" },
    { label: "Prix", align: "center", name: "price" },
]

export default RespoDelegDetailTeam;


