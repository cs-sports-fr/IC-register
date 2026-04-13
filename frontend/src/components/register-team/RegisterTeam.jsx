import { Autocomplete, Alert,Box, Button, Checkbox, Divider, Grid, InputLabel, ListItem, ListItemText, TextField, Typography,Tooltip, Select, MenuItem, FormControl, FormHelperText } from "@mui/material";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/fr';
import gender from "../../assets/gender.json";
import classementTennis from "../../assets/classementTennis.json";
import armevoeux from "../../assets/armevoeux.json";
import allergies from "../../assets/allergies.json";
import { ApiICConnected } from "../../service/axios";
import axios from "axios";
import * as yup from 'yup';
import { useSnackbar } from "../../provider/snackbarProvider";
import { Warning } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { parseRegisterTeamRequest } from "../../utils/parseRequestRegisterTeam";
import dayjs from "dayjs";
import InfoIcon from '@mui/icons-material/Info'; 
import CheckIcon from '@mui/icons-material/Check';

const RegisterTeam = ({ sport }) => {
    const { showSnackbar } = useSnackbar();

    const fieldLabelMap = {
        teamName: "Nom de l'equipe",
        teamLevel: "Niveau de l'equipe",
        email: "Email",
        lastname: "Nom",
        firstname: "Prenom",
        dateOfBirth: "Date de naissance",
        gender: "Genre",
        packId: "Pack",
        mailHebergeur: "Email hebergeur",
        swimming50mEventId: "Epreuve 50m",
        swimming100mEventId: "Epreuve 100m",
        licenceID: "Numero de licence",
        armeVoeu1: "Voeu 1",
        armeVoeu2: "Voeu 2",
        armeVoeu3: "Voeu 3",
        mobile: "Numero de telephone",
        allergies: "Allergies",
    };

    const getFieldDisplayName = (path) => {
        const playerFieldMatch = path?.match(/^players\[(\d+)\]\.(.+)$/);
        if (playerFieldMatch) {
            const playerIndex = Number(playerFieldMatch[1]) + 1;
            const fieldName = playerFieldMatch[2];
            const fieldLabel = fieldLabelMap[fieldName] || fieldName;
            return `Joueur n°${playerIndex} - ${fieldLabel}`;
        }

        return fieldLabelMap[path] || path;
    };

    const getValidationSnackbarMessage = (validationError) => {
        if (!validationError?.inner?.length) {
            return "Le formulaire contient des erreurs. Verifiez les champs en rouge.";
        }

        const firstError = validationError.inner[0];
        const fieldDisplay = getFieldDisplayName(firstError.path);
        return `${fieldDisplay} : ${firstError.message}`;
    };

    const getApiSnackbarMessage = (error) => {
        const detail = error?.response?.data?.detail;
        const message = error?.response?.data?.message;
        const status = error?.response?.status;

        if (!error?.response) {
            return "Impossible de contacter le serveur. Verifiez votre connexion puis reessayez.";
        }

        if (detail === "A team with this name already exists") {
            return "Une equipe avec ce nom existe deja. Choisissez un autre nom d'equipe.";
        }

        if (typeof detail === 'string' && detail.includes("duplicate swimming event")) {
            return "Plusieurs participants ne peuvent pas etre assignes a la meme epreuve de natation.";
        }

        if (typeof detail === 'string' && detail.trim()) {
            return `Erreur serveur (${status}) : ${detail}`;
        }

        if (Array.isArray(detail) && detail.length > 0) {
            const formattedDetails = detail
                .map((item) => (typeof item === 'string' ? item : item?.msg || JSON.stringify(item)))
                .join(' | ');
            return `Erreur serveur (${status}) : ${formattedDetails}`;
        }

        if (typeof message === 'string' && message.trim()) {
            return `Erreur serveur (${status}) : ${message}`;
        }

        return `Une erreur est survenue lors de l'inscription (code ${status}).`;
    };

    const [teamName, setTeamName] = useState("");
    const [teamLevel, setTeamLevel] = useState("");
    const navigation = useNavigate();

    const initialErrorState = {
        teamName: '',
        teamLevel: '',
        players: Array.from({ length: sport.nbPlayersMax }, () => ({
            email: '',
            mobile: '',
            lastname: '',
            firstname: '',
            dateOfBirth: '',
            gender: '',
            packId: '',
            mailHebergeur: '',
            swimming50mEventId: '',
            swimming100mEventId: '',
        })),
    };
    const [errors, setErrors] = useState(initialErrorState);

    const handleChangeTeamName = (text) => {
        setTeamName(text.target.value);
    }

    const handleChangeTeamLevel = (text) => {
        setTeamLevel(text.target.value);
    }

    const [selectedPlayer, setSelectedPlayer] = useState(1);

    const displayPlayer = []
    for (let i = 1; i <= sport.nbPlayersMax; i++) {
        const playerHasError = Object.values(errors.players[i - 1]).some(error => error !== '');
        displayPlayer.push(<DisplayPlayer key={i} id={i} mandatory={i <= sport.nbPlayersMin} selected={i == selectedPlayer} onClick={() => setSelectedPlayer(i)} hasError={playerHasError} />)
    }

    const [playerData, setPlayerData] = useState(
        Array.from({ length: sport.nbPlayersMax }, (_, index) => ({
            id: index + 1,
            email: null,
            lastname: null,
            firstname: null,
            mobile: '',
            dateOfBirth: null,
            isCaptain: index === 0,
            gender: null,
            packId: null,
            isVegan: false,
            hasAllergies: false,
            allergies: null,
            licenceID: '',
            weight: 0,
            productsIds: [],
            mailHebergeur: '',
            classementTennis: null,
            classementTT: null,
            armeVoeu1: null,
            armeVoeu2: null,
            armeVoeu3: null,
            swimming50mEventId: null,
            swimming100mEventId: null,
        }))
    );

    // eslint-disable-next-line no-unused-vars
    const handleChange = (e, newInput) => {
        const { name, value } = e.target;
        // console.log("name ", name, " value ", value);
        setPlayerData(playerData.map((player, index) =>
            index === selectedPlayer - 1 ? { ...player, [name]: value } : player
        ))
    }
    const handleCheckboxChange = (goodieId, checked) => {
        setPlayerData(playerData.map((player, index) => {
            if (index === selectedPlayer - 1) {
                // Si la checkbox est cochée, ajoutez le goodieId au tableau des goodies du joueur
                // Sinon, retirez-le
                const updatedGoodies = checked
                    ? [...player.productsIds, goodieId]
                    : player.productsIds.filter(id => id !== goodieId);

                return { ...player, productsIds: updatedGoodies };
            }
            return player;
        }));
    };

    const [packs, setPacks] = useState([]);
    const [goodies, setGoodies] = useState([]);
    const [swimmingEvents, setSwimmingEvents] = useState([]);
    const [events50m, setEvents50m] = useState([]);
    const [events100m, setEvents100m] = useState([]);
    const isSwimming = sport.sport?.toLowerCase().includes('natation');
    const isGolf = sport.sport?.toLowerCase().includes('golf');
    const isEscrime = sport.sport?.toLowerCase().includes('escrime');
    const selectedEscrimeSection = isEscrime ? (sport.escrimeSection || null) : null;
    const escrimeSectionLabel = selectedEscrimeSection === 'Epee' ? 'Épée' : selectedEscrimeSection;

    const fetchData = () => {
        const endpoints = [
            '/packs',
            '/products',
        ]
        if (isSwimming) {
            endpoints.push(`/swimming/events/${sport.id}`);
        }
        axios.all(endpoints.map(url => ApiICConnected.get(url)))
            .then(axios.spread((...responses) => {
                setPacks(responses[0].data);
                setGoodies(responses[1].data);
                if (isSwimming && responses[2]?.data?.events) {
                    const events = responses[2].data.events;
                    setSwimmingEvents(events);
                    // Filtrer les épreuves 50m (non-relais)
                    const fiftyM = events.filter(e => !e.isRelay && e.distance === 'Distance50m');
                    setEvents50m(fiftyM);
                    // Filtrer les épreuves 100m (non-relais)
                    const hundredM = events.filter(e => !e.isRelay && e.distance === 'Distance100m');
                    setEvents100m(hundredM);
                }
            })).catch((error) => {
                console.log(error);
            });
    }

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!selectedEscrimeSection) {
            return;
        }

        setPlayerData((prevData) => prevData.map((player) => ({
            ...player,
            armeVoeu1: selectedEscrimeSection,
            armeVoeu2: null,
            armeVoeu3: null,
        })));
    }, [selectedEscrimeSection]);


    const playerSchema = yup.object().shape({
        email: yup.string().email('Email invalide').required('Email requis'),
        lastname: yup.string().required('Nom requis'),
        firstname: yup.string().required('Prénom requis'),
        dateOfBirth: yup.date().required('Date de naissance requise'),
        gender: yup.string().required('Genre requis'),
        packId: yup.string().required('Pack requis'),

        mailHebergeur: yup.string().email('Email invalide').when(['packId'], {
            is: (packId) => packId == '5' || packId == '6' || packId == '11' || packId == '12', // Vérifie si packId est un des rez
            then: schema => schema.email("Email invalide").required("Email de l'hébergeur requis"),  // Rend emailHebergeur obligatoire si la condition est vraie
            otherwise: schema => schema.notRequired() // Rend emailHebergeur non obligatoire si la condition est fausse
        }),

        // Validation pour la natation : un 50m et un 100m requis
        swimming50mEventId: isSwimming 
            ? yup.number()
                .typeError('Vous devez sélectionner une épreuve 50m')
                .required('Vous devez sélectionner une épreuve 50m')
                .positive('Vous devez sélectionner une épreuve 50m valide')
            : yup.number().nullable().notRequired(),
        swimming100mEventId: isSwimming 
            ? yup.number()
                .typeError('Vous devez sélectionner une épreuve 100m')
                .required('Vous devez sélectionner une épreuve 100m')
                .positive('Vous devez sélectionner une épreuve 100m valide')
            : yup.number().nullable().notRequired(),
        licenceID: isGolf
            ? yup.string().required('Numéro de licence requis pour le golf')
            : yup.string().nullable().notRequired(),
        armeVoeu1: isEscrime
            ? yup.string().required('Arme requise')
            : yup.string().nullable().notRequired(),
    });

    const optionalPlayerSchema = yup.object().test(
        'is-empty-or-full',
        'Vous devez completer les joueurs',
        function (player, context) {
            const coreFields = [
                'email',
                'lastname',
                'firstname',
                'mobile',
                'dateOfBirth',
                'gender',
                'packId',
                'mailHebergeur',
                'licenceID',
                'classementTennis',
                'classementTT',
                'armeVoeu1',
                'armeVoeu2',
                'armeVoeu3',
                'swimming50mEventId',
                'swimming100mEventId',
            ];

            const hasAnyCoreFieldFilled = coreFields.some((field) => {
                const value = player?.[field];
                if (value === null || value === undefined) {
                    return false;
                }
                if (typeof value === 'string') {
                    return value.trim() !== '';
                }
                return value !== 0;
            });

            const allEmpty = !hasAnyCoreFieldFilled;

            if (allEmpty) {
                // Si tous les champs sont vides, la validation passe
                return true;
            } else {
                // Si au moins un champ est rempli, valider selon playerSchema
                return playerSchema.validate(player).then(() => true).catch(err => {
                    // Renvoie une erreur de yup avec le message d'erreur original de playerSchema
                    const nestedPath = err.path ? `${context.path}.${err.path}` : context.path;
                    return context.createError({ path: nestedPath, message: err.errors[0] });
                });
            }
        }
    )


    const teamSchema = yup.object().shape({
        teamName: yup.string().required('Nom de l\'équipe requis'),
        teamLevel: yup.number().typeError('Niveau requis').required('Niveau de l\'équipe requis').min(1, 'Le niveau doit être entre 1 et 10').max(10, 'Le niveau doit être entre 1 et 10'),
        players: yup.array().of(
            yup.lazy((player) => player.id <= sport.nbPlayersMin ? playerSchema : optionalPlayerSchema)
        )
    });


    const handleSubmit = async (event) => {
        // console.log(playerData);
        event.preventDefault()
        
        // Validation spécifique pour la natation : vérifier les doublons d'épreuves
        if (isSwimming) {
            const filledPlayers = playerData.filter(p => p.email && p.firstname && p.lastname);
            const event50mIds = filledPlayers.map(p => p.swimming50mEventId).filter(id => id !== null);
            const event100mIds = filledPlayers.map(p => p.swimming100mEventId).filter(id => id !== null);
            
            // Vérifier les doublons pour les 50m
            const duplicates50m = event50mIds.filter((id, index) => event50mIds.indexOf(id) !== index);
            if (duplicates50m.length > 0) {
                const eventName = events50m.find(e => e.id === duplicates50m[0])?.name;
                showSnackbar(`Erreur : plusieurs participants sont assignés à la même épreuve (${eventName})`, 4000, 'error');
                return;
            }
            
            // Vérifier les doublons pour les 100m
            const duplicates100m = event100mIds.filter((id, index) => event100mIds.indexOf(id) !== index);
            if (duplicates100m.length > 0) {
                const eventName = events100m.find(e => e.id === duplicates100m[0])?.name;
                showSnackbar(`Erreur : plusieurs participants sont assignés à la même épreuve (${eventName})`, 4000, 'error');
                return;
            }
        }
        
        try {
            await teamSchema.validate({ teamLevel,teamName, players: playerData }, { abortEarly: false })
            setErrors(initialErrorState)
            const participantsPayload = parseRegisterTeamRequest(
                selectedEscrimeSection
                    ? playerData.map((player) => ({
                        ...player,
                        armeVoeu1: selectedEscrimeSection,
                        armeVoeu2: null,
                        armeVoeu3: null,
                    }))
                    : playerData
            );

            ApiICConnected.post(`/teams/?name=${teamName}&sportId=${sport.id}&level=${teamLevel}`, participantsPayload, { headers: { 'Content-Type': 'application/json' } })
                .then(() => {
                    showSnackbar('Inscription réussie', 3000, 'success',);
                    navigation('/');
                })
                .catch((error) => {
                    console.log(error);
                    showSnackbar(getApiSnackbarMessage(error), 7000, 'error',);

                });

        } catch (err) {
            if (err instanceof yup.ValidationError) {
                const newErrors = { ...initialErrorState }; // Commencez avec une structure d'erreur vierge
                err.inner.forEach((error) => {
                    const { path, message } = error;
                    // Découper le chemin pour accéder à l'index et au champ du joueur
                    let [section, index, field] = path.split(/[[\].]+/);
                    if (section === 'players' && index !== undefined && field !== undefined && field !== '') {
                        if (!newErrors[section][index]) {
                            newErrors[section][index] = {};
                        }
                        newErrors[section][index][field] = message; // Assigner le message d'erreur
                    } else if (field !== '') {
                        newErrors[path] = message; // Gérer les erreurs non liées aux joueurs
                    }
                });
                setErrors(newErrors);
                showSnackbar(getValidationSnackbarMessage(err), 7000, 'error');
            }
        }
    }

    return (
        <Grid container spacing={2} direction="row" justifyContent="center" alignItems="center"
            sx={{ display: "flex", flexGrow: 1, mt: 0 }}
        >
            <Grid item xs={2.5} sx={{ height: '100%', bgcolor: 'background.drawer' }}>
                <Box sx={{ display:'flex', flexDirection: 'column',px: 3, py: 3,gap:3 }}>
                    <Box>
                        <TextField
                            id="teamName"
                            variant="outlined"
                            value={teamName}
                            onChange={handleChangeTeamName}
                            fullWidth
                            placeholder="Nom de l'équipe"
                            error={!!errors.teamName}
                            helperText={errors.teamName}
                        />
                    </Box>
                    <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2}}>
                        <FormControl fullWidth error={!!errors.teamLevel}>
                            <Select
                            id="teamLevel"
                            variant="outlined"
                            value={teamLevel}
                            onChange={handleChangeTeamLevel}
                                displayEmpty
                            >
                                <MenuItem value="" disabled>Niveau de l&apos;équipe (1 : débutant, 10 : compétiteur)</MenuItem>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                                    <MenuItem key={level} value={level}>
                                        {level}{level === 1 ? ' - Débutant' : level === 5 ? ' - Intermédiaire' : level === 10 ? ' - Compétiteur' : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.teamLevel && <FormHelperText>{errors.teamLevel}</FormHelperText>}
                        </FormControl>
                        <Tooltip title="Selon vous, quel est le niveau de votre équipe ? Cette information nous permet de faire des poules homogènes !" >
                            <InfoIcon color="primary"/>
                        </Tooltip>
                    </Box>

                    <Alert severity="info">
                                Veuillez ajouter [DELEG] au début du nom de votre équipe si votre école est une délégation ET que vous utilisez une place réservée dans ce sport pour votre école pour CETTE équipe !
                            </Alert>
                    
                    
                            
                        
                </Box>
                <Divider sx={{ margin: 3 }} />
                <Box sx={{ margin: 3 }}>
                    {displayPlayer}
                </Box>
                <Divider sx={{ margin: 3 }} />
                <Box sx={{
                    margin: 3,
                }}>
                    <Button variant="contained" fullWidth
                        onClick={handleSubmit}
                    >
                        Valider l&apos;équipe
                    </Button>
                </Box>


            </Grid>
            <Grid item xs={9.5} sx={{ height: '100%', backgroundColor: 'background.paper' }}>
                <Box sx={{ marginX: '10%', marginTop: 4 }}>
                    <Typography variant="h5">Participant n°{selectedPlayer} {selectedPlayer == 1 && "(Capitaine)"}</Typography>
                    <Box sx={{ display: 'flex' }}>
                        <form style={{ width: '100%' }}>
                        <Alert sx={{mt:3}} severity="error">
                                        Vous aurez l'option d'ajouter le certificat médical ou l'attestation de santé après la création de l'équipe dans l'onglet 'Mes Equipes'. Lisez bien les instructions pour savoir quel document est requis en fonction du sport et de la situation du participant.  
                                    </Alert>
                            <Grid container spacing={2} direction="row" justifyContent="center" alignItems="flex-start" marginTop={2} sx={{ backgroundColor: 'background.paper' }}>
                                <Grid item xs={6} sx={{ backgroundColor: 'background.paper' }}>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                        <InputLabel htmlFor="lastname" sx={{ marginBottom: 1 }}>Nom</InputLabel>
                                        <TextField id="lastname"
                                            placeholder="Nom"
                                            variant="outlined"
                                            value={playerData[selectedPlayer - 1]?.lastname || ''}
                                            onChange={handleChange}
                                            fullWidth
                                            autoComplete="lastname"
                                            name="lastname"
                                            error={!!errors.players[selectedPlayer - 1]?.lastname}
                                            helperText={errors.players[selectedPlayer - 1]?.lastname}
                                        />
                                    </Box>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                        <InputLabel htmlFor="email" sx={{ marginBottom: 1 }}>Email</InputLabel>
                                        <TextField id="email"
                                            placeholder="Email"
                                            variant="outlined"
                                            value={playerData[selectedPlayer - 1]?.email || ''}
                                            onChange={handleChange}
                                            fullWidth
                                            autoComplete="email"
                                            name="email"
                                            error={!!errors.players[selectedPlayer - 1]?.email}
                                            helperText={errors.players[selectedPlayer - 1]?.email}
                                        />
                                    </Box>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                        <InputLabel htmlFor="gender" sx={{ marginBottom: 1 }}>Genre</InputLabel>
                                        <Autocomplete
                                            id="gender"
                                            variant="outlined"
                                            fullWidth
                                            options={gender}
                                            getOptionLabel={(option) => option.label}
                                            renderInput={(params) =>
                                                <TextField {...params}
                                                    placeholder="Rechercher genre"
                                                    InputLabelProps={{ shrink: true }}
                                                    inputProps={{
                                                        ...params.inputProps,
                                                        style: {
                                                            paddingTop: 0,
                                                        },
                                                    }}
                                                    error={!!errors.players[selectedPlayer - 1]?.gender}
                                                    helperText={errors.players[selectedPlayer - 1]?.gender}
                                                />}
                                            renderOption={(props, option) => (
                                                <ListItem
                                                    key={option.id}
                                                    {...props}
                                                    variant="school"
                                                >
                                                    <ListItemText primary={option.label} />
                                                </ListItem>
                                            )}
                                            value={gender.find(option => option.type === playerData[selectedPlayer - 1]?.gender) || null}
                                            onChange={(e, newValue) => handleChange({ target: { name: "gender", value: newValue ? newValue.type : null } })}
                                            isOptionEqualToValue={(option, value) => option.type === value.type}
                                        />
                                    </Box>   
                                    {/**
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                        <InputLabel htmlFor="licenceId" sx={{ marginBottom: 1 }}>Numéro de licence</InputLabel>
                                        <TextField id="licenceId"
                                            placeholder="Numéro de licence"
                                            variant="outlined"
                                            value={playerData[selectedPlayer - 1]?.licenceID || ''}
                                            onChange={handleChange}
                                            fullWidth
                                            autoComplete="licenceID"
                                            name="licenceID"
                                            error={!!errors.players[selectedPlayer - 1]?.licenceID}
                                            helperText={errors.players[selectedPlayer - 1]?.licenceID}
                                        />
                                    </Box>
                                    */}
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                        <InputLabel htmlFor="pack" sx={{ marginBottom: 1 }}>Pack</InputLabel>
                                        <Autocomplete
                                            id="pack"
                                            variant="outlined"
                                            fullWidth
                                            options={sport.id !== 27 ? packs.filter(option => ![7, 8, 9, 10, 11, 12].includes(option.id)) : packs}
                                            getOptionLabel={(option) => option.name /*option.id === 5 ? "Rez sans Diner" : option.name*/}
                                            renderInput={(params) =>
                                                <TextField {...params}
                                                    placeholder="Rechercher pack"
                                                    InputLabelProps={{ shrink: true }}
                                                    inputProps={{
                                                        ...params.inputProps,
                                                        style: {
                                                            paddingTop: 0,
                                                        },
                                                    }}
                                                    error={!!errors.players[selectedPlayer - 1]?.packId}
                                                    helperText={errors.players[selectedPlayer - 1]?.packId}
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
                                            value={packs.find(option => option.id === playerData[selectedPlayer - 1]?.packId) || null}
                                            onChange={(e, newValue) => handleChange({ target: { name: "packId", value: newValue ? newValue.id : null } })}
                                            isOptionEqualToValue={(option, value) => option.id === value.id}
                                        />
                                    </Box>
                                </Grid>
                                
                                <Grid item xs={6} sx={{ backgroundColor: 'background.paper' }}>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                        <InputLabel htmlFor="firstname" sx={{ marginBottom: 1 }}>Prénom</InputLabel>
                                        <TextField id="firstname"
                                            placeholder="Prénom"
                                            variant="outlined"
                                            value={playerData[selectedPlayer - 1]?.firstname || ''}
                                            onChange={handleChange}
                                            fullWidth
                                            autoComplete="firstname"
                                            name="firstname"
                                            error={!!errors.players[selectedPlayer - 1]?.firstname}
                                            helperText={errors.players[selectedPlayer - 1]?.firstname}
                                        />
                                    </Box>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                        <InputLabel htmlFor="mobile" sx={{ marginBottom: 1 }}>Numéro de téléphone</InputLabel>
                                        <TextField id="mobile"
                                            placeholder="Numéro de téléphone"
                                            variant="outlined"
                                            value={playerData[selectedPlayer - 1]?.mobile || ''}
                                            onChange={handleChange}
                                            fullWidth
                                            autoComplete="mobile"
                                            name="mobile"
                                            error={!!errors.players[selectedPlayer - 1]?.mobile}
                                            helperText={errors.players[selectedPlayer - 1]?.mobile}
                                        />
                                    </Box>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                        <InputLabel htmlFor="dateOfbBirth" sx={{ marginBottom: 1 }}>Date de naissance</InputLabel>
                                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                                            <DatePicker
                                                disableFuture
                                                value={playerData[selectedPlayer - 1]?.dateOfBirth ? dayjs(playerData[selectedPlayer - 1]?.dateOfBirth) : null}
                                                onChange={(newValue) => handleChange({ target: { name: "dateOfBirth", value: newValue ? new Date(newValue?.toDate()) : null } })}
                                                name="dateOfBirth"
                                                autoComplete="dateOfBirth"
                                                sx={{ width: '100%' }}
                                            />
                                        </LocalizationProvider>
                                    </Box>
                                    
                                    {(sport.sport === 'Boxe' || sport.sport === 'Judo') &&
                                        <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                            <InputLabel htmlFor="weight" sx={{ marginBottom: 1 }}>Poids</InputLabel>
                                            <TextField id="weight"
                                                placeholder="Poids (kg)"
                                                variant="outlined"
                                                value={playerData[selectedPlayer - 1]?.weight || ''}
                                                onChange={handleChange}
                                                fullWidth
                                                autoComplete="weight"
                                                name="weight"
                                                type="number"
                                                InputProps={{
                                                    inputProps: {
                                                        min: 0,
                                                        max: 200,
                                                        onInput: (e) => {
                                                            e.target.value = Math.max(0, parseInt(e.target.value)).toString().slice(0, 3);
                                                            if (parseInt(e.target.value) > 200) e.target.value = 200;
                                                        }
                                                    }
                                                }}
                                            />
                                        </Box>
                                    }
                                    {(sport.sport === 'Tennis de table') &&
                                        <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                            <InputLabel htmlFor="classementTT" sx={{ marginBottom: 1 }}>Classement</InputLabel>
                                            <TextField id="classementTT"
                                                placeholder="Classement"
                                                variant="outlined"
                                                value={playerData[selectedPlayer - 1]?.classementTT || ''}
                                                onChange={handleChange}
                                                fullWidth
                                                autoComplete="classementTT"
                                                name="classementTT"
                                                type="number"
                                                InputProps={{
                                                    inputProps: {
                                                        min: 0,
                                                        max: 5000,
                                                        onInput: (e) => {
                                                            e.target.value = Math.max(0, parseInt(e.target.value)).toString().slice(0, 4);
                                                            if (parseInt(e.target.value) > 5000) e.target.value = 5000;
                                                        }
                                                    }
                                                }}
                                            />
                                        </Box>
                                    }
                                    {(sport.sport === 'Tennis') &&
                                        <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                            <InputLabel htmlFor="classementTennis" sx={{ marginBottom: 1 }}>Classement</InputLabel>
                                            <Autocomplete
                                                id="classementTennis"
                                                variant="outlined"
                                                fullWidth
                                                options={classementTennis}
                                                getOptionLabel={(option) => option.label}
                                                renderInput={(params) =>
                                                    <TextField {...params}
                                                        placeholder="Rechercher Classement"
                                                        InputLabelProps={{ shrink: true }}
                                                        inputProps={{
                                                            ...params.inputProps,
                                                            style: {
                                                                paddingTop: 0,
                                                            },
                                                        }}
                                                        error={!!errors.players[selectedPlayer - 1]?.classementTennis}
                                                        helperText={errors.players[selectedPlayer - 1]?.classementTennis}
                                                    />}
                                                renderOption={(props, option) => (
                                                    <ListItem
                                                        key={option.id}
                                                        {...props}
                                                        variant="school"
                                                    >
                                                        <ListItemText primary={option.label} />
                                                    </ListItem>
                                                )}
                                                value={classementTennis.find(option => option.type === playerData[selectedPlayer - 1]?.classementTennis) || null}
                                                onChange={(e, newValue) => handleChange({ target: { name: "classementTennis", value: newValue ? newValue.type : null } })}
                                                isOptionEqualToValue={(option, value) => option.type === value.type}
                                            />
                                        </Box>

                                    }
                                    {isSwimming &&
                                        <>
                                            <Alert severity="info" sx={{ mb: 2 }}>
                                                Chaque participant doit obligatoirement participer à une épreuve 50m ET une épreuve 100m.
                                            </Alert>
                                            <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                                <InputLabel htmlFor="swimming50mEventId" sx={{ marginBottom: 1 }}>Épreuve 50m *</InputLabel>
                                                <Autocomplete
                                                    id="swimming50mEventId"
                                                    variant="outlined"
                                                    fullWidth
                                                    options={events50m}
                                                    getOptionLabel={(option) => option.name}
                                                    renderInput={(params) =>
                                                        <TextField {...params}
                                                            placeholder="Sélectionner une épreuve 50m"
                                                            InputLabelProps={{ shrink: true }}
                                                            inputProps={{
                                                                ...params.inputProps,
                                                                style: {
                                                                    paddingTop: 0,
                                                                },
                                                            }}
                                                            error={!!errors.players[selectedPlayer - 1]?.swimming50mEventId}
                                                            helperText={errors.players[selectedPlayer - 1]?.swimming50mEventId}
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
                                                    value={events50m.find(option => option.id === playerData[selectedPlayer - 1]?.swimming50mEventId) || null}
                                                    onChange={(e, newValue) => handleChange({ target: { name: "swimming50mEventId", value: newValue ? newValue.id : null } })}
                                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                                />
                                            </Box>
                                            <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                                <InputLabel htmlFor="swimming100mEventId" sx={{ marginBottom: 1 }}>Épreuve 100m *</InputLabel>
                                                <Autocomplete
                                                    id="swimming100mEventId"
                                                    variant="outlined"
                                                    fullWidth
                                                    options={events100m}
                                                    getOptionLabel={(option) => option.name}
                                                    renderInput={(params) =>
                                                        <TextField {...params}
                                                            placeholder="Sélectionner une épreuve 100m"
                                                            InputLabelProps={{ shrink: true }}
                                                            inputProps={{
                                                                ...params.inputProps,
                                                                style: {
                                                                    paddingTop: 0,
                                                                },
                                                            }}
                                                            error={!!errors.players[selectedPlayer - 1]?.swimming100mEventId}
                                                            helperText={errors.players[selectedPlayer - 1]?.swimming100mEventId}
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
                                                    value={events100m.find(option => option.id === playerData[selectedPlayer - 1]?.swimming100mEventId) || null}
                                                    onChange={(e, newValue) => handleChange({ target: { name: "swimming100mEventId", value: newValue ? newValue.id : null } })}
                                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                                />
                                            </Box>
                                        </>
                                    }
                                    {isGolf &&
                                        <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                            <InputLabel htmlFor="licenceID" sx={{ marginBottom: 1 }}>Numéro de licence</InputLabel>
                                            <TextField id="licenceID"
                                                placeholder="Numéro de licence"
                                                variant="outlined"
                                                value={playerData[selectedPlayer - 1]?.licenceID || ''}
                                                onChange={handleChange}
                                                fullWidth
                                                autoComplete="licenceID"
                                                name="licenceID"
                                                error={!!errors.players[selectedPlayer - 1]?.licenceID}
                                                helperText={errors.players[selectedPlayer - 1]?.licenceID}
                                            />
                                        </Box>
                                    }
                                    {isEscrime && !selectedEscrimeSection &&
                                        <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                            <InputLabel htmlFor="armeVoeu1" sx={{ marginBottom: 1 }}>Voeu 1</InputLabel>
                                            <Autocomplete
                                                id="armeVoeu1"
                                                variant="outlined"
                                                fullWidth
                                                options={armevoeux}
                                                getOptionLabel={(option) => option.label}
                                                renderInput={(params) =>
                                                    <TextField {...params}
                                                        placeholder="Rechercher Arme"
                                                        InputLabelProps={{ shrink: true }}
                                                        inputProps={{
                                                            ...params.inputProps,
                                                            style: {
                                                                paddingTop: 0,
                                                            },
                                                        }}
                                                        error={!!errors.players[selectedPlayer - 1]?.armeVoeu1}
                                                        helperText={errors.players[selectedPlayer - 1]?.armeVoeu1}
                                                    />}
                                                renderOption={(props, option) => (
                                                    <ListItem
                                                        key={option.id}
                                                        {...props}
                                                        variant="school"
                                                    >
                                                        <ListItemText primary={option.label} />
                                                    </ListItem>
                                                )}
                                                value={armevoeux.find(option => option.type === playerData[selectedPlayer - 1]?.armeVoeu1) || null}
                                                onChange={(e, newValue) => handleChange({ target: { name: "armeVoeu1", value: newValue ? newValue.type : null } })}
                                                isOptionEqualToValue={(option, value) => option.type === value.type}
                                            />
                                            <InputLabel htmlFor="armeVoeu2" sx={{ marginBottom: 1 }}>Voeu 2</InputLabel>
                                            <Autocomplete
                                                id="armeVoeu2"
                                                variant="outlined"
                                                fullWidth
                                                options={armevoeux}
                                                getOptionLabel={(option) => option.label}
                                                renderInput={(params) =>
                                                    <TextField {...params}
                                                        placeholder="Rechercher Arme"
                                                        InputLabelProps={{ shrink: true }}
                                                        inputProps={{
                                                            ...params.inputProps,
                                                            style: {
                                                                paddingTop: 0,
                                                            },
                                                        }}
                                                        error={!!errors.players[selectedPlayer - 1]?.armeVoeu2}
                                                        helperText={errors.players[selectedPlayer - 1]?.armeVoeu2}
                                                    />}
                                                renderOption={(props, option) => (
                                                    <ListItem
                                                        key={option.id}
                                                        {...props}
                                                        variant="school"
                                                    >
                                                        <ListItemText primary={option.label} />
                                                    </ListItem>
                                                )}
                                                value={armevoeux.find(option => option.type === playerData[selectedPlayer - 1]?.armeVoeu2) || null}
                                                onChange={(e, newValue) => handleChange({ target: { name: "armeVoeu2", value: newValue ? newValue.type : null } })}
                                                isOptionEqualToValue={(option, value) => option.type === value.type}
                                            />
                                            <InputLabel htmlFor="armeVoeu3" sx={{ marginBottom: 1 }}>Voeu 3</InputLabel>
                                            <Autocomplete
                                                id="armeVoeu3"
                                                variant="outlined"
                                                fullWidth
                                                options={armevoeux}
                                                getOptionLabel={(option) => option.label}
                                                renderInput={(params) =>
                                                    <TextField {...params}
                                                        placeholder="Rechercher Arme"
                                                        InputLabelProps={{ shrink: true }}
                                                        inputProps={{
                                                            ...params.inputProps,
                                                            style: {
                                                                paddingTop: 0,
                                                            },
                                                        }}
                                                        error={!!errors.players[selectedPlayer - 1]?.armeVoeu3}
                                                        helperText={errors.players[selectedPlayer - 1]?.armeVoeu3}
                                                    />}
                                                renderOption={(props, option) => (
                                                    <ListItem
                                                        key={option.id}
                                                        {...props}
                                                        variant="school"
                                                    >
                                                        <ListItemText primary={option.label} />
                                                    </ListItem>
                                                )}
                                                value={armevoeux.find(option => option.type === playerData[selectedPlayer - 1]?.armeVoeu3) || null}
                                                onChange={(e, newValue) => handleChange({ target: { name: "armeVoeu3", value: newValue ? newValue.type : null } })}
                                                isOptionEqualToValue={(option, value) => option.type === value.type}
                                            />
                                        </Box>
                                    }
                                    {isEscrime && selectedEscrimeSection &&
                                        <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                            <Alert severity="info" sx={{ mb: 2 }}>
                                                Section d'inscription choisie : {escrimeSectionLabel}
                                            </Alert>
                                            <InputLabel htmlFor="escrime-section" sx={{ marginBottom: 1 }}>Section</InputLabel>
                                            <TextField
                                                id="escrime-section"
                                                variant="outlined"
                                                fullWidth
                                                value={escrimeSectionLabel}
                                                InputProps={{ readOnly: true }}
                                            />
                                        </Box>
                                    }
                                </Grid>
                            </Grid>
                            {(playerData[selectedPlayer - 1]?.packId === 1 || playerData[selectedPlayer - 1]?.packId === 6 || playerData[selectedPlayer - 1]?.packId === 11 || playerData[selectedPlayer - 1]?.packId === 12) &&
                                <Box>
                                    <Alert sx={{my:2}} severity="error">
                                    L'email hébergeur est obligatoire car nous avons besoin de l'accord de l'hébergeur pour vous acceuillir ! 
                                    </Alert>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                        <InputLabel htmlFor="mailHebergeur" sx={{ marginBottom: 1 }}>Email hebergeur (Uniquement chez une de vos connaissances)</InputLabel>
                                        <TextField id="mailHebergeur"
                                            placeholder="Email hebergeur"
                                            variant="outlined"
                                            value={playerData[selectedPlayer - 1]?.mailHebergeur || ''}
                                            onChange={handleChange}
                                            fullWidth
                                            name="mailHebergeur"
                                            error={!!errors.players[selectedPlayer - 1]?.mailHebergeur}
                                            helperText={errors.players[selectedPlayer - 1]?.mailHebergeur}
                                        />
                                    </Box>
                                </Box>
                            }
                            <Divider sx={{ marginY: 1 }} />
                            <Box>
                                <Typography variant="h6" sx={{ mb: 1 }}>Régime alimentaire</Typography>
                                <Box sx={{ justifyContent: 'left', textAlign: 'left' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 1 }}>
                                        <Checkbox
                                            sx={{
                                                color: "primary.main",
                                                '&.Mui-checked': {
                                                    color: "primary.main",
                                                },
                                            }}
                                            checked={playerData[selectedPlayer - 1]?.isVegan}
                                            onChange={(e, checked) => handleChange({ target: { name: "isVegan", value: checked } })}
                                        />
                                        <Typography sx={{ ml: 2 }}>Végan</Typography>
                                    </Box>
                                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                                        <InputLabel htmlFor="allergies" sx={{ marginBottom: 1 }}>Allergies</InputLabel>
                                        <Autocomplete
                                            id="allergies"
                                            variant="outlined"
                                            fullWidth
                                            multiple
                                            options={allergies}
                                            getOptionLabel={(option) => option.label}
                                            renderInput={(params) =>
                                                <TextField {...params}
                                                    placeholder="Sélectionner les allergies"
                                                    InputLabelProps={{ shrink: true }}
                                                />}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    paddingTop: '14px',
                                                    paddingBottom: '14px',
                                                    minHeight: '56px',
                                                },
                                                '& .MuiAutocomplete-tag': {
                                                    margin: '2px 4px 2px 0',
                                                },
                                                '& .MuiAutocomplete-inputRoot': {
                                                    paddingTop: '6px !important',
                                                    paddingBottom: '6px !important',
                                                },
                                            }}
                                            renderOption={(props, option) => (
                                                <ListItem
                                                    key={option.id}
                                                    {...props}
                                                    variant="school"
                                                >
                                                    <ListItemText primary={option.label} />
                                                </ListItem>
                                            )}
                                            value={playerData[selectedPlayer - 1]?.allergies ? allergies.filter(allergy => {
                                                const allergiesArray = playerData[selectedPlayer - 1].allergies.split(',').map(a => a.trim());
                                                return allergiesArray.includes(allergy.value);
                                            }) : []}
                                            onChange={(e, newValue) => {
                                                const allergiesString = newValue && newValue.length > 0 ? newValue.map(a => a.value).join(',') : null;
                                                const hasAllergies = newValue && newValue.length > 0;
                                                // Mettre à jour les deux valeurs en une seule fois
                                                setPlayerData(prevData => prevData.map((player, index) =>
                                                    index === selectedPlayer - 1 
                                                        ? { ...player, allergies: allergiesString, hasAllergies: hasAllergies }
                                                        : player
                                                ));
                                            }}
                                            isOptionEqualToValue={(option, value) => option.value === value.value}
                                        />
                                    </Box>
                                </Box>
                            </Box>

                            <Divider sx={{ marginY: 2 }} />
                            <Box>
                                <Typography variant="h6" sx={{ mb: 2 }}>Choix des goodies</Typography>
                                <Box sx={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap',
                                    gap: 2,
                                    justifyContent: 'flex-start',
                                    mb: 1 
                                }}>
                                    {goodies
                                    .filter(goodie => goodie.id !== 14 && !goodie.name?.toLowerCase().includes('gourde')) 
                                    .sort((a, b) => a.id - b.id)
                                    .map((goodie) => {
                                        const isSelected = playerData[selectedPlayer - 1]?.productsIds.includes(goodie.id);
                                        return (
                                            <Box
                                                key={goodie.id}
                                                onClick={() => handleCheckboxChange(goodie.id, !isSelected)}
                                                sx={{
                                                    width: '100px',
                                                    height: '120px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    p: 2,
                                                    borderRadius: '10px',
                                                    boxShadow: 1,
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                                    background: isSelected ? 'linear-gradient(180deg, #E3F2FD 0%, #BBDEFB 100%)' : 'white',
                                                    border: isSelected ? '2px solid' : '1px solid',
                                                    borderColor: isSelected ? 'primary.main' : 'grey.300',
                                                    '&:hover': {
                                                        transform: 'translateY(-5px)',
                                                        boxShadow: 3
                                                    }
                                                }}
                                            >
                                                <Box sx={{ 
                                                    position: 'relative', 
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <img 
                                                        src={goodie.pictureLink} 
                                                        alt={goodie.name} 
                                                        style={{ 
                                                            maxWidth: '100%', 
                                                            maxHeight: '100%',
                                                            objectFit: 'contain'
                                                        }}
                                                    />
                                                </Box>
                                                
                                                <Typography 
                                                    sx={{ 
                                                        fontSize: '0.85rem', 
                                                        fontWeight: isSelected ? 'bold' : 'normal',
                                                        textAlign: 'center',
                                                        color: isSelected ? 'primary.main' : 'black',
                                                        mt: 1
                                                    }}
                                                >
                                                    {goodie.name}
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold',
                                                        color: isSelected ? 'primary.main' : 'black',
                                                    }}
                                                >
                                                    {(goodie.priceInCents / 100).toFixed(2)} €
                                                </Typography>
                                                
                                                {isSelected && (
                                                    <Box sx={{ 
                                                        position: 'absolute', 
                                                        top: '5px', 
                                                        right: '5px', 
                                                        bgcolor: 'primary.main',
                                                        borderRadius: '50%',
                                                        width: '20px',
                                                        height: '20px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <CheckIcon sx={{ color: 'white', fontSize: '0.9rem' }} />
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        </form>
                    </Box>
                </Box>
            </Grid>
        </Grid >

    )

};

RegisterTeam.propTypes = {
    sport: PropTypes.object.isRequired
};
export default RegisterTeam;

const DisplayPlayer = ({ id, mandatory, selected, onClick, hasError }) => {

    return (
        <Box onClick={() => onClick()} sx={{ cursor: "pointer", marginY: 1.5, display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ color: selected && 'primary.main', flex: 1 }}> Joueur n°{id} {id === 1 && "(Capitaine)"} {!mandatory && "(optionnel)"}</Typography>
            {hasError && <Warning color="error" />}
        </Box>
    );
};

DisplayPlayer.propTypes = {
    id: PropTypes.number.isRequired,
    selected: PropTypes.bool.isRequired,
    mandatory: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
    hasError: PropTypes.bool.isRequired,
};