import { Card, CardContent, Typography } from "@mui/material";
import PropTypes from 'prop-types';


function FunctioningCard({ minHeight }) {
    return (
        <Card variant='outlined' sx={{ borderRadius: '0.8rem', minHeight: minHeight, maxHeight: '100%', overflowY: 'auto' }}>
            <CardContent>
                <Typography variant="h5" sx={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', mb: 1 }}>
                    Inscription fonctionnement
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '0.93rem', textAlign: 'left' }}>
                    Il faut un certificat ou une licence pour participer. Le numéro de licence FFSU peut être ajouté lors de l&apos;inscription ou la modification des joueurs.
                    Un certificat médical ou CERFA doit être ajouté après l&apos;inscription avec l&apos;option modification des joueurs.
                    Le lien du cerfa : <a href="https://cs-sports.fr/BDS/fichiers_telechargeables/questionnaire_sante.pdf">CERFA</a>
                    <br/>
                    Voici l'attestation santé à compléter et signer et mettre en ligne au format pdf :
                    <a href="https://cs-sports.fr/BDS/fichiers_telechargeables/attestation_sante.docx">L'attestation santé </a>
                    Pour les sports de contacts, un certificat médical est obligatoire et devra dater de moins d'un an le 8-10 mai.<br/>
                    
                </Typography>
            </CardContent>
        </Card >
    );
}

FunctioningCard.propTypes = {
    minHeight: PropTypes.string,
};

export default FunctioningCard;
