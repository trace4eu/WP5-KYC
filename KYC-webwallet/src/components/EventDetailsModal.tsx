import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import Button from '@mui/material/Button';

import { KYCEvent } from '../interfaces/utils.interface';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: object;
  
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,

}) => {
 
const eventwithmeta = JSON.parse(JSON.stringify(event, null, 4).replace(/\\"/g,'"').replace(/"{/g,'{').replace(/}"/g,'}'))

const PrettyPrintJson = (() => (<div><pre>{
  JSON.stringify(eventwithmeta, null, 4)}</pre></div>));


  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Event details</DialogTitle>
      <DialogContent><PrettyPrintJson/></DialogContent>
      <DialogActions sx={{paddingRight: '25px', gap: '20px'}}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
   
      </DialogActions>
    </Dialog>
  );
};

export default EventDetailsModal;
