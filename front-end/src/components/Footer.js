import './Footer.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import * as React from 'react';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';


function Footer() {
  return (
    <footer className="App-footer">
      <Container maxWidth="sm">
        <Box display="flex" justifyContent="space-between">
          <Button className="Nav-button" color="success" href="#map" variant="contained">Map</Button>
          <Button className="navButton" color="success" href="#upload" variant="contained">Upload</Button>
          <Button className="navButton" color="success" href="#profile" variant="contained">Profile</Button>
          <Button className="navButton" color="success" href="#messages" variant="contained">Messages</Button>
        </Box>
      </Container>
    </footer>
  );
}

export default Footer;