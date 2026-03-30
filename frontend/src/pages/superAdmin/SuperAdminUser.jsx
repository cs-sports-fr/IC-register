import { Box, Pagination, TextField } from "@mui/material";
import Navbar from "../../components/navbar/Navbar";

import { routesForSuperAdmin } from "../../routes/routes";
import { ApiTossConnected } from "../../service/axios";
import { useEffect, useState } from "react";
import UserList from "../../components/admin/UserList";
import { parseUsers } from "../../utils/parseUser";
import axios from "axios";
import ModifyUserStatus from "../../components/admin/ModifyUserStatus";

const SuperAdminUser = () => {

    const [users, setUsers] = useState([]);
    const [count, setCount] = useState(0);
    const [search, setSearch] = useState('');

    const rowsPerPage = 15;
    const fetchUsers = (search = '') => {
        const endpoints = [
            `users?skip=${(page - 1) * rowsPerPage}&take=${rowsPerPage}&search=${search}`,
            'users/count'
        ]
        axios.all(endpoints.map(url => ApiTossConnected.get(url)))
            .then(axios.spread((...responses) => {
                setUsers(parseUsers(responses[0].data));
                setCount(responses[1].data?.count);
            })).catch((error) => {
                console.log(error);
            });
    }

    const [openModify, setOpenModify] = useState(false);
    const [selectedUser, setSelectedUser] = useState({});
    const handleModify = (user) => {
        setOpenModify(true);
        setSelectedUser(user);
    }

    //Pagination
    const [page, setPage] = useState(1);
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    useEffect(() => {
        fetchUsers(search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search]);


    const onSearchChange = (event) => {
        setSearch(event.target.value);
    }

    const headerItem =
        <Box display={'flex'} justifyContent={'space-between'} alignItems={'center'} sx={{ mb: 2 }}>
            <TextField
                id="search"
                placeholder="Rechercher un utilisateur | Prénom, Nom, Email, téléphone"
                type="search"
                variant="outlined"
                size="small"
                fullWidth
                onChange={onSearchChange}
                value={search}
            />
        </Box>;


    return (
        <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ overflowX: 'hidden', bgcolor: 'background.drawer' }}>
            {/* // Navbar */}
            <Navbar navigation={routesForSuperAdmin} />

            <Box flexGrow={1} display={'flex'} justifyContent={'center'}>
                <Box sx={{ m: 6, width: '80%' }}>
                    <UserList columns={columns} users={users}
                        headerItem={headerItem}
                        modify={true}
                        onModify={handleModify}
                    />
                    <Box display={'flex'} justifyContent={'center'} sx={{ mt: 2 }}>
                        <Pagination
                            count={Math.ceil(count / rowsPerPage)}
                            page={page}
                            onChange={handleChangePage}
                        />
                    </Box>
                    <ModifyUserStatus open={openModify} onClose={() => { setOpenModify(false); setTimeout(null, 200); fetchUsers(); }} user={selectedUser} />
                </Box>
            </Box>
        </Box>
    );
}

export default SuperAdminUser;


const columns = [
    { label: "N°", align: "left", key: "id", type: 'index' },
    { label: "Prénom", align: "center", key: "firstname" },
    { label: "Nom", align: "center", key: "lastname" },
    { label: "Email", align: "center", key: "email", type: 'email' },
    { label: "Ecole", align: "center", key: 'schoolName' },
    { label: "Rôle", align: "center", key: "statusName" },
];