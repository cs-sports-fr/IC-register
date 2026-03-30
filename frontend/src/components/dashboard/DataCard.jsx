import { Box, Card, CardContent, CardHeader, LinearProgress, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const DataCard = ({ title, value, maxValue }) => {

    return (
        <Card variant='outlined' sx={{ borderRadius: '0.8rem', height: '25vh' }}>
            <CardHeader title={title} />
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant='h3' sx={{ m: 2 }}>{value}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant='subtitle1'>{`${((value / maxValue) * 100).toFixed(0)}%`}</Typography>
                    <Typography variant='subtitle1'>{maxValue}</Typography>
                </Box>
                <Box>
                    <LinearProgress variant='determinate' value={(value / maxValue) * 100} />
                </Box>

            </CardContent>
        </Card>
    );
}

DataCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    maxValue: PropTypes.number.isRequired,
};

export default DataCard;