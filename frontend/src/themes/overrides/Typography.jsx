export default function Typography(theme) {
    return {
        MuiTypography: {
            styleOverrides: {
                root: {
                    color: 'inherit',
                    fontFamily: theme.typography.fontFamily,
                },
                separator: {
                    color: theme.palette.text.disabled,

                },
                login: {
                    fontFamily: theme.typography.fontFamily,
                }
            },
        },
    };
}