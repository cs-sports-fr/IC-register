import { Box } from "@mui/material";


import PropTypes from 'prop-types';
import NavbarItem from "./NavbarItem";
import PopoverProfile from "./PopoverProfil";

const Navbar = ({ navigation }) => {
    const isDarkMode = true;
    const filteredNavigation = navigation.filter(item => item?.hidden !== true);

    return (
        <>
            <Box
                sx={{
                    width: '100%',
                    maxWidth: '100vw',
                    boxSizing: 'border-box',
                    paddingX: { xs: 2, md: '3%' }, 
                    height: '4rem', 
                    zIndex: 15, 
                    display: 'flex',
                    alignItems: 'center',
                    overflowX: 'hidden',
                    overflowY: 'hidden',
                    backgroundColor: 'background.default'
                }}
            >
                <Box sx={{ display: "flex", flexGrow: 1, justifyContent: 'space-between', flexDirection: 'row', minWidth: 0 }}>
                    <Box sx={{ display: "flex", flexDirection: 'row', alignItems: 'center', justifyContent:'center', flexShrink: 0 }}>
                        <Box>
                            <a href="/">
                            <img
                                src={isDarkMode ? "/images/logo_toss_light.png" : "/images/logo_toss_dark.png"}
                                alt="Logo Toss"
                                width={40}
                                height={40}
                            />
                            </a>
                        </Box>
                        
                    </Box>
                    <Box sx={{
                        display: "flex",
                        flexDirection: 'row',
                        alignItems:'center',
                        justifyContent:'center',
                        marginLeft: '1rem',
                        flex: 1,
                        minWidth: 0,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' }
                    }}>
                            {filteredNavigation.map((item, index) => {
                                return <NavbarItem item={item} key={index} />
                            })}

                        </Box>
                    <Box sx={{ flexShrink: 0 }}>
                        <PopoverProfile />
                    </Box>
                </Box>
            </Box>
            {/* <Divider variant="navbar" sx={{ flexGrow: 1, mr: 2, color: 'blue' }} /> */}
        </>
    )
};

Navbar.propTypes = {
    navigation: PropTypes.array.isRequired,
};

export default Navbar