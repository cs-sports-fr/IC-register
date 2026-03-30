import { Cancel, CheckCircle, Edit } from '@mui/icons-material';
import { Box, Card, CardContent, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const SchoolList = ({ headerItem, columns, schools, modify, onModify, ...props }) => {
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
                            {schools && schools?.length !== 0 ? schools.map((school, indexS) => (
                                <TableRow key={indexS}>
                                    {columns.map((column, indexC) => (
                                        column?.type === "boolean" ?
                                            <TableCell key={indexC} align={column?.align}>
                                                {school[column?.key] ? <CheckCircle color="success" /> : <Cancel color="error" />}
                                            </TableCell>
                                            :
                                            column?.type === "index" ?
                                                <TableCell key={indexC} align={column?.align}>
                                                    {indexS + 1}
                                                </TableCell>
                                                :
                                                <TableCell key={indexC} align={column?.align}>{school[column?.key]}</TableCell>
                                    ))}
                                    {modify && <TableCell align="center"><IconButton onClick={() => onModify(school)}><Edit /></IconButton></TableCell>}
                                </TableRow>
                            )) :
                                <TableRow>
                                    <TableCell colSpan={columns?.length + (modify ? 1 : 0)} align="center">
                                        <Typography component="h2" sx={{ color: 'divider', marginTop: '1rem' }}>
                                            Aucune école
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

SchoolList.propTypes = {
    schools: PropTypes.array,
    headerItem: PropTypes.element,
    columns: PropTypes.array.isRequired,
    modify: PropTypes.bool.isRequired,
    onModify: PropTypes.func
};

export default SchoolList;