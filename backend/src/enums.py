from enum import Enum


class EnumUserStatus(str, Enum):
    UserStatus = "UserStatus"
    AdminStatus = "AdminStatus"
    SuperAdminStatus = "SuperAdminStatus"
    RespoDelegStatus = "RespoDelegStatus"


class mailClient(str, Enum):
    SES = "SES"
    MAILGUN = "MAILGUN"


class Gender(str, Enum):
    M = "M"
    F = "F"
    preferNotToSay = "preferNotToSay"


class ClassementTennis(str, Enum):
    NC = "NC"
    C40 = "C40"
    C305 = "C305"
    C304 = "C304"
    C303 = "C303"
    C302 = "C302"
    C301 = "C301"
    C30 = "C30"
    C155 = "C155"
    C154 = "C154"
    C153 = "C153"
    C152 = "C152"
    C151 = "C151"
    C15 = "C15"
    C56 = "C56"
    C46 = "C46"
    C36 = "C36"
    C26 = "C26"
    C16 = "C16"
    C0 = "C0"


class ArmeEscrime(str, Enum):
    Epee = "Epee"
    Fleuret = "Fleuret"
    Sabre = "Sabre"


class MedalType(str, Enum):
    Gold = "Gold"
    Silver = "Silver"
    Bronze = "Bronze"


class PhaseType(str, Enum):
    GroupStage = "GroupStage"
    RoundOf16 = "RoundOf16"
    QuarterFinal = "QuarterFinal"
    SemiFinal = "SemiFinal"
    Final = "Final"
    ThirdPlace = "ThirdPlace"


class PaymentStatus(str, Enum):
    Pending = "Pending"
    Paid = "Paid"
    Failed = "Failed"
    Forged = "Forged"
    Canceled = "Canceled"


class TeamStatus(str, Enum):
    Incomplete = "Incomplete"
    Waiting = "Waiting"
    Awaitingauthorization = "Awaitingauthorization"
    PrincipalList = "PrincipalList"
    Validated = "Validated"
