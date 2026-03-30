export default function Typography(theme) {
    return {
        MuiTypography: {
            styleOverrides: {
                root: {
                    color: theme.palette.text.primary,
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