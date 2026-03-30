import { Box, Button, Drawer, InputLabel, Switch, TextField, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { ApiTossConnected } from '../../service/axios';
import { useSnackbar } from '../../provider/snackbarProvider';


const ModifySchool = ({ open, onClose, schoolInput }) => {

    const { showSnackbar } = useSnackbar();

    const [school, setSchool] = useState(schoolInput);
    useEffect(() => {
        setSchool(schoolInput);
    }, [schoolInput]);

    const handleChange = (e) => {
        const { id, value, checked, type } = e.target;
        setSchool(prevState => ({
            ...prevState,
            [id]: type === "checkbox" ? checked : value,
        }));
    }

    const handleValidate = () => {
        // Make sure we're sending all required parameters
        ApiTossConnected.put(`/schools/${school.id}`, null, {
            params: {
                name: school.name,
                is_in_idf: school.isInIDF || false, 
                is_deleg: school.isDeleg || false,
                is_paid: school.isPaid || false,
                is_caution_paid: school.isCautionPaid || false,
            }
        }).then(() => {
            showSnackbar('Ecole modifiée', 3000, 'success');
            onClose();
        }).catch(error => {
            console.error("Error updating school:", error.response?.data || error);
            showSnackbar('Erreur lors de la modification', 3000, 'error');
        });
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
                        <Typography variant={'h5'} sx={{ mb: 1, justifyContent: 'center' }}>Modification d&apos;une école</Typography>
                    </Box>

                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="name" sx={{ marginBottom: 1 }}>Nom</InputLabel>
                        <TextField id="name"
                            placeholder="Nom de l'école"
                            variant="outlined"
                            value={school?.name || ''}
                            onChange={handleChange}
                            fullWidth
                            autoComplete="firstname"
                            name="name" // Fix name attribute to match id
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="isInIDF" sx={{ marginBottom: 1 }}>IDF</InputLabel>
                        <Switch id="isInIDF"
                            onChange={handleChange}
                            checked={school?.isInIDF || false}
                            name="isInIDF" // Add name attribute
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="isDeleg" sx={{ marginBottom: 1 }}>Deleg</InputLabel>
                        <Switch id="isDeleg"
                            onChange={handleChange}
                            checked={school?.isDeleg || false}
                            name="isDeleg" // Add name attribute
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="isPaid" sx={{ marginBottom: 1 }}>Paiement</InputLabel>
                        <Switch id="isPaid"
                            onChange={handleChange}
                            checked={school?.isPaid || false}
                            name="isPaid" // Add name attribute
                        />
                    </Box>
                    <Box sx={{ justifyContent: 'left', textAlign: 'left', mb: 2 }}>
                        <InputLabel htmlFor="isCautionPaid" sx={{ marginBottom: 1 }}>Caution</InputLabel>
                        <Switch id="isCautionPaid"
                            onChange={handleChange}
                            checked={school?.isCautionPaid || false}
                            name="isCautionPaid" // Add name attribute
                        />
                    </Box>
                    <Button onClick={handleValidate}>Valider</Button>
                </Box>
            </Box>
        </Drawer>
    );
}

ModifySchool.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    schoolInput: PropTypes.object,
};

export default ModifySchool;