
const parseUsers = (users) => {
    const parsedUsers = [...users];
    parsedUsers.forEach(user => {
        user.schoolName = user?.school?.name;
        user.statusName = user?.status === 'SuperAdminStatus' ? 'Super Admin' : user?.status === 'RespoDelegStatus' ? 'Responsable de délégation' : user?.status === 'AdminStatus' ? `Responsable ${user?.sportAdmin?.sport}` : 'Utilisateur';
    });

    return parsedUsers
}

export { parseUsers }