import { Card, CardContent, Typography, Button, Box } from "@mui/material";
import PropTypes from 'prop-types';


function ToPayCard({ minHeight, payments }) {
    return (
        <Card variant='outlined' sx={{ borderRadius: '0.8rem', minHeight: minHeight }}>
            <CardContent sx={{ minheight: `calc(${minHeight} - 40px)`, display: 'flex', justifyContent: 'space-between', flexDirection: 'column' }}>
                <Typography variant="h5" sx={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center',mt:"1rem" }}>
                    Somme à payer
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="h3">
                        {payments?.PrincipalList?.amountToPay} €
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection:'column', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem',gap:5}}>
                    <Typography >
                        {payments?.PrincipalList?.amountToPay + payments?.Waiting?.amountToPay} € (avec liste d&apos;attente)
                    </Typography>
                    <Box>            
                        <Button sx={{ px: 8, fontWeight:'bold' }} href="/payment">
                            Voir détail
                        </Button>
                    </Box>   
                </Box>
            </CardContent>
        </Card>
    );
}

ToPayCard.propTypes = {
    minHeight: PropTypes.string,
    payments: PropTypes.object.isRequired
};

export default ToPayCard;
