import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------
// import { alpha } from '@mui/material/styles';

export default function Button(theme) {
    return {
        MuiButton: {
            styleOverrides: {
                root: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.375rem', // équivalent à rounded-md
                    padding: '0.5rem 1rem', // px-4 py-2
                    height: '2.5rem', // h-10
                    width: '100%', // w-full
                    fontSize: '0.875rem', // text-sm
                    fontWeight: 'medium', // font-medium
                    lineHeight: 1.75, // Ajustement pour text-sm
                    backgroundColor: theme.palette.primary.main, // bg-primary
                    color: theme.palette.primary.contrastText, // text-primary-foreground
                    transition: 'background-color 0.3s', // transition-colors
                    textTransform: 'none', // normal-case
                    '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.9), // hover:bg-primary/90
                    },
                    '&.Mui-disabled': {
                        pointerEvents: 'none', // disabled:pointer-events-none
                        opacity: 0.5, // disabled:opacity-50
                    },
                    '&:focus-visible': {
                        outline: 'none',
                        ring: 2, // focus-visible:ring-2
                        ringColor: theme.palette.primary.main, // focus-visible:ring-ring (à ajuster)
                        ringOffsetWidth: 2, // focus-visible:ring-offset-2
                        ringOffsetColor: theme.palette.background.paper, // ring-offset-background
                    },
                    boxShadow: 'none', // Assurez que le boxShadow soit désactivé par défaut
                },

                lighter: {
                    backgroundColor: theme.palette.primary.lighter, // Fond plus clair
                    color: theme.palette.primary.contrastTextLight, // Couleur de texte
                    '&:hover': {
                        backgroundColor: theme.palette.primary.light, // Fond un peu plus sombre au survol
                    },
                },

                yellow: {
                    backgroundColor: '#DBA802', // Fond plus clair
                    color: theme.palette.primary.contrastText, // Couleur de texte
                    '&:hover': {
                        backgroundColor: '#fdd249', // Fond un peu plus clair au survol
                    },
                },
                yellow_lighter: {
                    backgroundColor: theme.palette.grey[200], // Fond plus clair
                    color: theme.palette.text.black, // Couleur de texte
                    '&:hover': {
                        backgroundColor: '#fdd249', // Fond un peu plus sombre au survol
                    },
                },

                sizeLarge: {
                    height: 48,
                },
                containedInherit: {
                    color: theme.palette.grey[800],
                    '&:hover': {
                        backgroundColor: theme.palette.grey[400],
                    },
                },
                outlinedInherit: {
                    border: `1px solid ${alpha(theme.palette.grey[500], 0.32)}`,
                    '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                    },
                },
                textInherit: {
                    '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                    },
                },
            },
        },
    };
}
