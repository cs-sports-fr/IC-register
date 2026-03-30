import { Autocomplete, Box, Button, Divider, Drawer, ListItem, ListItemText, TextField, Typography } from "@mui/material";
import PropTypes from 'prop-types';
import { useEffect, useState } from "react";
import { ApiTossConnected } from "../../service/axios";
import { useSnackbar } from "../../provider/snackbarProvider";

const ModifyUserStatus = ({ open, onClose, user }) => {

    const { showSnackbar } = useSnackbar();

    const [sports, setSports] = useState([]);
    const fetchSports = () => {
        ApiTossConnected.get('sports')
            .then((response) => {
                setSports(response.data);
            }).catch((error) => {
                console.log(error);
            });
    }
    useEffect(() => {
        if (user?.status !== 'AdminStatus') {
            fetchSports();
        }
    }, [user]);

    const [sportId, setSportId] = useState(null);
    const handleChange = (event, value) => {
        setSportId(value);
    }

    const handleChangeStatus = (status, sportId) => {
        if (status === 'UserStatus' || status === 'SuperAdminStatus' || status === 'RespoDelegStatus') {
            ApiTossConnected.put(`users/${user.id}/status?new_status=${status}`)
                .then(() => {
                    showSnackbar('Modification effectuée avec succès', 3000, 'success',);
                }
                ).catch((error) => {
                    console.log(error);
                    showSnackbar('Erreur lors de la modification', 3000, 'error',);
                });

        } else if (status === 'AdminStatus') {
            console.log(sportId);
            ApiTossConnected.put(`users/${user.id}/status?new_status=${status}&sportId=${sportId}`)
                .then(() => {
                    showSnackbar('Modification effectuée avec succès', 3000, 'success',);
                }
                ).catch((error) => {
                    console.log(error);
                    showSnackbar('Erreur lors de la modification', 3000, 'error',);
                });
        }
        onClose();
    }

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
        >
            <Box sx={{ width: '45vw' }}>
                <Box sx={{ m: 5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Typography variant={'h5'} sx={{ mb: 1, justifyContent: 'center' }}>Modification status</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        {user?.status !== 'UserStatus' &&
                            <>
                                <Button variant="contained" sx={{ mb: 5 }} onClick={() => handleChangeStatus("UserStatus", null)}>Passer en utilisateur</Button>
                                <Divider sx={{ mb: 2 }} />
                            </>
                        }

                        {user?.status !== 'RespoDelegStatus' &&
                            <>
                                <Button variant="contained" sx={{ mb: 5 }} onClick={() => handleChangeStatus("RespoDelegStatus", null)}>Passer en responsable de deleg</Button>
                                <Divider sx={{ mb: 2 }} />
                            </>
                        }

                        {user?.status !== 'AdminStatus' &&
                            <>
                                <Autocomplete id="sports"
                                    variant="outlined"
                                    fullWidth
                                    options={sports}
                                    getOptionLabel={(option) => option.sport}
                                    renderInput={(params) =>
                                        <TextField {...params}
                                            placeholder="Rechercher votre sport..."
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
                                            <ListItemText primary={option.sport} />
                                        </ListItem>
                                    )}
                                    value={sportId}
                                    onChange={handleChange}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                />
                                <Button variant="contained"
                                    sx={{ mt: 2 }}
                                    onClick={() => {
                                        if (!sportId) return showSnackbar('Veuillez choisir un sport', 2000, 'error',);
                                        handleChangeStatus("AdminStatus", sportId.id)
                                    }}
                                >Passer en Admin</Button>
                            </>}
                        {user?.status !== 'SuperAdminStatus' &&
                            <>
                                <Divider sx={{ mt: 2 }} />
                                <Button sx={{ mt: 2 }} variant="contained" onClick={() => handleChangeStatus("SuperAdminStatus", null)}>Passer en superAdmin</Button>
                            </>}
                    </Box>
                </Box>
            </Box>
        </Drawer>
    );
}

ModifyUserStatus.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    user: PropTypes.object.isRequired
};

export default ModifyUserStatus;