import { Box, LinearProgress, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const LinearProgressText = ({ valuePercent, text, value, ...props }) => {

    return (
        <Box sx={{ my: 2, position: 'relative' }}>
            <LinearProgress variant="determinate" value={valuePercent} {...props}
                sx={{ height: '1.6rem', borderRadius: '0.3rem' }}
            />
            <Box
                top={0}
                left={0}
                bottom={0}
                right={0}
                position="absolute"
                display="flex"
                alignItems="center"
                justifyContent="flex-start"
                sx={{ pl: 2 }}
            >
                <Typography variant="body2" color="textPrimary">{text}</Typography>
            </Box>
            <Box
                top={0}
                left={0}
                bottom={0}
                right={0}
                position="absolute"
                display="flex"
                alignItems="center"
                justifyContent="flex-end"
                sx={{ pr: 2 }}
            >
                <Typography variant="body2" color="textPrimary" sx={{ fontWeight: 'bold' }}>{value}</Typography>
            </Box>
        </Box>
    );
}

LinearProgressText.propTypes = {
    valuePercent: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
    text: PropTypes.string,
};

export default LinearProgressText;