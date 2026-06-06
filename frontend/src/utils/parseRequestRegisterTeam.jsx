
const isParticipantEmpty = (participant) => {
    return participant.firstname === null &&
        participant.lastname === null &&
        participant.dateOfBirth === null &&
        participant.gender === null &&
        participant.packId === null;
}

const parseRegisterTeamRequest = (participants) => {
    return participants
        .filter(participant => !isParticipantEmpty(participant));
}


export { isParticipantEmpty, parseRegisterTeamRequest }
