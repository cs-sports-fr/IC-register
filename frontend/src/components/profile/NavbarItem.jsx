
import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';


const NavbarItem = ({ title, onClick, active, id }) => {


    return (
        <Box onClick={() => onClick(id)}
            sx={{
                cursor: "pointer", marginY: 1.5, display: 'flex',
                alignItems: 'center', backgroundColor: active && 'grey.700',
                borderRadius: '0.3rem',
                p: 1,
            }}
        >
            <Typography sx={{ color: active && 'primary.main', flex: 1 }}>{title}</Typography>
        </Box>
    );
};

NavbarItem.propTypes = {
    title: PropTypes.string.isRequired,
    active: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
    id: PropTypes.number.isRequired,
};

export default NavbarItem;