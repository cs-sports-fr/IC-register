export default function Divider(theme) {
    return {
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: theme.palette.text.primary,
                },
                lighter: {
                    borderColor: theme.palette.text.disabled,
                },
            },
        },
    };
}
