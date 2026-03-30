import { Box } from "@mui/material";

import PropTypes from 'prop-types';

function LayoutUnauthenticated({ isDarkMode, children }) {

    return (
        <Box sx={{ height: '100vh' }}>
            <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 20 }}>
                <img
                    src={isDarkMode ? "/images/logo_toss_light.png" : "/images/logo_toss_dark.png"}
                    alt="Logo Toss"
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