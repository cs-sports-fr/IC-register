import { Divider, Typography, Box } from '@mui/material';
import PropTypes from 'prop-types';

function DividerText(props) {
    const { text } = props;

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2.5 }}>
            <Divider variant='lighter' sx={{ flexGrow: 1, mr: 2 }} />
            <Typography align="center" variant='separator'>{text}</Typography>
            <Divider variant='lighter' sx={{ flexGrow: 1, ml: 2 }} />
        </Box>
    );
}

DividerText.propTypes = {
    text: PropTypes.string.isRequired,
};

export default DividerText;
