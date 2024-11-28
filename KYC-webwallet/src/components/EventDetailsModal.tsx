import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

import Button from '@mui/material/Button';

import { KYCEvent, KYCEvent_CORE } from '../interfaces/utils.interface';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: object;
  title: string;
  tntId: string;
  tntcreator:string;
  
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  title,
  tntId,
  tntcreator

}) => {
 
const eventwithmeta = JSON.parse(JSON.stringify(event, null, 4).replace(/\\"/g,'"').replace(/"{/g,'{').replace(/}"/g,'}'))
const event_core = event as KYCEvent_CORE

const PrettyPrintJson = (() => (
  <div>
   
    {`event belongs to TnT id: ${tntId}`} 
    <br />
     {tntcreator}
    <br />
    <pre style={{marginTop: '1rem'}}>{
    JSON.stringify(eventwithmeta, null, 4)
    }
    </pre>
  </div>));


  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
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
