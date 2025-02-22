import React from 'react';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import { styled, useTheme } from '@mui/material/styles';
import { drawerWidth } from './MenuSlider';
import { NavLink, useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { blue, grey } from '@mui/material/colors';
import { Typography } from '@mui/material';

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

interface ITopBarProps {
  open: boolean;
  handleDrawerOpen: () => void;
  opMode:string|null;
  orgName:string|null;
}

const TopBar = ({ open, handleDrawerOpen, opMode, orgName }: ITopBarProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1); // Equivalent to goBack()
  };

  return (
    <AppBar position="fixed" open={open}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={handleDrawerOpen}
          edge="start"
          sx={{ mr: 2, ...(open && { display: 'none' }) }}
        >
          <MenuIcon />
        </IconButton>

        <Stack spacing={5} justifyContent="start" direction="row" alignItems="center" width={'60%'}>
          <IconButton color="primary" onClick={handleBack}>
            <ArrowBackIcon color="inherit" />
          </IconButton>
          <NavLink 
            to="/pendingEvents"
          
            style={//(isActive) => ({ fontWeight: isActive.isActive ? 'bold' : 'normal' })
                 (opMode == 'BANK') ? {  pointerEvents: "auto", } : { pointerEvents: "none", } }
          >
            Pending Events
          </NavLink>
          <NavLink
            to="/completedEvents"
            style={(isActive) => ({ fontWeight: isActive.isActive ? 'bold' : 'normal' })}
          >
            Completed Events
          </NavLink>
          <NavLink
            to="/allEvents"
            style={(isActive) => ({ fontWeight: isActive.isActive ? 'bold' : 'normal' })}
          >
            All Events
          </NavLink>
         
        </Stack>
        <Typography sx={{color: 'violet'}}>{orgName}</Typography>
      </Toolbar>
    
    </AppBar>
  );
};

export default TopBar;
