import { Box, Popover, Button, Link, Divider } from "@mui/material"
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AttributionIcon from '@mui/icons-material/Attribution';
import React from 'react';

const PopoverProfile = () => {

    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                height: '100%'
            }}
        >
            <Button
                aria-describedby={id}
                variant="contained"
                onClick={handleClick}
                sx={{
                    minWidth: 'auto',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    '&:hover': {
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                    },
                }}
            >
                <AccountCircleIcon sx={{
                    fontSize: 40,
                    '&:hover': {
                        color: 'primary.main'
                    },
                }} />
            </Button>
            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <Box
                    sx={{
                        p: 2
                    }}
                >
                    <Box>
                        <Link
                            href={'/profile'}
                            underline="none"
                            color="text.primary"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                '&:hover': {
                                    color: 'grey.700'
                                },
                            }}
                        >
                            <AccountCircleIcon sx={{
                                mr: 1

                            }} />
                            {'Profil'}
                        </Link>
                    </Box>
                    <Divider sx={{
                        marginTop: '0.7rem', marginBottom: '0.7rem'

                    }} />
                    <Box>
                        <Link
                            href={'/logout'}
                            underline="none"
                            color="text.primary"
                            sx={{
                                display: "flex",
                                alignItems: 'center',
                                '&:hover': {
                                    color: 'grey.700'
                                }
                            }}
                        >
                            <ExitToAppIcon sx={{ mr: 1 }} />
                            {'Déconnexion'}

                        </Link>
                    </Box>
                </Box>
            </Popover>
        </Box>
    );
};

export default PopoverProfile