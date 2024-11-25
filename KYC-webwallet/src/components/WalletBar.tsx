import React, {useEffect, useState} from 'react';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import './govcy.uds.min.css';

import {walletModel} from '../index';
import {useAppDispatch, useAppSelector} from '../features/hooks';
import {

  selectMyName,
  nameAdded,
} from '../features/credentialSlice';

// import {useNavigate} from 'react-router-dom';

interface IWalletBarProps {
  open?: boolean;
  handleDrawerOpen?: () => void;
}

export const NO_LICENSE = 'you have not entered your name. Please go to My Name option';

const WalletBar = ({open, handleDrawerOpen}: IWalletBarProps) => {
  
  const actorInitialState = <Typography paddingTop={'10px'}>{NO_LICENSE}</Typography>;
  const [actorName, setActorName] = useState< JSX.Element>(actorInitialState);
 
  const storedMyName = (walletModel.getMyname() as string) || null;

  const dispatch = useAppDispatch();

  const appStoreMyName = useAppSelector(selectMyName) || null;

  const isMyname = !!storedMyName;

  if (!appStoreMyName  && isMyname) {
    dispatch(nameAdded(storedMyName));
  }





  const createActorName = (name: string) => {
   
  
    return (
      <>
        <Typography key="legalName">
          <span style={{color: '#ffad2d', fontWeight: 'bold', fontSize:'x-large'}}>{name}</span>
          
        </Typography>
       
      </>
    );
  };

  const updateActorName = () => {
 

    if (storedMyName) {
     
      setActorName(createActorName(storedMyName));
    } else {
      setActorName(actorInitialState);
    }
  };

  useEffect(() => {
   const storedname= (walletModel.getMyname() as string) || null;
   console.log('ineffect->'+storedname);
   if (storedname) {
    
    setActorName(createActorName(storedname));
  } else {
    setActorName(actorInitialState);
  }
    
  }, []);

  useEffect(() => {
   
      if (appStoreMyName) {
        updateActorName();
      } else {
        setActorName(actorInitialState);
      }
    
  }, [appStoreMyName]);


  return (
    <MuiAppBar
      sx={{
        margin: 0,
        backgroundColor: '#ebf1f3',
        position: 'relative',
        minHeight: '66px',
        height: '68px',
      }}
      className="govcy-header-menu-area"
    >
      <Toolbar sx={{position: 'relative'}}>
        <Stack
          direction="row"
          spacing={2}
          className="govcy-menu-items"
          sx={{
            position: 'absolute',
            left: '240px',
            top: 0,
          }}
        >
          <Box
            sx={{
              borderLeft: '1px solid #bbbcbf',
              paddingLeft: '1rem',
              height: '65px',
            }}
          >
            <Box
              className="actor-name-wrapper"
              sx={{
                fontWeight: 'normal',
                color: '#474545',
                padding: '1.0625rem 0',
                paddingLeft: '16px',
                width: '40vw',
                minWidth: '600px',
                paddingTop: '15px',
              }}
            >
              {actorName}
          
            </Box>
          </Box>
        </Stack>
      </Toolbar>
    </MuiAppBar>
  );
};

export default WalletBar;
