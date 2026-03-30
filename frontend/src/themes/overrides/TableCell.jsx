// eslint-disable-next-line no-unused-vars
export default function TableCell(theme) {
    return {
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: 'none',
                },
                head: {
                    borderBottom: '1px solid',
                    borderColor: theme.palette.divider,
                }
            },
        },
    };
}