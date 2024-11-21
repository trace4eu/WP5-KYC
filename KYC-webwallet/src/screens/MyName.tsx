import {ChangeEvent, useEffect, useState} from 'react';
import WalletModel from '../models/WalletModel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import {useAppDispatch, useAppSelector} from '../features/hooks';
import {

  nameAdded,
  
} from '../features/credentialSlice';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import { TextField } from '@mui/material';

interface PropsMyName {
  walletModel: WalletModel;
}


const MyName = ({walletModel}: PropsMyName) => {
  const dispatch = useAppDispatch();
 
  const [pinError, setPinError] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>('');



  const storedMyName = walletModel.getMyname() as string || null;
  console.log('stored myname->'+storedMyName);
 
  const isMyname = !!storedMyName;



  useEffect(() => {
    if (isMyname) {
      setMyName(storedMyName);
    }
  }, []);

  const handlePinInput = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setPinError('');
    setMyName(e.target.value);
  };

  const handleProceed = async () => {
    if (!myName) {
      setPinError('Please enter or change name.');
      if (isMyname)
        setMyName(storedMyName);
      return;
    } else {
      walletModel.storeMyname(myName);
      dispatch(nameAdded(myName));
      setPinError('');
    }
  }

  // const toCloseAlert = () => {
  //   setIsDeleteSuccess(false);
  // };

  return (
    <Container>
      <Box sx={{px: 6}}>
        <Typography
          sx={{textAlign: 'center'}}
          variant="h2"
          className="govcy-h2"
          fontWeight="fontWeightBold"
        >
          My Name
        </Typography>
        <Typography
          sx={{textAlign: 'center', py: 4, fontSize: '1.3rem'}}
        >
          Please add or modify your name
        </Typography>
 
      </Box>
     

       
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >

          <Stack
          spacing={5}
          justifyContent="center"
          direction="column"
          width={'45%'}
          maxWidth={'460px'}
          py={3}
        >
          <label className="govcy-label" htmlFor="pin" style={{marginBottom: ' -20px'}}>
            Name
          </label>
          <TextField
            error={pinError ? true : false}
            //label="Enter PIN Code"
            label={pinError ? 'Error' : 'Enter your name here'}
            id="pin"
            variant="outlined"
            fullWidth
            value={myName}
            onChange={handlePinInput}
            helperText={pinError ? pinError : null}
            required
            className="govcy-text-input"
          />
        </Stack>
        <Button variant="contained" size="medium" onClick={handleProceed} sx={{mt: 2}} fullWidth>
          Add or Change
        </Button>
        </Box>
      
    </Container>
  );
};

export default MyName;
