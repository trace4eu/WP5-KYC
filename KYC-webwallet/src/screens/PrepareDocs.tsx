import React, {useEffect, useState} from 'react';
import WalletModel from '../models/WalletModel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import {useAppDispatch, useAppSelector} from '../features/hooks';
import {selectedCredential, selectSingleCredential} from '../features/credentialSlice';
import {apiService} from '../index';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import {ReqEventsRespType} from '../types/newBatchTypes';
import BatchComponent from '../components/BatchComponent';
import ErrorDownloadAlert from '../components/ErrorDownloadAlert';
import {CircularProgress} from '@mui/material';
import {CredentialStoredType} from '../types/typeCredential';

interface PropsPrepareDocs {
  walletModel: WalletModel;
}

const PrepareDocs = ({walletModel}: PropsPrepareDocs) => {
  const [events, setEvents] = useState<Array<string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File>()
  const dispatch = useAppDispatch();

  const license = useAppSelector(selectSingleCredential);
  useEffect(() => {
    if (!license) {
      walletModel.getStoredCredentials() && walletModel.getStoredCredentials().length > 0;
      // const existingVC: CredentialStoredType = walletModel.getStoredCredentials()[0];

      // if (existingVC) {
      //   dispatch(selectedCredential(existingVC.jwt));
      // }
    }
  }, []);


  const saveFile = async (blob:Blob) => {
    const a = document.createElement('a');
    a.download = `KYC_docs_${Date.now()}.pdf`;
    a.href = URL.createObjectURL(blob);
    a.addEventListener('click', (e) => {
      setTimeout(() => URL.revokeObjectURL(a.href), 30 * 1000);
    });
    a.click();
  };

  const prepareFiles = async () => {

   
    console.log('files to prepare->'+file?.name);
    //combine selected files in one pdf
    //save in local disk
    const arrayBuffer = await file?.arrayBuffer()
    if (arrayBuffer) {
    const fileBuffer = Buffer.from(arrayBuffer)
    const blob = new Blob([fileBuffer],  {type : 'application/pdf'} );
    await saveFile(blob);
    }

  }

  const getRequiredEvents = async () => {
    try {
      setLoading(true);
      const reqEventsResp: ReqEventsRespType = await apiService.getRequiredEvents(
        license!.vcDetails.productName
      );
      // Filter requiredEvents to exclude the lastInChainEvent
      const filteredRequiredEvents: string[] = reqEventsResp.requiredEvents.filter(
        (event: string) => event !== reqEventsResp.lastInChainEvent
      );

      if (filteredRequiredEvents && filteredRequiredEvents.length > 0) {
        setEvents(filteredRequiredEvents);
      } else {
        throw new Error('request events error');
      }
    } catch (error: unknown) {
      console.error('request events error', error);
      let errorMessage = 'Error submitting batch';
      if (typeof error === 'string') {
        errorMessage = error;
      }
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (license && license?.vcDetails.lastInChain) {
      getRequiredEvents();
    }
  }, [license, license?.vcDetails.lastInChain]);

  const lastInChainWarning = !license?.vcDetails.lastInChain ? (
    <Typography sx={{textAlign: 'center'}}>
      Only last in chain actors can create a new batch.
    </Typography>
  ) : null;

  const toCloseAlert = () => {
    setError(null);
  };

  if (loading) {
    return (
      <Box sx={{height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <CircularProgress size="8vw" />
      </Box>
    );
  }

  return (
    <Container sx={{position: 'relative'}}>
      {error !== null && (
        <ErrorDownloadAlert
          message={error as string}
          isErrorWindow={error !== null}
          onClose={toCloseAlert}
        />
      )}

      <Box sx={{px: 6}}>
        <Typography
          sx={{textAlign: 'center'}}
          variant="h3"
          className="govcy-h3"
          fontWeight="fontWeightBold"
        >
          Select and prepare doc for upload
        </Typography>
        <Typography sx={{textAlign: 'center'}}>
          the prepared doc will be saved in your local disk.
        </Typography>
        <Box>
          
       <div>
           <input type="file" onChange={(e) => {
               if (e.target.files) setFile(e.target.files[0])
           } } />
           <button type="button" onClick={prepareFiles}>Prepare</button>
       </div>

        </Box>
        
        {events && license && !lastInChainWarning && (
          <Box>
            <Typography gutterBottom>Events Required to Complete the Batch Production:</Typography>
            <List>
              {events.map((event, index) => (
                <ListItem key={index}>
                  <ListItemText primary={`${event}`} />
                </ListItem>
              ))}
            </List>
            <Typography>
              Type the new batch id and select the supply actors to take part in the new batch.
              <span style={{fontWeight: 500}}>
                You must select one for each required event above.
              </span>
            </Typography>
            <BatchComponent
              productName={license!.vcDetails.productName}
              walletModel={walletModel}
              jwtvc={license!.jwt}
            />
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default PrepareDocs;
