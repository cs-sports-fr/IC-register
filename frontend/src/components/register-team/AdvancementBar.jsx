import { ChevronRight } from "@mui/icons-material";
import { Box, Typography } from "@mui/material"
import PropTypes from 'prop-types';

const AdvancementBar = ({ sportSelected, isCollective, resetCallback }) => {

    return (
        <Box
            sx={{
                backgroundColor: "background.default", py: 2, pl: 10, display: "flex",
                flexDirection: "row", alignItems: "center", justifyContent: "flex-start",
                borderBottom: 1, borderTop: 1, borderColor: 'divider', borderBottomStyle: 'solid'
            }}
        >
            <Typography variant="h5" sx={{ cursor: "pointer" }} onClick={resetCallback}>
                Inscrire une équipe
            </Typography>
            <ChevronRight fontSize={"large"} sx={{ color: 'divider' }} />
            {isCollective !== null ?
                <Typography fontSize={'1rem'} >
                    {isCollective ? 'Sport collectif' : "Sport individuel"}
                </Typography>
                :
                <Typography fontSize={'1rem'}>
                    Type de sport
                </Typography>
            }
            {sportSelected &&
                <>
                    <ChevronRight fontSize={"large"} sx={{ color: 'divider' }} />
                    <Typography fontSize={'1rem'}>
                        {sportSelected.sport}
                    </Typography>
                </>
            }
        </Box>
    );
}

AdvancementBar.propTypes = {
    sportSelected: PropTypes.object,
    isCollective: PropTypes.bool,
    resetCallback: PropTypes.func.isRequired,
};

export default AdvancementBar;