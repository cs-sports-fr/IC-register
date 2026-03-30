import { Edit } from '@mui/icons-material';
import { Box, Card, CardContent, IconButton, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const UserList = ({ headerItem, columns, users, modify, onModify, ...props }) => {
    return (
        <Card sx={{ borderRadius: '0.8rem' }} {...props}>
            <CardContent>
                <Box>
                    {headerItem && headerItem}
                </Box>
                <TableContainer>
                    <Table size='small'>
                        <TableHead>
                            <TableRow variant="head">
                                {columns.map((column, index) => (
                                    <TableCell key={index} align={column?.align}>{column?.label}</TableCell>
                                ))}
                                {modify && <TableCell align="center">Modifier</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users && users?.length !== 0 ? users.map((user, indexT) => (
                                <TableRow key={indexT}>
                                    {columns.map((column, indexC) => (
                                        column?.type === "email" ?
                                            <TableCell key={indexC} align={column?.align}><Link href={`mailto:${user[column?.key]}?subject=[TOSS] `}>{user[column?.key]}</Link></TableCell>
                                            :
                                            column?.type === "index" ?
                                                <TableCell key={indexC} align={column?.align}>
                                                    {indexT + 1}
                                                </TableCell>
                                                :
                                                <TableCell key={indexC} align={column?.align}>{user[column?.key]}</TableCell>
                                    ))}
                                    {modify && <TableCell align="center"><IconButton onClick={() => onModify(user)}><Edit /></IconButton></TableCell>}
                                </TableRow>
                            )) :
                                <TableRow>
                                    <TableCell colSpan={columns?.length + (modify ? 1 : 0)} align="center">
                                        <Typography component="h2" sx={{ color: 'divider', marginTop: '1rem' }}>
                                            Aucun utilisateur.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            }
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
}

UserList.propTypes = {
    users: PropTypes.array,
    headerItem: PropTypes.element,
    columns: PropTypes.array.isRequired,
    modify: PropTypes.bool.isRequired,
    onModify: PropTypes.func
};

export default UserList;