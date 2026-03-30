from __future__ import annotations

# Source unique des liens de caution par sport (Sport.id -> URL).

SPORT_CAUTION_LINKS: dict[int, str] = {
    3: "https://pots.lydia.me/collect/toss-26-caution-10km-forvis-mazars-10345900/fr",
    4: "https://pots.lydia.me/collect/toss-26-caution-athletisme-10351925/fr",
    5: "https://pots.lydia.me/collect/toss-26-caution-badminton-10351945/fr",
    6: "https://pots.lydia.me/collect/toss-26-caution-badminton-10351945/fr",
    7: "https://pots.lydia.me/collect/toss-26-caution-badminton-10351945/fr",
    8: "https://pots.lydia.me/collect/toss-26-caution-badminton-10351945/fr",
    9: "https://pots.lydia.me/collect/toss-26-caution-badminton-10351945/fr",
    10: "https://pots.lydia.me/collect/toss-26-caution-basket-10351894/fr",
    11: "https://pots.lydia.me/collect/toss-26-caution-basket-10351894/fr",
    12: "https://pots.lydia.me/collect/toss-26-caution-boxe-10351992/fr",
    13: "https://pots.lydia.me/collect/toss-26-caution-cheerleading-10352009/fr",
    14: "https://pots.lydia.me/collect/toss-26-caution-equitation-10351998/fr",
    15: "https://pots.lydia.me/collect/toss-26-caution-escalade-10352030/fr",
    16: "https://pots.lydia.me/collect/toss-26-caution-escrime-10351948/fr",
    17: "https://pots.lydia.me/collect/toss-26-caution-football-10346158/fr",
    18: "https://pots.lydia.me/collect/toss-26-caution-football-10346158/fr",
    19: "https://pots.lydia.me/collect/toss-26-caution-golf-10351971/fr",
    20: "https://pots.lydia.me/collect/toss-26-caution-handball-10351880/fr",
    21: "https://pots.lydia.me/collect/toss-26-caution-handball-10351880/fr",
    22: "https://pots.lydia.me/collect/toss-26-tennis-fauteuil-10352038/fr",
    23: "https://pots.lydia.me/collect/toss-26-caution-judo-10351953/fr",
    24: "https://pots.lydia.me/collect/toss-26-caution-natation-10351937/fr",
    25: "https://pots.lydia.me/collect/toss-26-caution-rugby-10346169/fr",
    26: "https://pots.lydia.me/collect/toss-26-caution-rugby-10346169/fr",
    27: "https://pots.lydia.me/collect/toss-26-caution-spikeball-10351891/fr",
    28: "https://pots.lydia.me/collect/toss-26-caution-tennis-10351961/fr",
    29: "https://pots.lydia.me/collect/toss-26-caution-tennis-de-table-10351968/fr",
    30: "https://pots.lydia.me/collect/toss-26-caution-ultimate-10351933/fr",
    31: "https://pots.lydia.me/collect/toss-26-caution-volley-10346140/fr",
    32: "https://pots.lydia.me/collect/toss-26-caution-volley-10346140/fr",
    33: "https://pots.lydia.me/collect/toss-26-caution-waterpolo-10351955/fr",
}

DEFAULT_CAUTION_LINK = SPORT_CAUTION_LINKS[3]
