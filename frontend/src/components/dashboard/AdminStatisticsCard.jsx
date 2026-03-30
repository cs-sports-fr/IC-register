import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import LinearProgressText from '../LinearProgressText';

const AdminStatisticsCard = ({ }) => {

    return (
        <Card variant='outlined' sx={{ borderRadius: '0.8rem', height: '25vh' }}>
            <CardHeader title='Statistiques' />
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Typography>Nombre</Typography>
                </Box>

                <Box sx={{}}>
                    <LinearProgressText valuePercent={75} value={50} text={"En liste principale"} />
                    <LinearProgressText valuePercent={35} value={80} text={"En liste d'attente"} />
                </Box>

            </CardContent>
        </Card>
    );
}

AdminStatisticsCard.propTypes = {

};

export default AdminStatisticsCard;