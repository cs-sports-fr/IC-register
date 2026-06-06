import { Autocomplete, Box, Button, Checkbox, Drawer, InputLabel, ListItem, ListItemText, TextField, Typography } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import gender from "../../assets/gender.json";
import allergies from "../../assets/allergies.json"
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { useState } from 'react';
import * as yup from 'yup';
import { useSnackbar } from '../../provider/snackbarProvider';
import { ApiICConnected } from '../../service/axios';

const AddParticipant = ({ open, onClose, packs, teamId }) => {

    const { showSnackbar } = useSnackbar();

    const initState = {
        firstname: null,
        lastname: null,
        dateOfBirth: null,
        gender: null,
        packId: null,
        allergies: null,
        insurance: false,
    }
    const [participant, setParticipant] = useState(initState);
    const [errors, setErrors] = useState({});

    const playerSchema = yup.object().shape({
        firstname: yup.string().required('Prénom requis'),
        lastname: yup.string().required('Nom requis'),
        dateOfBirth: yup.date().required('Date de naissance requise'),
        gender: yup.string().required('Genre requis'),
        packId: yup.number().nullable().required('Pack requis'),
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setParticipant({ ...participant, [name]: value })
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
                            name="lastname"
                            error={!!errors.lastname}
                            helperText={errors.lastname}
                        />
                    </Box>

                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="dateOfBirth" sx={{ marginBottom: 1 }}>Date de naissance</InputLabel>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                            <DatePicker
                                disableFuture
                                value={participant?.dateOfBirth ? dayjs(participant.dateOfBirth) : null}
                                onChange={(newValue) => handleChange({ target: { name: "dateOfBirth", value: newValue ? new Date(newValue?.toDate()) : null } })}
                                name="dateOfBirth"
                                sx={{ width: '100%' }}
                            />
                        </LocalizationProvider>
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
                                    inputProps={{ ...params.inputProps, style: { paddingTop: 0 } }}
                                    error={!!errors.gender}
                                    helperText={errors.gender}
                                />}
                            renderOption={(props, option) => (
                                <ListItem key={option.id} {...props} variant="school">
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
                            getOptionLabel={(option) => `${option.name} (${(option.price_in_cents / 100).toFixed(2)} €)`}
                            renderInput={(params) =>
                                <TextField {...params}
                                    placeholder="Sélectionner un pack"
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ ...params.inputProps, style: { paddingTop: 0 } }}
                                    error={!!errors.packId}
                                    helperText={errors.packId}
                                />}
                            renderOption={(props, option) => (
                                <ListItem key={option.id} {...props} variant="school">
                                    <ListItemText
                                        primary={option.name}
                                        secondary={`${(option.price_in_cents / 100).toFixed(2)} €`}
                                    />
                                </ListItem>
                            )}
                            value={packs.find(option => option.id === participant?.packId) || null}
                            onChange={(e, newValue) => handleChange({ target: { name: "packId", value: newValue ? newValue.id : null } })}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
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
                            }}
                            renderOption={(props, option) => (
                                <ListItem key={option.id} {...props} variant="school">
                                    <ListItemText primary={option.label} />
                                </ListItem>
                            )}
                            value={participant?.allergies ? allergies.filter(allergy => {
                                const allergiesArray = participant.allergies.split(',').map(a => a.trim());
                                return allergiesArray.includes(allergy.value);
                            }) : []}
                            onChange={(e, newValue) => {
                                const allergiesString = newValue && newValue.length > 0 ? newValue.map(a => a.value).join(',') : null;
                                setParticipant({ ...participant, allergies: allergiesString });
                            }}
                            isOptionEqualToValue={(option, value) => option.value === value.value}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Checkbox
                            sx={{ color: "primary.main", '&.Mui-checked': { color: "primary.main" } }}
                            checked={participant?.insurance || false}
                            onChange={(e, checked) => handleChange({ target: { name: "insurance", value: checked } })}
                        />
                        <Typography sx={{ ml: 2 }}>Assurance sportive</Typography>
                    </Box>

                    <Button variant="contained" sx={{ mt: 2 }} fullWidth onClick={handleSubmit}>Enregistrer</Button>
                </Box>
            </Box>
        </Drawer>
    );
};

AddParticipant.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    packs: PropTypes.array.isRequired,
    teamId: PropTypes.string.isRequired
};

export default AddParticipant;
