const formatPrice = priceInCents => `${(priceInCents / 100).toFixed(2)} €`;

const parseTeam = (team) => {
    let parsedTeam = { ...team }

    parsedTeam.participants = (parsedTeam.participants || []).map(participant => {
        const packPrice = participant.pack?.price_in_cents ?? 0;
        const price = formatPrice(packPrice);

        return {
            ...participant,
            diet: participant.allergies || '',
            packname: participant.pack?.name ?? 'Aucun pack',
            price,
            productsIds: [],
            certif: false,
            licencePdf: false,
            gender: participant.gender === 'preferNotToSay' ? 'NC' : participant.gender
        };
    }).sort((a, b) => a.id - b.id);

    return parsedTeam;
}


const parseTeamDashboard = team => team.map(({ participants, sport, status, ...rest }) => ({
    ...rest,
    sport: sport?.sport ?? '',
    sportId: sport?.id ?? null,
    len: (participants || []).length,
    amountPaidInCents: 0,
    amountToPayInCents: 0,
    productsData: {},
    status: ['Validated', 'PrincipalList', 'Incomplete', 'Awaitingauthorization'].includes(status) ? status : "Waiting",
    price: formatPrice(0),
}));


export { parseTeam, parseTeamDashboard }
