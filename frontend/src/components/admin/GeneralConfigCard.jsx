import { Box, Button, Card, CardContent, CardHeader, InputLabel, Switch, TextField } from "@mui/material";
import { ApiTossConnected } from "../../service/axios";
import { useEffect, useState } from "react";
import { useSnackbar } from "../../provider/snackbarProvider";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";


const GeneralConfigCard = () => {

    const { showSnackbar } = useSnackbar();

    const [config, setConfig] = useState({
        editionYear: '',
        isRegistrationOpen: false,
        isPaymentOpen: false,
        expectedRegistrationDate: '',
    });

    const fetchData = () => {
        ApiTossConnected.get('/config').then(response => {
            setConfig(response.data);
        }
        ).catch(error => {
            console.log(error);
        });
    }

    useEffect(() => {
        fetchData();
    }, []);

    const handleModify = (e) => {
        const { id, value, checked, type } = e.target;
        setConfig(prevState => ({
            ...prevState,
            [id]: type === 'checkbox' ? checked : value,
        }));
    }

    const handleSave = () => {
        ApiTossConnected.put('/config', config).then(() => {
            showSnackbar('Configuration modifiée', 3000, 'success');
            fetchData();
        }).catch(error => {
            console.log(error);
            showSnackbar('Erreur lors de la modification', 3000, 'error');
        });
    }

    return (
        <Card variant='outlined' sx={{ borderRadius: '0.8rem' }}>
            <CardHeader title='Configuration' />
            <CardContent>
                <Box sx={{}}>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="editionYear" sx={{ marginBottom: 1 }}>Edition</InputLabel>
                        <TextField id="editionYear"
                            placeholder="année"
                            variant="outlined"
                            value={config?.editionYear}
                            onChange={handleModify}
                            fullWidth
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="isRegistrationOpen" sx={{ marginBottom: 1 }}>Inscription ouverte</InputLabel>
                        <Switch id="isRegistrationOpen"
                            onChange={handleModify}
                            checked={config?.isRegistrationOpen}
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="expectedRegistrationDate" sx={{ marginBottom: 1 }}>Date d&apos;ouverture des inscription&apos;</InputLabel>
                        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                            <DateTimePicker
                                value={config?.expectedRegistrationDate ? dayjs(config?.expectedRegistrationDate) : null}
                                onChange={(newValue) => handleModify({ target: { id: "expectedRegistrationDate", value: newValue ? new Date(newValue?.toDate()) : null } })}
                                name="expectedRegistrationDate"
                                sx={{ width: '100%' }}
                            />
                        </LocalizationProvider>
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="isPaymentOpen" sx={{ marginBottom: 1 }}>Paiement ouvert</InputLabel>
                        <Switch id="isPaymentOpen"
                            checked={config?.isPaymentOpen}
                            onChange={handleModify}
                        />
                    </Box>
                    <Button variant="contained" onClick={handleSave}>Modifier</Button>
                </Box>
            </CardContent>
        </Card>
    );
}

export default GeneralConfigCard;