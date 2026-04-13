import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import Navbar from "../../components/navbar/Navbar";
import { routesForUser } from "../../routes/routes";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import Pack from "../../components/packsngoodies/Packs";
import Goodies from "../../components/packsngoodies/Goodies";

function UserPack() {
    // State to control which component to display
    const [selected, setSelected] = useState("pack");

    // Handle toggle change
    const handleToggle = (event, newSelection) => {
        if (newSelection !== null) {
            setSelected(newSelection);
        }
    };

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: '#161C24', // Appliquer le dégradé global pour toute la page
        }}>
            <Navbar navigation={routesForUser} />
            
            
            
            {/* Box for Toggle Button, centered at the top of the page */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '2rem', textAlign: 'center', mt: 5 }}>
                Tarifs IC 2026
                </Typography>
                <ToggleButtonGroup
                    value={selected}
                    exclusive
                    onChange={handleToggle}
                    aria-label="text alignment"
                    sx={{
                        mt: '2rem',
                        borderRadius: '50px',
                        padding: '5px',
                        display: 'flex',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                        backgroundColor: 'rgba(22, 28, 36, 0.8)', // Slightly transparent dark background
                    }}
                >
                    <ToggleButton value="pack" sx={{
                        color: selected === "pack" ? '#fff' : '#bbb',
                        bgcolor: selected === "pack" ? 'primary.main' : 'transparent', // Primary background when selected
                        borderRadius: '50px',
                        fontWeight: 'bold',
                        px: '2rem',
                        transition: 'all 0.3s ease',
                        border: '1px solid', 
                        borderColor: "primary.main",
                        '&:hover': {
                            transform: 'scale(1.05)',
                            bgcolor: selected === "pack" ? 'primary.main' : 'rgba(255, 255, 255, 0.1)', // Keep primary bg when selected, slight highlight when not
                        },
                        '&.Mui-selected': {
                            bgcolor: 'primary.main', // Ensure primary background when selected (handles edge cases)
                            '&:hover': {
                                bgcolor: 'primary.main', // Keep primary background on hover when selected
                            }
                        }
                    }}>
                        Packs
                    </ToggleButton>
                    <ToggleButton value="goodies" sx={{
                        color: selected === "goodies" ? '#fff' : '#bbb',
                        bgcolor: selected === "goodies" ? 'primary.main' : 'transparent', // Primary background when selected
                        borderRadius: '50px',
                        fontWeight: 'bold',
                        px: '2rem',
                        transition: 'all 0.3s ease',
                        border: '1px solid',
                        borderColor: "primary.main",
                        '&:hover': {
                            transform: 'scale(1.05)',
                            bgcolor: selected === "goodies" ? 'primary.main' : 'rgba(255, 255, 255, 0.1)', // Keep primary bg when selected, slight highlight when not
                        },
                        '&.Mui-selected': {
                            bgcolor: 'primary.main', // Ensure primary background when selected (handles edge cases)
                            '&:hover': {
                                bgcolor: 'primary.main', // Keep primary background on hover when selected
                            }
                        }
                    }}>
                        Goodies
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <Box sx={{mt:3}}>
            {/* Conditionally render the component based on the selected value */}
                {selected === "pack" ? <Pack /> : <Goodies />}
            </Box>
        </Box>
    );
}

export default UserPack;
