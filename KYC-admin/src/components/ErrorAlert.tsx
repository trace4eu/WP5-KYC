import React from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Snackbar from '@mui/material/Snackbar';

interface IPropsAlert {
  message: string;
  isErrorWindow: boolean;
  onClose: () => void;
}

export default function ErrorAlert({ message, isErrorWindow, onClose }: IPropsAlert) {
  let alertText = message;
  if (message.search('timeout') !== -1) {
    alertText = 'It is taking too long to get a reply.';
  }
  return (
    <Snackbar
      open={isErrorWindow}
      autoHideDuration={3000}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      sx={{ marginTop: '50px' }}
    >
      <Alert severity="error" onClose={onClose}>
        <AlertTitle sx={{ width: '25vw', minWidth: 'fit-content' }}>{alertText}</AlertTitle>

        <strong>Try again</strong>
      </Alert>
    </Snackbar>
  );
}
