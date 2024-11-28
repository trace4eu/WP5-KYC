import React, {useEffect, useState} from 'react';
import WalletModel from '../models/WalletModel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

import ErrorDownloadAlert from '../components/ErrorDownloadAlert';
import {Button, CircularProgress} from '@mui/material';

import SuccessAlert from '../components/SuccessAlert';

interface PropsPrepareDocs {
  walletModel: WalletModel;
}

const PrepareDocs = ({walletModel}: PropsPrepareDocs) => {
 
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File>()
 
 


  const upload = async () => {
    setError('not implemented yet')
  }

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
          Select files to prepare for upload
        </Typography>

        <Typography sx={{textAlign: 'center', fontStyle: 'italic', marginTop: '20px'}} >
          select one or more files from your local disk. 
        </Typography>
      
        <Typography sx={{textAlign: 'center', fontStyle: 'italic', marginTop: '10px'}} >
          selected files will be merged to a single pdf file.
        </Typography>
        <Typography sx={{textAlign: 'center',fontStyle: 'italic', marginTop: '10px'}}>
          the prepared file will be saved in your local disk.
        </Typography>

        <Box sx={{px: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
        paddingInline: '25px',
        marginTop: '15px'
         }}>
      
           <input type="file" accept="application/pdf" multiple style={{marginTop:"15px"}} onChange={(e) => {
               if (e.target.files) setFile(e.target.files[0])
           } } />
           <Button sx={{marginTop:'15px'}} variant="contained" size="small" disabled={!file} onClick={upload}>Prepare</Button>
        </Box>

      </Box>


    </Container>
  );
};

export default PrepareDocs;
