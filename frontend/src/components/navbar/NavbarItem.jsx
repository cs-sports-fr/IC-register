import { Box, Link } from "@mui/material"

import PropTypes from 'prop-types';
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";


const NavbarItem = ({ item }) => {

    const location = useLocation()

    const [active, setActive] = useState(false)

    useEffect(() => {
        if (location.pathname == item.path) {
            setActive(true)
        } else {
            setActive(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location])


    return (
        <Box
            sx={{
                marginX: 1,
                flexShrink: 0,
                position: 'relative',
                height: '4rem',
                display: 'flex',
                alignItems: 'center',
                borderBottom: active ? '3px solid' : '3px solid',
                borderBottomColor: active ? 'primary.main' : 'transparent',
                '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: '-2px', 
                            left: 0,
                            width: '100%',
                            height: '2px', 
                            backgroundColor: 'primary.main', 
                            transform: 'scaleX(0)', 
                            transformOrigin: 'middle', 
                            transition: 'transform 0.25s ease-in-out', 
                        },
                '&:hover::after': {
                transform: 'scaleX(1)', 
                },
            }}
        >
            <Link
                href={item.path}
                underline="none"
                color="text.primary"
                sx={{
                    verticalAlign: 'center',
                    
                }}
            >
                {item.name}
            </Link>
        </Box >
    )
}


NavbarItem.propTypes = {
    item: PropTypes.object.isRequired,
};

export default NavbarItem