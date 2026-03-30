
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';  // Importer l'icône CheckCircle
import InfoIcon from '@mui/icons-material/Info';  // Importer l'icône Info

function Pack() {
  const packs = [
    {
      price: "45€",
      title: "Basique",
      details: [
        "Inscription au tournoi",
        "Accès aux activités",
        "Accès à la soirée",
      ],
    },
    {
      price: "54€",
      title: "Lunch only",
      details: [
        "Inscription au tournoi",
        "Accès aux activités",
        "Accès à la soirée",
        "Déjeuner compris",
      ],
    },
    {
      price: "62€",
      title: "Full restauration",
      details: [
        "Inscription au tournoi",
        "Accès aux activités",
        "Accès à la soirée",
        "Déjeuner et dîner",
      ],
    },
    {
      price: "73€",
      title: "Hébergement en tente",
      details: [
        "Inscription au tournoi",
        "Accès aux activités",
        "Accès à la soirée",
        "Petit Dej, Déjeuner et dîner",
        "Hébergement en tente",
        "Réservé aux écoles en dehors d'IDF",

      ],
    },
    {
      price: "63€",
      title: "Hébergement chez un ami",
      details: [
        "Inscription au tournoi",
        "Accès aux activités",
        "Accès à la soirée",
        "Petit Dej, Déjeuner et dîner",
        "Hébergement en résidence chez un ami",
      ],
    },
    {
      price: "55€",
      title: "Hébergement chez un ami sans dîner",
      details: [
        "Inscription au tournoi",
        "Accès aux activités",
        "Accès à la soirée",
        "Petit Dej et Déjeuner",
        "Hébergement en résidence chez un ami ",
      ],
    },
  ];
   // Nouvelle constante pour les options
   const options = [
    {
        title: "Supplément Équitation",
        price: "15€",
    },
    {
        title: "Supplément Golf",
        price: "20€",
    },
];

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#161C24',
    }}>
      <Box sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 2,
        overflowX: 'auto',
        px: 10,
        py: 3,
      }}>
        {packs.map((item, index) => (
          <Box key={index} sx={{
            p: 3,
            width: '200px',
            height: '350px',
            background: 'linear-gradient(180deg, #F4EDEC 0%, #E5DDEC 100%)',
            borderRadius: '10px',
            boxShadow: 3,
            ':hover': {
              cursor: 'pointer',
              backgroundColor: '#F1D7DB',
            },
            position: 'relative',
          }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
            }}>
              <Typography sx={{
                color: 'black',
                fontWeight: 'bold',
                fontSize: '1.8rem',
                height: '2rem',
              }}>
                {item.price}
              </Typography>
              <Typography sx={{
                color: 'black',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                textAlign: 'center',
                height: '3rem',
              }}>
                {item.title}
              </Typography>
              
            </Box>

            <Box sx={{ mt: 2 }}>
              {item.details.map((detail, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircleIcon sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography sx={{ color: 'black', fontSize: '1rem' }}>
                    {detail}
                  </Typography>
                </Box>
              ))}
            </Box>
            {item.title === "Hébergement chez un ami" && (
    <Box sx={{ 
        position: 'absolute',
        right: '0',
                    top:'0',
    }}>
        <Tooltip title="Ce pack est obligatoire pour accéder aux résidences Césal. Les 2€ supplémentaires (par rapport au pack sans hébergement) contribuent au financement de la sécurité renforcée des résidences." placement="top">
            <IconButton size="small">
                <InfoIcon sx={{ color: 'primary.main' }} />
            </IconButton>
        </Tooltip>
    </Box>
)}
{item.title === "Hébergement chez un ami sans dîner" && (
                <Box sx={{ 
                    position: 'absolute',
                    right: '0',
                    top:'0',
                }}>
                    <Tooltip title="Ce pack est obligatoire pour accéder aux résidences Césal. Les 2€ supplémentaires (par rapport au pack sans hébergement) contribuent au financement de la sécurité renforcée des résidences." placement="top">
                        <IconButton size="small">
                            <InfoIcon sx={{ color: 'primary.main' }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}
{item.title === "Hébergement en tente" && (
                <Box sx={{ 
                    position: 'absolute',
                    right: '0',
                    top:'0',
                }}>
                    <Tooltip title="Ce pack est  réservé aux écoles en dehors d'IDF." placement="top">
                        <IconButton size="small">
                            <InfoIcon sx={{ color: 'primary.main' }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

          </Box>
          
        ))}
      </Box>

      <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 3,
                background: 'transparent', // Fond transparent pour conserver le dégradé général
                mt: 5,
            }}>
                <Typography sx={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '2rem',
                }}>
                    Suppléments
                </Typography>
            </Box>
            
            <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 2,
                overflowX: 'auto',
                px: 10,
                py: 3,
            }}>
                {options.map((option, index) => (
                    <Box
                        key={index}
                        sx={{
                            p: 3,
                            width: '8rem',
                            height: '8rem',
                            background: 'linear-gradient(180deg, #F4EDEC 0%, #E5DDEC 100%)', // Dégradé dans les boxes
                            borderRadius: '10px',
                            boxShadow: 3,
                        }}
                    >
                        {/* Prix de l'option au-dessus du nom */}
                        <Typography sx={{
                            color: 'black',
                            fontWeight: 'bold',
                            fontSize: { xs: '1.5rem', md: '1.8rem' },
                            textAlign: 'center',
                        }}>
                            {option.price}
                        </Typography>

                        {/* Nom de l'option */}
                        <Typography sx={{
                            color: 'black',
                            fontWeight: 'bold',
                            fontSize: '1.25rem',
                            textAlign: 'center',
                            mt: 0.5,  // Réduction de la marge sous le nom de l'option
                        }}>
                            {option.title}
                        </Typography>
                    </Box>
                ))}
            </Box>
            
        </Box>
  );
}

export default Pack;
