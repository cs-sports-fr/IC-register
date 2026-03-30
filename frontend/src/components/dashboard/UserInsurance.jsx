import { Card, CardContent, Typography, Box } from "@mui/material";
import PropTypes from 'prop-types';

function UserInsurance({ minHeight }) {
    // Définir les étapes directement ici
    const steps = [
        { 
            title: "Dossier Incomplet", 
            description: "Vous devez fournir les certificats médicaux ou les attestations de CERFA et valider les chartes d’inscription."
        },
        { 
            title: "En attente", 
            description: "Vous serez contacté·es dès que votre équipe sera sélectionnée."
        },
        { 
            title: "Sélectionné·e", 
            description: "Vous devez procéder au paiement."
        },
        { 
            title: "Inscrit·e", 
            description: "C’est bon, vous êtes officiellement inscrit·es au tournoi !"
        }
    ];

    // Vérifie si 'steps' est un tableau non vide
    if (!Array.isArray(steps) || steps.length === 0) {
        return (
            <Card variant='outlined' sx={{ borderRadius: '0.8rem', minHeight: minHeight }}>
                <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                    <Typography variant="h5" sx={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2em', textAlign: 'center' }}>
                        Aucune étape disponible
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant='outlined' sx={{ borderRadius: '0.8rem', minHeight: minHeight }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography 
                    variant="h5" 
                    sx={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center', mt:"1rem" }}
                >
                    Mise à jour importante concernant les inscriptions
                </Typography>
                
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-evenly',
                        width: '100%',
                        alignItems: 'center',
                    }}
                >
                    <Typography>
                    Nous souhaitons vous informer que cette année, le TOSS n’est pas labellisé par la FFSU. <br /><br />
                    Cette décision a été prise car la FFSU imposait cette année que tous nos participants soient licenciés chez eux, ce qui aurait causé un surcout de 35€ pour tous les non licenciés. <br /><br />Cette obligation aurait impliqué un coût supplémentaire de 35€ pour chaque participant non licencié, ce qui allait à l’encontre de notre volonté de rendre le tournoi accessible à tous. D’autres grands tournois étudiants, comme le CCL, ont également fait ce choix.

<br /><br />Ce choix n’enlève rien à la protection des participants : tous nos participants seront couverts par notre assurance tout au long du week-end, offrant les mêmes garanties que celles de la FFSU. <br /><br /><strong>   Du point de vue du participant, cela ne change donc absolument rien par rapport aux années précédentes.</strong>

 <br /><br />
Vous pourrez retrouver notre <a href="https://toss-images.s3.eu-west-3.amazonaws.com/documents/RC+TOSS+2025+finale+modifiee.pdf">attestation d'assurance</a>.
                    </Typography>
                </Box>

            </CardContent>
        </Card>
    );
}

UserInsurance.propTypes = {
    minHeight: PropTypes.string.isRequired
};

export default UserInsurance;
