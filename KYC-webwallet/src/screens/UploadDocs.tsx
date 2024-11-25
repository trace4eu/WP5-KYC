import {useEffect, useState} from 'react';
import WalletModel from '../models/WalletModel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import {useAppSelector} from '../features/hooks';
import {selectSingleCredential} from '../features/credentialSlice';
import {apiService} from '../index';
import {EventDetailsOptionType, EventDetailsType, pendingTaskType} from '../types/pendingTaskType';
import CircularProgress from '@mui/material/CircularProgress';
import ErrorDownloadAlert from '../components/ErrorDownloadAlert';

import {cryptoKeyToHexString, generateEncKey} from '../helpers/encryptPublic'
import { Hash } from '../helpers/tntUtil';
import {OffChainType} from '../types/offchainTypes'
import {storeOffChainFile} from '../helpers/offChainFiles'

interface PropsPendingTasks {
  walletModel: WalletModel;
}

const SUCCESS_COMPLETE_MSG =
  'Batch has been completed. \nPlease proceed with generating a QR code for the batch items.';

const SUCCESS_UPDATE_MSG = 'Batch updated succesfully';

const UploadDocs = ({walletModel}: PropsPendingTasks) => {
  const [file, setFile] = useState<File>()
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<pendingTaskType[] | null>(null);
  const [selectedTask, setSelectedTask] = useState<pendingTaskType | null>(null);
  const [isEventDetails, setIsEventDetails] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetailsType | null>(null);
  const [isBatchUpdated, setIsBatchUpdated] = useState(false);
  const [isBatchCompleted, setIsBatchCompleted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const license = useAppSelector(selectSingleCredential);


  const upload = async () => {

   
    console.log('file to upload->'+file?.name);
 
    if (file) {
    const arrayBuffer = await file.arrayBuffer()
    
    const fileBuffer = Buffer.from(arrayBuffer)
    const clearEncKey = await generateEncKey();
    console.log('clearEnckey->'+clearEncKey);

    const clearEncKeyHexString = await cryptoKeyToHexString(clearEncKey);
    console.log('clearEncKeyHexString->'+clearEncKeyHexString);
   //save clearEncKeyHexString in local storage
      
    const formData = new FormData()
     // const cipher = createCipheriv(algorithm, Buffer.from(key),null);
     const iv = Buffer.from("KYC-encryption");

     const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      //  additionalData: aad,
        length: 256,
      },
      clearEncKey,
      fileBuffer
    );

    const cipherblob= new Blob([ciphertext], { type: 'application/octet-stream' })
      
    formData.append('vp_token',  'vptoken');
    formData.append('file',  cipherblob, file.name+".enc");

    try {
 
    const result=await apiService.upload(formData) as {path:string};
    console.log('off-chain FileName->'+result.path);
    const offchainfileName = result.path;
    const documentId = await Hash(cipherblob);
    console.log('documentId->'+documentId);

    //save info in local storage
    const newOffChainFile = {
      preparedFileName: file.name,
      randomEncKeyHex: clearEncKeyHexString,
      documentId: documentId,
      offChainFilepath: offchainfileName 
      
    } as OffChainType;

    storeOffChainFile(newOffChainFile, walletModel);

    } catch (err) {
        console.log('axios error->'+err);
    }

    }

  }

  const getPendingTasks = async () => {
    if (eventDetails) setEventDetails(null);
    if (tasks) setTasks(null);
    if (selectedTask) setSelectedTask(null);

    setLoading(true);
    const pendingTasks = await apiService.getPendingBatches(
      license!.vcDetails.productName,
      license!.vcDetails.ownerDID,
      license!.vcDetails.allowedEvent
    );

    setTasks(pendingTasks);
  };

  const onGetTasks = () => {
    getPendingTasks()
      .catch((e: unknown) => {
        console.error('Error on fetching pending tasks: ', e);
        let msg = 'Error on fetching pending tasks';
        if (e instanceof Error) msg = msg + ': ' + e.message;
        if (typeof e === 'string') msg = msg + ': ' + e;
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    license && onGetTasks();
  }, [license]);

  const handleMarkAsComplete = async () => {
    if (!selectedTask) return;

    // Fetch event details based on product name
    try {
      setLoading(true);
      const eventDetailsReq = await apiService.getRequiredEvents(license!.vcDetails.productName);

      const eventDetailOptions: EventDetailsOptionType[] = eventDetailsReq.eventsDetails.filter(
        (item) => item.details
      );

      // Check if there are event details for this allowed event
      if (!eventDetailOptions || eventDetailOptions.length === 0) {
        setError('No event details found for the selected product event type.');

        return;
      }
      const matchingEventDetail = eventDetailOptions.find(
        (option) => option.type === selectedTask.type
      ) as unknown as EventDetailsOptionType;

      if (!matchingEventDetail || matchingEventDetail.details.length === 0) {
        setError('No event details found for the selected product event type.');
      } else {
        const eventDetailsObject: {[key: string]: string} = {};
        matchingEventDetail.details.forEach((detail) => {
          eventDetailsObject[detail] = '';
        });

        setEventDetails(eventDetailsObject as EventDetailsType);
        setIsEventDetails(true);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Error getting event details:', err);
      setError('Error getting event details: \n' + err);
      setEventDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const scrollWindowTop = () =>
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

  const handleProceed = async () => {
    if (!eventDetails) {
      setError('Please enter event details.');
      return;
    }

    try {
      scrollWindowTop();
      setLoading(true);
      const updatedBatchResp =
        selectedTask &&
        (await apiService.updateBatch(
          selectedTask.documentId,
          eventDetails,
          license?.jwt as string
        ));

      if (updatedBatchResp?.success) {
        if (license?.vcDetails.lastInChain) {
          setIsBatchCompleted(true); // to triger alert success  complete message
        } else {
          setIsBatchUpdated(true); // update sucess alert
        }
        onGetTasks();
      }
      if (!updatedBatchResp?.success) {
        if (updatedBatchResp?.errors) {
          setError(updatedBatchResp?.errors.join(', '));
        } else setError('failed but no error description');
      }
    } catch (err) {
      console.error('Error updating batch:', err);
      let errMsg = 'Error updating batch';
      if (err instanceof Error) {
        errMsg = errMsg + ': ' + err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const toCloseAlert = () => {
    setError(null);
    setIsBatchUpdated(false);
    setEventDetails(null);
    setSelectedTask(null);
  };

  if (loading) {
    return (
      <Box sx={{height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <CircularProgress size="8vw" />
      </Box>
    );
  }

  if (error) scrollWindowTop();

  return (
    <Container>
      {error !== null && (
        <ErrorDownloadAlert
          message={error as string}
          isErrorWindow={error !== null}
          onClose={toCloseAlert}
        />
      )}
   
      <Box sx={{px: 6}}>
        <Typography
          sx={{textAlign: 'center', marginBottom: '0 !important'}}
          variant="h2"
          className="govcy-h2"
          fontWeight="fontWeightBold"
        >
          Encrypt and Upload prepared Docs
        </Typography>
      </Box>

      <div>
           <input type="file" onChange={(e) => {
               if (e.target.files) setFile(e.target.files[0])
           } } />
           <button type="button" onClick={upload}>Upload</button>
       </div>


    </Container>
  );
};

export default UploadDocs;
