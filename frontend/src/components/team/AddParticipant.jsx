import { Autocomplete, Box, Button, Checkbox, Divider, Drawer, InputLabel, ListItem, ListItemText, TextField, Typography } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import gender from "../../assets/gender.json";
import classementTennis from "../../assets/classementTennis.json"
import armevoeux from "../../assets/armevoeux.json"
import allergies from "../../assets/allergies.json"
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { useState } from 'react';
import * as yup from 'yup';
import { useSnackbar } from '../../provider/snackbarProvider';
import { ApiICConnected } from '../../service/axios';

const AddParticipant = ({ open, onClose, goodies, packs, teamId }) => {

    const { showSnackbar } = useSnackbar();


    const initState = {
        email: null,
        lastname: null,
        firstname: null,
        dateOfBirth: null,
        mobile: "",
        gender: null,
        packId: null,
        isVegan: false,
        hasAllergies: false,
        allergies: null,
        licenceID: '',
        productsIds: [],
        isCaptain: false,
    }
    const [participant, setParticipant] = useState(initState);
    const [errors, setErrors] = useState({});

    //** Validation de données */
    const playerSchema = yup.object().shape({
        email: yup.string().email('Email invalide').required('Email requis'),
        lastname: yup.string().required('Nom requis'),
        mobile: yup.string().required('Numéro de téléphone requis'),
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

    // eslint-disable-next-line no-unused-vars
    const handleChange = (e, newInput) => {
        const { name, value } = e.target;
        // console.log("name ", name, " value ", value);
        setParticipant({ ...participant, [name]: value })
    }
    const handleCheckboxChange = (goodieId, checked) => {
        const updatedGoodies = checked
            ? [...participant.productsIds, goodieId]
            : participant?.productsIds?.filter(id => id !== goodieId);
        setParticipant({ ...participant, productsIds: updatedGoodies });
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        try {
            await playerSchema.validate(participant, { abortEarly: false });
            setErrors({});
            ApiICConnected.post('teams/' + teamId + '/participants', [participant])
                .then(() => {
                    onClose();
                    setParticipant(initState);
                    showSnackbar('Ajout réussi', 2000, 'success');
                })
                .catch((err) => {
                    console.log(err);
                    showSnackbar('Une erreur est survenue', 3000, 'error');
                });
        }
        catch (err) {
            const newErrors = {};
            err.inner.forEach((error) => {
                newErrors[error.path] = error.message;
            });
            setErrors(newErrors);
        }
    }


    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
        >
            <Box sx={{ width: '45vw' }}>
                <Box sx={{ m: 5, height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant={'h5'} sx={{ mb: 1, justifyContent: 'center' }}>Ajout d&apos;un participant</Typography>
                    </Box>

                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="firstname" sx={{ marginBottom: 1 }}>Prénom</InputLabel>
                        <TextField id="firstname"
                            placeholder="Prénom"
                            variant="outlined"
                            value={participant?.firstname || ''}
                            onChange={handleChange}
                            fullWidth
                            autoComplete="firstname"
                            name="firstname"
                            error={!!errors.firstname}
                            helperText={errors.firstname}
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="lastname" sx={{ marginBottom: 1 }}>Nom</InputLabel>
                        <TextField id="lastname"
                            placeholder="Nom"
                            variant="outlined"
                            value={participant?.lastname || ''}
                            onChange={handleChange}
                            fullWidth
                            autoComplete="lastname"
                            name="lastname"
                            error={!!errors.lastname}
                            helperText={errors.lastname}
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="email" sx={{ marginBottom: 1 }}>Email</InputLabel>
                        <TextField id="email"
                            placeholder="Email"
                            variant="outlined"
                            value={participant?.email || ''}
                            onChange={handleChange}
                            fullWidth
                            autoComplete="new-password"
                            name="email"
                            error={!!errors.email}
                            helperText={errors.email}
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="mobile" sx={{ marginBottom: 1 }}>Numéro de téléphone</InputLabel>
                        <TextField id="mobile"
                            placeholder="Numéro de téléphone"
                            variant="outlined"
                            value={participant?.mobile || ''}
                            onChange={handleChange}
                            fullWidth
                            autoComplete="tel"
                            name="mobile"
                            error={!!errors.mobile}
                            helperText={errors.mobile}
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="dateOfbBirth" sx={{ marginBottom: 1 }}>Date de naissance</InputLabel>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                            <DatePicker
                                disableFuture
                                value={participant?.dateOfBirth ? dayjs(participant.dateOfBirth) : null}
                                onChange={(newValue) => handleChange({ target: { name: "dateOfBirth", value: newValue ? new Date(newValue?.toDate()) : null } })}
                                name="dateOfBirth"
                                autoComplete="dateOfBirth"
                                sx={{ width: '100%' }}
                            />
                        </LocalizationProvider>
                    </Box>
                    {/**

                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="licence" sx={{ marginBottom: 1 }}>Licence</InputLabel>
                        <TextField id="licence"
                            placeholder="Licence"
                            variant="outlined"
                            value={participant?.licenceID || ''}
                            onChange={handleChange}
                            fullWidth
                            name="licenceID"
                        />
                    </Box>
                    */}
                    {(participant?.sport?.sport === "Boxe" || participant?.sport?.sport === "Judo") &&
                        <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                            <InputLabel htmlFor="weight" sx={{ marginBottom: 1 }}>Poids</InputLabel>
                            <TextField id="weight"
                                placeholder="Poids (kg)"
                                variant="outlined"
                                value={participant?.weight || ''}
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
                        </Box>}
                    {(participant?.sport?.sport === 'Tennis de table') &&
                        <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                            <InputLabel htmlFor="classementTT" sx={{ marginBottom: 1 }}>Classement</InputLabel>
                            <TextField id="classement"
                                placeholder="Classement"
                                variant="outlined"
                                value={participant?.classementTT || ''}
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
                    {(participant?.sport?.sport === 'Tennis') &&
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
                                value={classementTennis.find(option => option.type === participant?.classementTennis) || null}
                                onChange={(e, newValue) => handleChange({ target: { name: "classementTennis", value: newValue ? newValue.type : null } })}
                                isOptionEqualToValue={(option, value) => option.type === value.type}
                            />
                        </Box>

                    }
                    {(participant?.sport?.sport === 'Escrime') &&
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
                                value={armevoeux.find(option => option.type === participant?.armeVoeu1) || null}
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
                                value={armevoeux.find(option => option.type === participant?.armeVoeu2) || null}
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
                                value={armevoeux.find(option => option.type === participant?.armeVoeu3) || null}
                                onChange={(e, newValue) => handleChange({ target: { name: "armeVoeu3", value: newValue ? newValue.type : null } })}
                                isOptionEqualToValue={(option, value) => option.type === value.type}
                            />
                        </Box>
                    }
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
                                    error={!!errors.gender}
                                    helperText={errors.gender}
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
                            value={gender.find(option => option.type === participant?.gender) || null}
                            onChange={(e, newValue) => handleChange({ target: { name: "gender", value: newValue ? newValue.type : null } })}
                            isOptionEqualToValue={(option, value) => option.type === value.type}
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="pack" sx={{ marginBottom: 1 }}>Pack</InputLabel>
                        <Autocomplete
                            id="pack"
                            variant="outlined"
                            fullWidth
                            options={packs}
                            getOptionLabel={(option) => option.name}
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
                                    error={!!errors.packId}
                                    helperText={errors.packId}
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
                            value={packs.find(option => option.id === participant?.packId) || null}
                            onChange={(e, newValue) => handleChange({ target: { name: "packId", value: newValue ? newValue.id : null } })}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                    </Box>
                    {(participant?.packId === 1 || participant?.packId === 6 || participant?.packId === 11 || participant?.packId === 12) &&
                        <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                            <InputLabel htmlFor="mailHebergeur" sx={{ marginBottom: 1 }}>Email hebergeur</InputLabel>
                            <TextField id="mailHebergeur"
                                placeholder="Email hebergeur"
                                variant="outlined"
                                value={participant?.mailHebergeur || ''}
                                onChange={handleChange}
                                fullWidth
                                name="mailHebergeur"
                                error={!!errors.mailHebergeur}
                                helperText={errors.mailHebergeur}
                            />
                        </Box>
                    }
                    <Divider sx={{ mb: 1 }} />
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
                                checked={participant?.isVegan}
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
                                value={participant?.allergies ? allergies.filter(allergy => {
                                    const allergiesArray = participant.allergies.split(',').map(a => a.trim());
                                    return allergiesArray.includes(allergy.value);
                                }) : []}
                                onChange={(e, newValue) => {
                                    const allergiesString = newValue && newValue.length > 0 ? newValue.map(a => a.value).join(',') : null;
                                    setParticipant({ 
                                        ...participant, 
                                        allergies: allergiesString,
                                        hasAllergies: newValue && newValue.length > 0 
                                    });
                                }}
                                isOptionEqualToValue={(option, value) => option.value === value.value}
                            />
                        </Box>
                    </Box>
                    <Divider sx={{ mb: 1, mt: 1 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>Goodies</Typography>
                    {goodies.map((goodie) => (
                        <Box key={goodie.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 1 }}>
                            <Checkbox
                                sx={{
                                    color: "primary.main",
                                    '&.Mui-checked': {
                                        color: "primary.main",
                                    },
                                }}
                                checked={participant?.productsIds?.includes(goodie.id)}
                                onChange={(e, checked) => handleCheckboxChange(goodie.id, checked)}
                            />
                            <Typography sx={{ ml: 2 }}>{goodie.name}</Typography>
                        </Box>
                    ))}
                    <Button variant="contained" sx={{ mt: 2 }} fullWidth onClick={handleSubmit}>Enregistrer</Button>
                </Box>
            </Box>
        </Drawer>
    );
};

AddParticipant.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    goodies: PropTypes.array.isRequired,
    packs: PropTypes.array.isRequired,
    teamId: PropTypes.string.isRequired
};

export default AddParticipant;