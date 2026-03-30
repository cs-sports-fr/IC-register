import { createTheme } from "@mui/material/styles";
import palette from "./palette";
import ComponentsOverrides from "./overrides";


const theme = createTheme({
    palette: palette,
    typography: {
        fontFamily: [
            'Gantari',
            'Gill Sans',
            'Gill Sans MT',
            'Calibri',
            'Trebuchet MS',
            'sans-serif'
        ].join(',')
    }

});
theme.components = ComponentsOverrides(theme);

export default theme;