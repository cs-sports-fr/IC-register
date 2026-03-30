import { Edit } from '@mui/icons-material';
import { Box, Card, Tooltip, CardContent, Chip, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import PropTypes from 'prop-types';

// Helper function to access nested properties from an object given a "dot notation" path.
const getNestedValue = (obj, path) =>
    path.split('.').reduce((acc, part) => acc && acc[part], obj);

const TeamList = ({ headerItem, columns, teams, admin, onModify, ...props }) => {
    // Show modify column if admin is true OR if any team has "Incomplete" status
    const showModifyColumn = true;

    return (
        <Card sx={{ borderRadius: '0.8rem' }} {...props}>
            <CardContent>
                <Box>
                    {headerItem && headerItem}
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow variant="head">
                                {columns.map((column, index) => (
                                    <TableCell key={index} align={column?.align}>
                                        {column?.label}
                                    </TableCell>
                                ))}
                                {showModifyColumn && <TableCell align="center">Modifier</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {teams && teams.length !== 0 ? teams.map((team, indexT) => (
                                <TableRow key={indexT}>
                                    {columns.map((column, indexC) => (
                                        column?.type === "rezCount" ? (
                                            <TableCell key={indexC} align={column?.align}>
                                                {team.participants ? 
                                                    team.participants.filter(p => p.logementRezOk === false).length : 
                                                    '-'}
                                            </TableCell>
                                        ) :
                                        column?.type === "status" ? (
                                            <TableCell key={indexC} align={column?.align}>
                                                {team[column?.key] === "Incomplete" ? (
                                                    <Tooltip title="Votre dossier est incomplet ou est en cours de vérification !" placement='top' arrow>
                                                        <Chip label="Dossier Incomplet" color='error' />
                                                    </Tooltip>
                                                ) : team[column?.key] === "Waiting" ? (
                                                    <Tooltip title="Votre dossier a bien été complété ! Vous êtes désormais en liste d'attente, vous serez contacté·es dès qu'une place vous sera attribuée !" placement='top' arrow>
                                                        <Chip label="En attente" color='warning' />
                                                    </Tooltip>
                                                ) : team[column?.key] === "Awaitingauthorization" ? (
                                                    <Tooltip title="Votre dossier a bien été complété ! Vous êtes désormais en liste d'attente, vous serez contacté·es dès qu'une place vous sera attribuée !" placement='top' arrow>
                                                        <Chip label="En attente" color='warning' />
                                                    </Tooltip>
                                                ) : team[column?.key] === "PrincipalList" ? (
                                                    <Tooltip title="Votre place est réservée, il ne vous reste plus qu'à régler les frais d'inscription pour confirmer votre participation." placement='top' arrow>
                                                        <Chip label="Selectionné·e" color='info' />
                                                    </Tooltip>
                                                ) : team[column?.key] === "Validated" ? (
                                                    <Tooltip title="Toutes les démarches sont finalisées, vous êtes officiellement inscrit·es au tournoi." placement='top' arrow>
                                                        <Chip label="Inscrit·e" color='success' />
                                                    </Tooltip>
                                                ) : team[column?.key]}
                                            </TableCell>
                                        ) : column?.type === "index" ? (
                                            <TableCell key={indexC} align={column?.align}>
                                                {indexT + 1}
                                            </TableCell>
                                        ) : (
                                            <TableCell key={indexC} align={column?.align}>
                                                {column.key.includes(".") 
                                                    ? column.key.split(".").reduce((obj, key) => obj && obj[key], team) || "-"
                                                    : team[column?.key]}
                                            </TableCell>
                                        )
                                    ))}
                                    {showModifyColumn && (
                                        <TableCell align="center">
                                            { onModify && (
                                                <IconButton onClick={() => onModify(team)}>
                                                    <Edit />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={columns?.length + (showModifyColumn ? 1 : 0)} align="center">
                                        <Typography component="h2" sx={{ color: 'divider', marginTop: '1rem' }}>
                                            Aucune équipe
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
};

TeamList.propTypes = {
    teams: PropTypes.array,
    headerItem: PropTypes.element,
    columns: PropTypes.array.isRequired,
    onModify: PropTypes.func,
    admin: PropTypes.bool
};

export default TeamList;