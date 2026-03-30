
const calculatePrice = (teams = []) => {
    const filteredTeams = teams.filter(team => team.status === 'PrincipalList');
    const totalPlayers = filteredTeams.reduce((acc, team) => acc + team.participants.length, 0);
    const totalTeams = filteredTeams.length;
    const amountPaid = filteredTeams.reduce((acc, team) => acc + team.amountPaidInCents, 0) / 100;
    const amountToPay = Math.max(0, filteredTeams.reduce((acc, team) => acc + team.amountToPayInCents, 0) / 100 - amountPaid);

    // WaitingList
    const filteredTeamsWaiting = teams.filter(team => team.status === 'Waiting');
    const totalPlayersWaiting = filteredTeamsWaiting.reduce((acc, team) => acc + team.participants.length, 0);
    const totalTeamsWaiting = filteredTeamsWaiting.length;
    const amountPaidWaiting = filteredTeamsWaiting.reduce((acc, team) => acc + team.amountPaidInCents, 0) / 100;
    const amountToPayWaiting = Math.max(0, filteredTeamsWaiting.reduce((acc, team) => acc + team.amountToPayInCents, 0) / 100 - amountPaidWaiting);

    return {
        'PrincipalList': {
            totalPlayers,
            totalTeams,
            amountPaid,
            amountToPay,
        },
        'Waiting': {
            totalPlayers: totalPlayersWaiting,
            totalTeams: totalTeamsWaiting,
            amountPaid: amountPaidWaiting,
            amountToPay: amountToPayWaiting,
        }
    }
}

export { calculatePrice }