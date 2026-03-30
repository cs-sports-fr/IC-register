
const isParticipantEmpty = (participant) => {

    return participant.email === null &&
        participant.lastname === null &&
        participant.firstname === null &&
        participant.dateOfBirth === null &&
        participant.gender === null &&
        participant.packId === null &&
        participant.isVegan === false &&
        participant.hasAllergies === false &&
        participant.licenceID === '' &&
        Array.isArray(participant.productsIds) && participant.productsIds.length === 0;
}

const parseRegisterTeamRequest = (participants) => { // remove empty participants

    return participants
        .filter(participant => !isParticipantEmpty(participant))
        .map(participant => ({
            ...participant,
            email: participant.email ? participant.email.toLowerCase() : participant.email,
        }));
}




export { isParticipantEmpty, parseRegisterTeamRequest }