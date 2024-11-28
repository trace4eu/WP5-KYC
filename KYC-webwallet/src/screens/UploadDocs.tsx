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
import { Button } from '@mui/material';
import SuccessAlert from '../components/SuccessAlert';

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
  const [success, setSuccess] = useState<string | null>(null);
  
  const [tasks, setTasks] = useState<pendingTaskType[] | null>(null);
  const [selectedTask, setSelectedTask] = useState<pendingTaskType | null>(null);
  const [isEventDetails, setIsEventDetails] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetailsType | null>(null);
  const [isBatchUpdated, setIsBatchUpdated] = useState(false);
  const [isBatchCompleted, setIsBatchCompleted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const license = useAppSelector(selectSingleCredential);


  const upload = async () => {

    if (!file) {
      setError('file was not selected');
      return
    }
    console.log('file to upload->'+file?.name);
 
   
    setLoading(true);

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
        setError('error uploading file');
        setLoading(false)
        setFile(undefined)
        return
    }

    setLoading(false);
    setFile(undefined);
    setSuccess('file uploaded succesfully');
    

  }

  


  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const scrollWindowTop = () =>
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });


  const toCloseErrorAlert = () => {
    setError(null);
  };

  const toCloseSuccessAlert = () => {
    setSuccess(null);
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
    
       {error && (
        <ErrorDownloadAlert message={error} isErrorWindow={true} onClose={toCloseErrorAlert} />
         )}

        {success && (
        <SuccessAlert isOpen={true} onClose={toCloseSuccessAlert} alertText={success} />
         )}

   
      <Box sx={{px: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
        paddingInline: '5px'
      }}>
        <Typography
          sx={{textAlign: 'center', marginBottom: '0 !important'}}
          variant="h2"
          className="govcy-h2"
          fontWeight="fontWeightBold"
        >
          Encrypt and Upload prepared Docs
        </Typography>

        <Typography sx={{textAlign: 'center', fontStyle: 'italic', marginTop: '20px'}} >
          select a prepared pdf file to upload to off-chain storage.
        </Typography>
      
        <Typography sx={{textAlign: 'center',fontStyle: 'italic', marginTop: '10px'}}>
          it will be encrypted with a random key before uploading.
        </Typography>

        <Typography sx={{textAlign: 'center',fontStyle: 'italic', marginTop: '10px'}}>
          the random key will be stored in your wallet and you will have exclusive access to it.
        </Typography>

        <Box sx={{px: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
        paddingInline: '25px',
        marginTop: '15px'
         }}>
      
           <input type="file" accept="application/pdf" style={{marginTop:"15px"}} onChange={(e) => {
               if (e.target.files) setFile(e.target.files[0])
           } } />
           <Button sx={{marginTop:'15px'}} variant="contained" size="small" disabled={!file} onClick={upload}>Upload</Button>
        </Box>

      </Box>


    </Container>
  );
};

export default UploadDocs;
