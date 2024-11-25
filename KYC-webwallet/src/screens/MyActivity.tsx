import React, {ChangeEvent, useEffect, useState} from 'react';
import WalletModel from '../models/WalletModel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import ErrorDownloadAlert from '../components/ErrorDownloadAlert';
import {apiService} from '../index';
import Stack from '@mui/material/Stack';
import CredentialDecoder from '../helpers/credentialDecoder';
import CredentialStorageHelper from '../helpers/credentialStorageHelper';
import {useAppDispatch} from '../features/hooks';
import {credentialAdded, credentialsAddAll, credentialsRemoved} from '../features/credentialSlice';
import CredentialSaveAlert from '../components/CredentialSaveOrShareOrDeleteAlert';
import {CredentialStoredType, issuanceCertificateCardDetails} from '../types/typeCredential';
import { IconButton, List, ListItem,ListItemButton,ListItemIcon,ListItemText,Checkbox, ListItemAvatar, Avatar, } from '@mui/material';
import { CheckBoxOutlineBlankRounded, CheckBoxRounded, } from '@mui/icons-material';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import { OffChainType } from '../types/offchainTypes';
import { download } from '../helpers/offChainFiles';
import { getEvent, getEventsOfType, getPersonalData } from '../helpers/tntUtil';
import { EventType, KYC_SHARED, KYC_VERIFIED, KYCEvent } from '../interfaces/utils.interface';
import FileIcon from '@mui/icons-material/OfflineShare';
import EventDetailsModal from '../components/EventDetailsModal';
import { getBankJwkFromSenderDID } from '../helpers/keysUtil';
import { JWK } from '../helpers/verifiablePresentation';


interface PropsMyActivity {
  walletModel: WalletModel;
}

