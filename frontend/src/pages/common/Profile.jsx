import { Box, Grid, } from "@mui/material";
import Navbar from "../../components/navbar/Navbar";
import { useAuth } from "../../provider/authProvider";
import { routesForAdmin, routesForSuperAdmin, routesForUser } from "../../routes/routes";
import { useState } from "react";
import NavbarItem from "../../components/profile/NavbarItem";
import ProfilModification from "../../components/profile/ProfilModification";
import PasswordModification from "../../components/profile/PasswordModification";


const Profile = () => {
    const { permission } = useAuth();
    const routes = permission === 'AdminStatus' ? routesForAdmin : permission === 'SuperAdminStatus' ? routesForSuperAdmin : routesForUser;

    const [tabSelected, setTabSelected] = useState(0);


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar navigation={routes} />
            <Box sx={{ display: 'flex', bgcolor: 'background.paper', flexGrow: 1 }}>
                <Grid container spacing={2} direction="row" justifyContent="center" alignItems="center"
                    sx={{ display: "flex", flexGrow: 1, mt: 0 }}
                >
                    <Grid item xs={2.5} sx={{ height: '100%', bgcolor: 'background.paper' }}>
                        <Box sx={{ mx: 3 }}>
                            <NavbarItem title="Mon profil" active={tabSelected === 0} onClick={setTabSelected} id={0} />
                            <NavbarItem title="Changer de mot de passe" active={tabSelected === 1} onClick={setTabSelected} id={1} />
                        </Box>
                    </Grid>
                    <Grid item xs={9.5} sx={{ height: '100%', backgroundColor: 'background.paper' }}>
                        <Box sx={{ mt: 2, mx: 3 }}>
                            {tabSelected === 0 && <ProfilModification />}
                            {tabSelected === 1 && <PasswordModification />}
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Box >
    );
};

export default Profile;