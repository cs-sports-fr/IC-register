import { Card, CardContent, Typography, Box } from "@mui/material";
import PropTypes from 'prop-types';

function UserTimeline({ minHeight }) {
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
                    Le déroulé de ton inscription
                </Typography>
                
                <Box 
                    sx={{ 
                        display: 'flex',  // Alignement horizontal
                        justifyContent: 'space-evenly', // Espacement égal entre les étapes
                        width: '100%',  // Prendre toute la largeur disponible
                        alignItems: 'center', // Alignement des étapes verticalement
                    }}
                >
                    {steps.map((step, index) => (
                        <Box 
                            key={index} 
                            sx={{
                                display: 'flex',
                                marginTop: '1rem',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '10px',
                                borderRadius: '8px',
                                backgroundColor: 'background.paper',  // Fond de l'étape
                                position: 'relative',  // Nécessaire pour positionner la description
                                overflow: 'hidden',  // Assure qu'aucune espace n'est pris
                                height: '160px', // Fixer une hauteur constante pour chaque étape
                                '&:hover .description': {
                                    opacity: 1,          // Rendre visible la description au survol
                                    transform: 'scale(1)', // Développer l'élément avec une transition fluide
                                    visibility: 'visible', // Assurer la visibilité de la description
                                    transition: 'opacity 0.3s ease, transform 0.3s ease', // Animation douce
                                }
                            }}
                        >
                            {/* Pictogramme de l'étape */}
                            <Box
                             sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',}}
                        >
                            <Box 
                                sx={{
                                    width: '50px', 
                                    height: '50px', 
                                    borderRadius: '50%', 
                                    backgroundColor: 'primary.main', 
                                    color: 'white', 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    fontWeight: 'bold'
                                }}
                            >
                                <Typography variant="body1">{index + 1}</Typography>
                            
                            </Box>

                            {/* Titre de l'étape */}
                            <Typography variant="h6" sx={{ fontWeight: 'bold', marginTop: '10px' }}>
                                {step.title}
                            </Typography>

                            </Box>

                            {/* Description de l'étape - cachée par défaut */}
                            <Typography 
                                variant="body2" 
                                className="description" 
                                sx={{
                                    marginTop: '5px', 
                                    textAlign: 'center', 
                                    opacity: 0,     // Cacher la description au départ
                                    visibility: 'hidden', // Cacher la description au départ
                                    transform: 'scale(0.8)', // Description plus petite par défaut
                                    transition: 'opacity 0.3s ease, transform 0.3s ease', // Transition fluide
                                    overflow: 'hidden',   // Assure qu'il n'y a pas d'espace pris
                                    lineHeight: '1.5em',   // Ajuster pour que la description occupe l'espace une fois visible
                                    maxWidth: '20rem',  // Limite la largeur de la description pour qu'elle ne prenne pas trop de place
                                }}
                            >
                                {step.description}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}

UserTimeline.propTypes = {
    minHeight: PropTypes.string.isRequired
};

export default UserTimeline;
