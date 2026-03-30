
const parseSportAdmin = (sport) => {
    let parsedSport = { ...sport };

    for (let i = 0; i < parsedSport?.teams?.length; i++) {
        parsedSport.teams[i].schoolName = parsedSport.teams[i].school.name;
        parsedSport.teams[i].len = parsedSport.teams[i].participants.length;
        parsedSport.teams[i].amountToPayInCents = parsedSport.teams[i].amountToPayInCents / 100 + " €";
        parsedSport.teams[i].amountPaidInCents = parsedSport.teams[i].amountPaidInCents / 100 + " €";
    }
    return parsedSport;
}


export { parseSportAdmin };