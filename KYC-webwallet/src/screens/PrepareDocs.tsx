import React, {useEffect, useRef, useState} from 'react';
import WalletModel from '../models/WalletModel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

import { PDFDocument, PDFPage } from "pdf-lib";

import ErrorDownloadAlert from '../components/ErrorDownloadAlert';
import {Button, CircularProgress, List, ListItem, ListItemText} from '@mui/material';

import SuccessAlert from '../components/SuccessAlert';

interface PropsPrepareDocs {
  walletModel: WalletModel;
}

const PrepareDocs = ({walletModel}: PropsPrepareDocs) => {
 
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileList>()
 
  const hiddenFileInput = useRef<HTMLInputElement>(null);
 
 
  const fileToBuffer = async (index:number) => {

    if (files && files.item(index) && files.item(index)) {
      const arrayBuffer = await files.item(index)?.arrayBuffer()
      return arrayBuffer;
   
    }
    return null;
  }

  const merge = async () => {

    const pdfsToMerges:ArrayBuffer[] = []
    
    if (files) {

      for (let i=0; i<files.length;i++) {
        console.log('filepro->'+files.item(i)?.name)
        const filebuf = await fileToBuffer(i);
        if (filebuf)
         pdfsToMerges.push(filebuf);
      }
    }
      const mergedPdf = await PDFDocument.create();
      const actions = pdfsToMerges.map(async pdfBuffer => {
        const pdf = await PDFDocument.load(pdfBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          // console.log('page', page.getWidth(), page.getHeight());
          // page.setWidth(210);
          mergedPdf.addPage(page);
          });
      });
      await Promise.all(actions);
      const mergedPdfFile = await mergedPdf.save();
      const fileBuffer = Buffer.from(mergedPdfFile)
      const blob = new Blob([fileBuffer],  {type : 'application/pdf'} );
      await saveFile(blob);
    //  return mergedPdfFile;
    }
  

  const saveFile = async (blob:Blob) => {
   
    const date =new Date(Date.now() );;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-indexed
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const a = document.createElement('a');
    a.download = `KYC_docs_${day}${month}${year}_${hours}${minutes}.pdf`;
    a.href = URL.createObjectURL(blob);
    a.addEventListener('click', (e) => {
      setTimeout(() => URL.revokeObjectURL(a.href), 30 * 1000);
    });
    a.click();
    setFiles(undefined);
    setSuccess('files prepared and saved successfully')
  };


  

  const toCloseErrorAlert = () => {
    setError(null);
  };

  const toCloseSuccessAlert = () => {
    setSuccess(null);
  };

  const generate = (): string[] => {
    const filenames = []
    if (files) {
      let i=0;
      for (i=0; i<files.length;i++) {
        if (files.item(i) !=null ) { 
          if (files.item(i)?.name !=null) {
            const filen = files.item(i)?.name 
            if (filen)
              filenames.push(filen)
          }
        }
      }
      return(filenames)
    }
    return []
  }

  useEffect(() => {

  if (files) {
 
    for (let i=0; i<files.length;i++) {
      console.log('fileselected->'+files.item(i)?.name)
    }
  }


  }, [files]);

  if (loading) {
    return (
      <Box sx={{height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <CircularProgress size="8vw" />
      </Box>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(e.target.files)
  };

  const handleClick = () => {
    if (hiddenFileInput && hiddenFileInput.current) {
      hiddenFileInput.current.click()
    }
   
  };

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

           <Button sx={{marginTop:'15px'}} variant="contained" size="small"  onClick={handleClick}>Select Files</Button>
            <input type="file" id="inputFile" accept="application/pdf" multiple style={{marginTop:"15px" ,display: 'none' }}
            onChange={(e)=>handleChange(e)}
             ref={hiddenFileInput}
          
            // onChange={(e) => {
            //   if (e.target.files) setFiles(e.target.files)
            // }} 
           /> 

         {(files && files?.length>0) ? (
            <List dense>
            {generate().map((filename) => {
              const labelId = `checkbox-list-label-${filename}`;
              return (  
              <ListItem
                 key={filename}
                 >
                <ListItemText
                  id={labelId} primary={filename}
                  
                />
              </ListItem>
              
            )
          })}
          
          </List>
         ) : (
          <Typography sx={{textAlign: 'left', marginTop: '10px'}}>
          no files selected.
        </Typography>
         )
        }
           <Button sx={{marginTop:'15px'}} variant="contained" size="small" disabled={!files} onClick={merge}>Prepare</Button>
        </Box>

      </Box>


    </Container>
  );
};

export default PrepareDocs;