const MyActivity = ({walletModel}: PropsMyActivity) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinCode, setPinCode] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVC, setIsVC] = useState(false);
  const [storeFormatVC, setStoreFormatVC] = useState<CredentialStoredType | null>(null);
  const dispatch = useAppDispatch();
  const [selectedOption, setSelectedOption] = useState(null);
  const [checked, setChecked] = React.useState(0);
  const [offChainFiles, setOffChainFiles] = useState<Array<OffChainType> >([]);
  const [offchainFile, setOffchainFile] = useState<OffChainType>();
  
  const [renderOption, setRenderOption] = useState(0);
  const [eventsOftype, setEventsOftype] = useState<Array<OffchainWithEvent> >([])
  const [eventOftype, setEventOfType] = useState<OffchainWithEvent>();
  const [eventToShow, setEventToShow] = useState<object|null>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);


  type Option = {option:string,id:number}
  type OffchainWithEvent = {offchainFile: OffChainType|undefined, kycevent: KYCEvent|undefined}

  const options: Array<Option> = [
    { option: "encrypted Docs uploaded to off-chain",id:1 },
    { option: "encrypted Docs shared to banks",id:2 },
    { option: "My verified data by banks",id:3 },
   
  ];

  const handleToggle = (value: number) => () => {
    console.log('checked->'+value);
    setChecked(value);
  };

  const handleToggleOffchainFile = (value: OffChainType) => () => {
    console.log('checked oofchain file->'+value);
    setOffchainFile(value);
  };

  const handleToggleEvent = (value: OffchainWithEvent) => () => {
    console.log('checked oofchain file->'+value);
    setEventOfType(value);
  };
 
  const getUploadedFiles = () => {

    const storeduploadedFiles = walletModel.getStoredOffChainFiles()
    ? (walletModel.getStoredOffChainFiles() as OffChainType[])
    : [];
   
     if (storeduploadedFiles.length > 0)
       setOffChainFiles(storeduploadedFiles);
       setOffchainFile(undefined); 
    console.log('offchainfiles->'+offChainFiles.length);
  };

  const getEvents = async (type: EventType) => {

    setEventsOftype([]);
    setLoading(true);

    const storeduploadedFiles = walletModel.getStoredOffChainFiles()
    ? (walletModel.getStoredOffChainFiles() as OffChainType[])
    : [];

    let eventsOfType: OffchainWithEvent[] = []
    await Promise.all(
      storeduploadedFiles.map(async offchainFile => {
        const kycevents= await getEventsOfType(offchainFile.documentId, type);
        kycevents.map(kycevent => {
          eventsOfType.push({offchainFile,kycevent})
        })
        
      }))

    setEventsOftype(eventsOfType);
    setOffchainFile(undefined); 
    setEventToShow(null);
    setEventOfType(undefined)
    setLoading(false);

  };

  useEffect(() => {

   

  }, [renderOption]);
  

  // Handle the "Proceed" button click
  const handleProceed = async () => {

    switch (checked) {

     case 1 : {
      getUploadedFiles();
      setRenderOption(1)
      break;
     }

     case 2 : {
      getEvents('KYC_docs_shared')
      setRenderOption(2)
      break;
     }

     case 3 : {
      getEvents('KYC_docs_verified')
      setRenderOption(3)
      break;
     }

    }


  };

  const showOffchainFile = async () => {

    setLoading(true);
    if (offchainFile) {
      const result = await download(offchainFile?.offChainFilepath, offchainFile?.randomEncKeyHex);
      if (result?.error ) {
        setError(result.error);
      } else {
        console.log('file downloaded and decrypted');
      }
    }
    setLoading(false);
  
  }

  const showEvent = async () => {

    setLoading(true);
    if (eventOftype?.offchainFile && eventOftype.kycevent) {
      const result = await getEvent(eventOftype?.offchainFile?.documentId, eventOftype?.kycevent?.eventId);
      console.log('getevent->'+JSON.stringify(result));
      setEventToShow(result);
      setIsModalOpen(true);
    }
    setLoading(false);
  
  }

  const decryptShowVerified = async () => {

    setLoading(true);
    if (eventOftype?.offchainFile && eventOftype.kycevent) {
      const verifiedEvent = eventOftype.kycevent as KYC_VERIFIED;
      const publicBankJwk = await getBankJwkFromSenderDID(verifiedEvent.sender);
      console.log('publicBankJwk->'+publicBankJwk);
      if ('succes' in publicBankJwk ) {
        return publicBankJwk
      }
      const result = await getPersonalData(verifiedEvent,publicBankJwk as unknown as JWK);
      console.log('getevent->'+JSON.stringify(result));
      setEventToShow(result);
      setIsModalOpen(true);
    }
    setLoading(false);
  
  }


  const toCloseErrorAlert = () => {
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEventToShow(null);
  };


  if (loading) {
    return (
      <Box sx={{height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <CircularProgress size="8vw" />
      </Box>
    );
  }

  return (
    <Container>

      {error && (
        <ErrorDownloadAlert message={error} isErrorWindow={true} onClose={toCloseErrorAlert} />
      )}

 

      <Box
        sx={{
          px: 6,
       
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'start',
        }}
      >
     
     <Typography sx={{textAlign: 'center'}}  className="govcy-h2">
          Activities performed with my KYC docs
        </Typography>

        <Typography sx={{textAlign: 'center'}} variant="h4" className="govcy-h4">
          please select one of the following and press proceed
        </Typography>

        <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              flexDirection: 'row',
              paddingTop: 2,
              p:1,
              m:1
            }}
          >
        <List dense sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
          {options.map((value) => {
          const labelId = `checkbox-list-label-${value}`;
          return (
          
            <ListItem
              key={value.id}
              disablePadding
            >
              <ListItemButton role={undefined} onClick={handleToggle(value.id) } sx={{ height: '30px' }} >
                <ListItemIcon>
                  <Checkbox
                    icon={<RadioButtonUncheckedIcon  />}
                    checkedIcon={<RadioButtonCheckedIcon />}
                    edge="start"
                    checked={checked == value.id}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': labelId }}
                  />
                </ListItemIcon>
                <ListItemText id={labelId} primary={value.option} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
      
  
      <Button variant="contained" 
          size="small" 
          onClick={handleProceed} 
          sx={{mt: 2, marginLeft: 5}} fullWidth
          disabled={checked == 0}
          >
        Proceed
      </Button>
      </Box>

      { renderOption ==1 &&  ( 
        
        offChainFiles.length==0  ?  (
           <Typography sx={{textAlign: 'center'}} variant="h4" className="govcy-h4">
           nothing found
           </Typography>
           )
          : (
          <>
          <Typography sx={{textAlign: 'center'}} variant="h4" className="govcy-h4">
           encrypted docs
           </Typography>
        <List dense sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
          {offChainFiles.map((value) => {
            const labelId = `checkbox-list-label-${value}`;
            return (
              <ListItem
                key={value.documentId}
                disablePadding
              >
                <ListItemButton role={undefined} onClick={handleToggleOffchainFile(value)} sx={{ height: '30px' }}>
                  <ListItemIcon>
                    <Checkbox
                      icon={<RadioButtonUncheckedIcon />}
                      checkedIcon={<RadioButtonCheckedIcon />}
                      edge="start"
                      checked={offchainFile ==value}
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ 'aria-labelledby': labelId }} />
                  </ListItemIcon>
                  <ListItemText id={labelId} primary={value.preparedFileName} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Box width={'100%'}>
          <Button variant="contained"
            size="small"
            onClick={showOffchainFile}
            sx={{ mt: 2 }} fullWidth
            disabled={offchainFile == null}
            >
              decrypt and open
            </Button>
            <Button variant="contained"
            size="small"
            onClick={()=>{}}
            sx={{ mt: 2 }} fullWidth
            disabled={offchainFile == null}
            style={{ marginLeft: 25}}
            >
              delete
            </Button>
        </Box>
        </>
         )
        )
       
      }

      { renderOption ==2 && (
        
        eventsOftype.length==0  ?  (
          <Typography sx={{textAlign: 'center'}} variant="h4" className="govcy-h4">
          nothing found
          </Typography>
          )
         : (
           <>
          <Typography sx={{textAlign: 'center'}} variant="h4" className="govcy-h4">
           shared events
           </Typography>
           <List dense sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
                {eventsOftype.map((value) => {
                  const labelId = `checkbox-list-label-${value}`;
                  if (value.offchainFile && value.kycevent) {
                    const event = value.kycevent as KYC_SHARED;
                    return (
                      <ListItem
                        key={value.kycevent?.createdAt}
                        disablePadding
                      >
                        <ListItemButton role={undefined} onClick={handleToggleEvent(value)} sx={{ height: '50px' }}>
                          <ListItemIcon>
                            <Checkbox
                              icon={<RadioButtonUncheckedIcon />}
                              checkedIcon={<RadioButtonCheckedIcon />}
                              edge="start"
                              checked={value == eventOftype}
                              tabIndex={-1}
                              disableRipple
                              inputProps={{ 'aria-labelledby': labelId }} />
                          </ListItemIcon>
                          <ListItemText id={labelId} 
                                primary={value.offchainFile.preparedFileName} 
                                secondary={`shared to ${event.sharedForName}`} />
                        </ListItemButton>

                      </ListItem>
                    );
                  }
                })}
              </List>
              
                  <Button variant="contained"
                    size="small"
                    onClick={showEvent}
                    sx={{ mt: 2 }} fullWidth
                    disabled={eventOftype == null}
                  >
                    event details
                  </Button>
              
           
            </>
  
       )
      )
    }

   { renderOption ==3 && (
        
        eventsOftype.length==0  ?  (
          <Typography sx={{textAlign: 'center'}} variant="h4" className="govcy-h4">
          nothing found
          </Typography>
          )
         : (
          <>
          <Typography sx={{ textAlign: 'center' }} variant="h4" className="govcy-h4">
                verified events
          </Typography>
          <List dense sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
                  {eventsOftype.map((value) => {
                    const labelId = `checkbox-list-label-${value}`;
                    if (value.offchainFile) {
                      const event = value.kycevent as KYC_VERIFIED;
                      return (
                        <ListItem
                          key={value.kycevent?.createdAt}
                          disablePadding
                        >
                         <ListItemButton role={undefined} onClick={handleToggleEvent(value)} sx={{ height: '50px' }}>
                          <ListItemIcon>
                            <Checkbox
                              icon={<RadioButtonUncheckedIcon />}
                              checkedIcon={<RadioButtonCheckedIcon />}
                              edge="start"
                              checked={value == eventOftype}
                              tabIndex={-1}
                              disableRipple
                              inputProps={{ 'aria-labelledby': labelId }} />
                          </ListItemIcon>
                          <ListItemText id={labelId} 
                                primary={value.offchainFile.preparedFileName} 
                                secondary={`verified by ${event.verifiedBy}`} />
                        </ListItemButton>

                        </ListItem>
                      );
                    }
                  })}
           </List>
           <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              paddingTop: 2,
              p:1,
              m:1
            }}
          >
           <Button variant="contained"
            size="small"
            onClick={showEvent}
            sx={{ mt: 2 }} fullWidth
            disabled={eventOftype == null}
          >
            event details
          </Button>

          <Button variant="contained"
            size="small"
            onClick={decryptShowVerified}
            sx={{ mt: 2, marginLeft: 2 }} fullWidth
            disabled={eventOftype == null}
          >
            decrypt personal data
          </Button>
          </Box>
          </>
  
    
         )
        )}

  </Box>

  { eventToShow && (
        <EventDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          event={eventToShow}
         
        />
      )}
  </Container>
  
 ) //return of render;
};

export default MyActivity;
