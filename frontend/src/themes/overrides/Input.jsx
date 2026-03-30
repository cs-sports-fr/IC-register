export default function Input(theme) {
  return {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          height: '2.5rem',
          width: '100%', // Pour 'w-full'
          borderRadius: '0.375rem', // Pour 'rounded-md', ajustez selon votre thème
          border: `1px solid ${theme.palette.grey[500]}`, // Pour 'border-gray-500'

          '& .MuiInputBase-input': {
            '&::placeholder': {
              color: theme.palette.text.secondary, // Pour 'placeholder:text-muted-foreground', ajustez selon votre thème
            },

            '&:-webkit-autofill': {
              WebkitBoxShadow: `0 0 0 5000px ${theme.palette.background.default} inset`, // Assure une transition douce
              WebkitTextFillColor: theme.palette.text.primary, // Assure que le texte reste lisible
              backgroundColor: 'transparent !important', // Rend l'arrière-plan transparent
              height: '2.5rem',
              transition: 'height 5000s ease-in-out 0s !important',
              WebkitPaddingAfter: '0.45rem',
              WebkitPaddingStart: '0.8rem',
              WebkitPaddingEnd: '0.8rem',
              WebkitPaddingBefore: '0.45rem',
            },
          },
          '&:focus-visible': {

          },
          '&:disabled': {
            cursor: 'not-allowed',
            opacity: 0.5, // Pour 'disabled:opacity-50'
          },
          '& input:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 0 rgba(0, 0, 0, 0) inset`, // Utilisez la couleur d'arrière-plan de votre thème
            // WebkitTextFillColor: 'rgba(0, 0, 0, 0)', // Assurez-vous que le texte reste lisible
            backgroundColor: 'transparent !important'
          },
        },
      },
    },
  }
}
