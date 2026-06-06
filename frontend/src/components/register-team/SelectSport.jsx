import { Autocomplete, Box, Button, ListItem, ListItemText, TextField, Typography } from "@mui/material";
import { useState } from "react";
import PropTypes from 'prop-types';

const SelectSport = ({ callback, sports, callbackType }) => {

    const [sportId, setSportId] = useState(null);

    const sportsOptions = sports.flatMap((sport) => {
        if (sport.sport !== 'Escrime') {
            return [{ ...sport, optionId: `${sport.id}` }];
        }
        return [
            { ...sport, optionId: `${sport.id}-epee`, sport: 'Escrime - Épée', escrimeSection: 'Epee' },
            { ...sport, optionId: `${sport.id}-fleuret`, sport: 'Escrime - Fleuret', escrimeSection: 'Fleuret' },
            { ...sport, optionId: `${sport.id}-sabre`, sport: 'Escrime - Sabre', escrimeSection: 'Sabre' },
        ];
    });

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
            <Typography variant="h4" color="textPrimary" my={3} sx={{ fontWeight: 'bold' }}>
                Choix du sport
            </Typography>

            <Box sx={{ width: '20rem' }}>
                <Autocomplete
                    id="sport"
                    variant="outlined"
                    fullWidth
                    options={sportsOptions}
                    getOptionLabel={(option) => option.sport}
                    renderInput={(params) =>
                        <TextField {...params}
                            placeholder="Rechercher votre sport..."
                            InputLabelProps={{ shrink: true }}
                            inputProps={{
                                ...params.inputProps,
                                style: { paddingTop: 0 },
                            }}
                        />
                    }
                    renderOption={(props, option) => (
                        <ListItem key={option.optionId} {...props} variant="school">
                            <ListItemText primary={option.sport} />
                        </ListItem>
                    )}
                    value={sportId}
                    onChange={(event, value) => setSportId(value)}
                    isOptionEqualToValue={(option, value) => option.optionId === value.optionId}
                />
                <Button
                    fullWidth
                    sx={{ my: 2 }}
                    disabled={!sportId}
                    onClick={() => {
                        callbackType(sportId.isCollective ?? false);
                        callback(sportId);
                    }}
                >
                    Valider
                </Button>
            </Box>
        </Box>
    );
};

SelectSport.propTypes = {
    callback: PropTypes.func.isRequired,
    sports: PropTypes.array.isRequired,
    callbackType: PropTypes.func.isRequired,
};

export default SelectSport;
