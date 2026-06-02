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
    lighter: '#b8c8e4',
    light: '#7FA1D1',
    main: '#373A67',
    dark: '#252850',
    darker: '#151730',
    contrastText: '#FFF4E3',
    contrastTextLight: '#373A67',
};

const SECONDARY = {
    lighter: '#fde8ed',
    light: '#F6CCD3',
    main: '#6C93C9',
    dark: '#4a6fa0',
    darker: '#2d4a70',
    contrastText: '#373A67',
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
        primary: PRIMARY.main,
        secondary: SECONDARY.contrastText,
        disabled: GREY[500],
        black: '#101218'
    },
    background: {
        paper: '#FFF4E3',
        default: '#FFF4E3',
        neutral: GREY[0],
        navbar: GREY[0],
        drawer: PRIMARY.main,
    },
    action: {
        active: GREY[600],
        hover: alpha(PRIMARY.main, 0.08),
        selected: alpha(PRIMARY.main, 1),
        disabled: alpha(GREY[500], 0.8),
        disabledBackground: alpha(GREY[500], 0.24),
        focus: alpha(GREY[500], 0.24),
        hoverOpacity: 0.08,
        disabledOpacity: 0.48,
    },
};

export default palette;
