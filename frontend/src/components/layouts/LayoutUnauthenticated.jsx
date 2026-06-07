import { Box } from "@mui/material";
import PropTypes from 'prop-types';

function LayoutUnauthenticated({ isDarkMode, children }) {
    return (
        <Box sx={{ height: '100vh' }}>
            <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 20 }}>
                <img
                    src="/images/logo_ic.png"
                    alt="Logo IC"
                    width={50}
                    height={50}
                />
            </Box>
            {children}
        </Box>
    );
}

LayoutUnauthenticated.propTypes = {
    isDarkMode: PropTypes.bool.isRequired,
    children: PropTypes.node.isRequired,
};

export default LayoutUnauthenticated;