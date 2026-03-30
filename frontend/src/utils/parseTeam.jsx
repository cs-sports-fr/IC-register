// Utility function to convert price and add currency
const formatPrice = priceInCents => `${(priceInCents / 100).toFixed(2)} €`;

// Utility function to construct diet string
const constructDiet = participant => {
    let diet = [];
    if (participant.isVegan) diet.push('Végan');
    if (participant.hasAllergies) diet.push('Allergique');
    return diet.join(', ');
};

const parseTeam = (team) => {
    let parsedTeam = { ...team }

    const schoolId = parsedTeam.schoolId;
    const sportId = parsedTeam.sport?.id ?? parsedTeam.sportId;

    parsedTeam.participants = parsedTeam.participants.map(participant => {
        // Prix de base : pack + goodies en centimes
        let priceInCents = participant.pack.priceInCents + (participant.products?.reduce((acc, { priceInCents }) => acc + priceInCents, 0) || 0);

        // Remises écoles (mêmes règles que backend/check_and_update_team_amount_to_pay_then_get_team)
        if (schoolId === 34) {
            priceInCents -= 4500;
        } else if ([2, 93, 97, 43, 10, 59, 118].includes(schoolId)) {
            priceInCents -= 1000;
        }

        // Suppléments / remises liés au sport
        if (sportId === 19) {          // Golf
            priceInCents += 2000;      // +20€
        }
        if (sportId === 14) {          // Équitation
            priceInCents += 1500;      // +15€
        }
        if (sportId === 34) {          // Fanfare : réduction spécifique
            priceInCents -= 1000;
        }

        const price = priceInCents;
        const diet = constructDiet(participant);

        return {
            ...participant,
            diet,
            packname: participant.pack.name,
            price: formatPrice(price),
            productsIds: participant.products?.map(({ id }) => id),
            certif: !!participant.certificateLink,
            licencePdf: !!participant.licenceLink,
            gender: participant.gender === 'preferNotToSay' ? 'NC' : participant.gender
        };
    }).sort((a, b) => a.id - b.id);

    return parsedTeam;
}


const parseTeamDashboard = team => team.map(({ participants, sport, status, amountToPayInCents, amountPaidInCents, ...rest }) => ({
    ...rest,
    sport: sport.sport,
    sportId: sport.id,
    len: participants.length,
    amountPaidInCents: amountPaidInCents,
    amountToPayInCents: amountToPayInCents,
    productsData: participants.reduce((acc, { products }) => {
        products?.forEach(({ name }) => acc[name] = (acc[name] || 0) + 1);
        return acc;
    }, {}),
    status: ['Validated', 'PrincipalList','Incomplete', 'Awaitingauthorization'].includes(status) ? status : "Waiting",
    price: formatPrice(amountToPayInCents),
}));


export { parseTeam, parseTeamDashboard }
