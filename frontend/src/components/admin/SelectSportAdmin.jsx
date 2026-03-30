import { Autocomplete, Box, Button, Divider, ListItem, ListItemText, TextField, Typography } from "@mui/material";
import { useState } from "react";
import PropTypes from 'prop-types';
import { useAuth } from "../../provider/authProvider";
import { useNavigate } from "react-router-dom";

const SelectSportAdmin = ({ callback, sports }) => {

    const [sportId, setSportId] = useState(null);
    const handleChange = (event, value) => {
        setSportId(value);
    }

    const { permission, sportAdminId } = useAuth();
    const navigation = useNavigate();

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                margin: "auto",
                height: "100%",
                backgroundColor: 'background.paper',
                flexGrow: 1
            }}
        >
            <Typography variant="h4" color="textPrimary" my={3}>
                Choix du sport
            </Typography>



            <Box
                sx={{
                    width: '20rem'
                }}
            >
                <Autocomplete id="school"
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
                <Button fullWidth sx={{ my: 2 }}
                    onClick={() => callback(sportId)}
                >Valider</Button>
            </Box>

            {permission === "AdminStatus" && <>
                <Divider sx={{ width: '20rem', my: 5 }} />
                <Button variant="contained" sx={{ width: '20rem' }} onClick={() => navigation("/sport/" + sportAdminId)}>Mon sport</Button>
            </>}

        </Box >
    );

};

SelectSportAdmin.propTypes = {
    callback: PropTypes.func.isRequired,
    sports: PropTypes.array.isRequired,
};

export default SelectSportAdmin;