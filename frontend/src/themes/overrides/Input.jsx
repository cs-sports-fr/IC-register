export default function Input(theme) {
  return {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          height: '2.5rem',
          width: '100%',
          borderRadius: '0.375rem',
          // && doubles specificity so this wins over MUI's default transparent background
          '&&': {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          },
          border: `1px solid ${theme.palette.grey[500]}`,

          '& .MuiInputBase-input': {
            color: theme.palette.text.primary,
            '&::placeholder': {
              color: theme.palette.text.disabled,
              opacity: 1,
            },

            '&:-webkit-autofill': {
              WebkitBoxShadow: `0 0 0 5000px ${theme.palette.background.paper} inset`,
              WebkitTextFillColor: theme.palette.text.primary,
              backgroundColor: 'transparent !important',
              height: '2.5rem',
              transition: 'height 5000s ease-in-out 0s !important',
              WebkitPaddingAfter: '0.45rem',
              WebkitPaddingStart: '0.8rem',
              WebkitPaddingEnd: '0.8rem',
              WebkitPaddingBefore: '0.45rem',
            },
          },

          '& .MuiSelect-select': {
            color: theme.palette.text.primary,
          },

          '& .MuiSelect-icon': {
            color: theme.palette.text.primary,
          },

          '&:disabled': {
            cursor: 'not-allowed',
            opacity: 0.5,
          },
        },
      },
    },
  }
}
