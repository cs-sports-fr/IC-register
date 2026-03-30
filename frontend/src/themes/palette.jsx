/* eslint-disable react-refresh/only-export-components */
import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------


// SETUP COLORS
const GREY = {
    0: '#FFFFFF',
    100: '#F9FAFB',
    200: '#F4F6F8',
    300: '#DFE3E8',
    400: '#C4CDD5',
    500: '#919EAB',
    600: '#637381',
    700: '#454F5B',
    800: '#212B36',
    900: '#161C24',
    920: '#131920',
    940: '#11161c',
    960: '#0f1319',
    9800: '#0b0e12',
    1000: '#000000',
};

const PRIMARY = {
    lighter: '#f5dbf1',
    light: '#e193d5',
    main: '#CD4CB9',
    dark: '#a43c94',
    darker: '#b2d6f',
    contrastText: '#f3f7f4',
    contrastTextLight: '#350d2a',
};

const SECONDARY = {
    // lighter: '#D6E4FF',
    // light: '#84A9FF',
    main: '#f4d2ea',
    // dark: '#1939B7',
    // darker: '#091A7A',
    contrastText: '#f3f7f4',
};

const INFO = {
    // lighter: '#D0F2FF',
    // light: '#74CAFF',
    main: '#1890FF',
    // dark: '#0C53B7',
    // darker: '#04297A',
    contrastText: '#fff',
};

const SUCCESS = {
    // lighter: '#E9FCD4',
    // light: '#AAF27F',
    main: '#54D62C',
    // dark: '#229A16',
    // darker: '#08660D',
    contrastText: GREY[800],
};

const WARNING = {
    // lighter: '#FFF7CD',
    // light: '#FFE16A',
    main: '#FFC107',
    // dark: '#B78103',
    // darker: '#7A4F01',
    contrastText: GREY[800],
};

const ERROR = {
    // lighter: '#FFE7D9',
    // light: '#FFA48D',
    main: '#b41828',
    // dark: '#B72136',
    // darker: '#7A0C2E',
    contrastText: '#f3f7f4',
};

const palette = {
    common: { black: '#000', white: '#fff' },
    primary: PRIMARY,
    secondary: SECONDARY,
    info: INFO,
    success: SUCCESS,
    warning: WARNING,
    error: ERROR,
    grey: GREY,
    divider: alpha(GREY[100], 0.44),
    text: {
        primary: PRIMARY.contrastText,
        secondary: SECONDARY.contrastText,
        disabled: GREY[500],
        black: '#101218'
    },
    background: {
        paper: GREY[900],
        default: GREY[960],
        neutral: GREY[0],
        navbar: GREY[0],// PRIMARY.main
        drawer: GREY[800],
    },
    action: {
        active: GREY[600],
        hover: alpha(PRIMARY.main, 0.08),
        selected: alpha(PRIMARY.main, 1),//alpha(GREY[100], 0.35)
        disabled: alpha(GREY[500], 0.8),
        disabledBackground: alpha(GREY[500], 0.24),
        focus: alpha(GREY[500], 0.24),
        hoverOpacity: 0.08,
        disabledOpacity: 0.48,
    },
};

export default palette;
