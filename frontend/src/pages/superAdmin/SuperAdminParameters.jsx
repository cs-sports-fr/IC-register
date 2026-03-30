import { Box } from "@mui/material";
import Navbar from "../../components/navbar/Navbar";
import { routesForSuperAdmin } from "../../routes/routes";

import GeneralConfigCard from "../../components/admin/GeneralConfigCard";
import SchoolConfigCard from "../../components/admin/SchoolConfigCard";


const SuperAdminParameters = () => {



    return (
        <Box display={'flex'} flexDirection={'column'} height={'100vh'} sx={{ overflowX: 'hidden', bgcolor: 'background.drawer' }}>
            {/* // Navbar */}
            <Navbar navigation={routesForSuperAdmin} />

            <Box flexGrow={1} display={'flex'} justifyContent={'center'}>
                <Box sx={{ m: 6, width: '80%' }}>
                    <SchoolConfigCard />
                    <GeneralConfigCard />
                </Box>
            </Box>
        </Box>
    );
}

export default SuperAdminParameters;