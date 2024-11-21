import React, {useEffect, useState} from 'react';
import WalletModel from '../models/WalletModel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { apiService } from '../index';
import { OffChainType } from 'types/offchainTypes';
import Select from 'react-dropdown-select'
import { Button } from '@mui/material';
import { addeventTnT, getDocument } from '../helpers/tntUtil';
import { EventType, InitShareReq, KYC_SHARED } from 'interfaces/utils.interface';
import { getBankJwk } from '../helpers/keysUtil';
import { encryptEncryptionKey } from '../helpers/encryptPublic';
import { ethers } from "ethers";

interface PropsShareDocs {
    walletModel: WalletModel;
}



const ShareDocs = ({walletModel}: PropsShareDocs) => {


  const [offChainFiles, setOffChainFiles] = useState<Array<OffChainType> >([]);
  const [fileToShare, setFileToShare] = useState<OffChainType>();

  const getUploadedFiles = () => {

    const storeduploadedFiles = walletModel.getStoredOffChainFiles()
    ? (walletModel.getStoredOffChainFiles() as OffChainType[])
    : [];
   
     if (storeduploadedFiles.length > 0)
       setOffChainFiles(storeduploadedFiles);

  };

  useEffect(() => {

    getUploadedFiles();

  }, []);

 const setSelectedFile = (value: Array<OffChainType> ) => {
  value.map(d=>{
    console.log('selected->'+d.offChainFilepath);
    setFileToShare(d);
  })
 }

 const handleShare = async () => {

  //call init_share if documentid does not exist
  //add KYC_docs_shared event
  //add bank event

  const {preparedFileName,randomEncKeyHex,documentId, offChainFilepath} = fileToShare!

  const {kycMeta} = await getDocument(documentId);
    if (kycMeta) {
      //kyc doc already exists. do nothing or give create access to bank
      console.log('kyc doc already exists->'+documentId);
    } else {

       const initSharereq = {
        documentHash: documentId,
        didKey: walletModel.getDIDes256k(),
        customerName: walletModel.getMyname(),
        vp_token: 'vptoken'

       } as InitShareReq

       //ask bank to create tnt doc
       const bankUrl = 'http://localhost:7002'
       const initShareResp = await apiService.initShare(bankUrl,initSharereq)
       if (initShareResp.success) {
        console.log('init_share success. docid->'+documentId)
       } else {
        console.log('error from init_share. docid->'+documentId);
        console.log(initShareResp);
        return;
       }
      }

      //check if I have delegate access

       //encrypt doc encryption key and add TnT KYC_docs_shared event

       //create encryptedEncHexKey for a bank using bank's public key
      
        const privateKeyJwkWallet = walletModel.getKeysES256();
        //we don't know bank's kid to use it to get its public key from bank's DIDdocument. 
        //just get its public key  directly from the bank's url
      // const publicKeyEncryptionJwkIssuer = await getPublicKeyJWK_fromDID(bankDID,didkeyResolver,ebsiResolver);
        const publicKeyJwkBank = await getBankJwk("http://localhost:7002/v3/auth/jwks");

        if (!publicKeyJwkBank) {
          console.log('could not get bank publickey from its jwks api');
          return;
        }
        const encryptedEncHexKey= await encryptEncryptionKey(
          randomEncKeyHex, 
          publicKeyJwkBank, 
          privateKeyJwkWallet);

       const sharedForName = 'bank X'
       const eventMetadata = 
       {
         eventType: "KYC_docs_shared",
         es256Did: walletModel.getDIDes256(),
         sharedForName,
         sharedForDID: 'bankDid',
         offchainFilepath: offChainFilepath,
         encryptedEncryptionKey: encryptedEncHexKey
       } as KYC_SHARED
    
       console.log('trying to add KYC_docs_shared event from web wallet');

     const externalHash = `KYC_docs_shared to ${sharedForName}`
     const privKeyHex = walletModel.getHexKey();
     if (!privKeyHex) {
      console.log('error getting privHexkey');
      return;
     }
     const etherWallet= new ethers.Wallet(privKeyHex);
     const  result = await addeventTnT(documentId,eventMetadata,externalHash,etherWallet,walletModel);
    
     if (result?.success) {
      const eventId = ethers.utils.keccak256(Buffer.from(externalHash))
      console.log('eventid->'+eventId);
     }
  
  
    console.log('addevent result->'+JSON.stringify(result));

    

 } 
    return (
        <Container>
        <Box sx={{px: 6}}>
          <Typography
            sx={{textAlign: 'center'}}
            variant="h2"
            className="govcy-h2"
            fontWeight="fontWeightBold"
          >
            Select and Share Uploaded docs to a bank 
          </Typography>
        </Box>

         <div className='d-flex justify-content-center mt-5'>

          <div className='w-50 p-3 border rounded'>
            <Select
              name="select"
              options={offChainFiles}
              labelField="preparedFileName"
              valueField='preparedFileName'
              onChange={value => setSelectedFile(value)} 
              values={[]}>

              </Select>
          </div>
         </div>

         <Button
            variant="contained"
            color="primary"
            onClick={handleShare}
            disabled={!fileToShare }
            style={{marginTop: 20, marginLeft: 25}}
          >
            Share
          </Button>

      </Container>
    )

}

export default ShareDocs;