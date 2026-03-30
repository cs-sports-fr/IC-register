import { Box, Card, Tooltip, CardContent, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, TablePagination } from '@mui/material';
import PropTypes from 'prop-types';

const ParticipantList = ({ 
  headerItem, 
  columns, 
  data, 
  emptyMessage = "Aucun participant trouvé",
  pagination = false,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  totalCount,
  ...props 
}) => {

  return (
    <Card sx={{ borderRadius: '0.8rem'}} {...props}>
      <CardContent sx={{ pb: 0 }}>
        <Box mb={2}>
          {headerItem && headerItem}
        </Box>
        <TableContainer>
          <Table >
            <TableHead>
              <TableRow>
                {columns.map((column, index) => (
                  <TableCell key={index} align={column?.align}>
                      {column?.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data && data.length > 0 ? (
                data.map((item, index) => (
                  <TableRow key={item.id || index}>
                    {columns.map((column, columnIndex) => (
                      <TableCell key={`${item.id}-${columnIndex}`} align={column?.align || 'left'}>
                        {column.render ? column.render(item) : (
                          column.key && item[column.key] ? item[column.key] : "-"
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                      <Typography variant="body1">{emptyMessage}</Typography>
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

ParticipantList.propTypes = {
  data: PropTypes.array,
  headerItem: PropTypes.element,
  columns: PropTypes.array.isRequired,
  emptyMessage: PropTypes.string,
  pagination: PropTypes.bool,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  totalCount: PropTypes.number
};

export default ParticipantList;