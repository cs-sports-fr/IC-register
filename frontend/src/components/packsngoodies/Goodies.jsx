import { Box, Typography } from "@mui/material";
import { useState } from "react";

function Goodies() {
  const packs = [
    {
      price: "10€",
      title: "Tee-shirt",
      src: "./Goodies/teeshirt.png",
      src2: "./Goodies/teeshirtbehind.png", // Same image as front for this example
    },
    {
      price: "23€",
      title: "Sweat",
      src: "./Goodies/sweat.png",
      src2: "./Goodies/sweatbehind.png",
    },
    {
      price: "10€",
      title: "Casquette",
      src: "./Goodies/casquette.png",
      src2: "./Goodies/casquettebehind.png", // Same image as front if no back view
    },
    {
      price: "50cts",
      title: "Ecocup",
      src: "./Goodies/ecocup.png",
      src2: "./Goodies/ecocup.png", // Same image as front if no back view
    },
  ];

  // Create state to track which items are being hovered
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#161C24',
    }}>
      <Box sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 2,
        overflowX: 'auto',
        px: 10,
        py: 3,
      }}>
        {packs.map((item, index) => (
          <Box 
            key={index} 
            sx={{
              p: 3,
              width: '220px',
              height: '300px',
              background: 'linear-gradient(180deg, #F4EDEC 0%, #E5DDEC 100%)',
              borderRadius: '10px',
              boxShadow: 3,
              transition: 'transform 0.3s, box-shadow 0.3s, background-color 0.3s',
              position: 'relative',
              ':hover': {
                cursor: 'pointer',
                backgroundColor: '#F1D7DB',
                transform: 'translateY(-5px)',
                boxShadow: 6,
              }
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
              height: '100%',
            }}>
              <Typography sx={{
                color: 'black',
                fontWeight: 'bold',
                fontSize: '1.8rem',
                height: '2rem',
                mb: "1rem",
              }}>
                {item.title}
              </Typography>
              
              <Box sx={{ 
                position: 'relative', 
                width: '180px', 
                height: '180px', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={item.src} 
                  alt={`${item.title} front`}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%',
                    objectFit: 'contain',
                    position: 'absolute',
                    opacity: hoveredIndex === index ? 0 : 1,
                    transition: 'opacity 0.5s ease-in-out'
                  }}
                />   
                <img 
                  src={item.src2 || item.src} // Fallback to src if src2 doesn't exist
                  alt={`${item.title} back`}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%',
                    objectFit: 'contain',
                    position: 'absolute',
                    opacity: hoveredIndex === index ? 1 : 0,
                    transition: 'opacity 0.5s ease-in-out'
                  }}
                />  
              </Box>
              
              <Typography sx={{
                color: 'black',
                fontWeight: 'bold',
                fontSize: '1.8rem',
                height: '2rem',
                mt: 'auto'
              }}>
                {item.price}
              </Typography>                       
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default Goodies;