import { ThemeProvider } from "@mui/material";
import AuthProvider from "./provider/authProvider";
import Routes from "./routes";
import theme from "./themes";
import { SnackbarProvider } from "./provider/snackbarProvider";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <AuthProvider>
          <Routes />
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;