import React, {useEffect, useState} from 'react';
import WalletModel from '../models/WalletModel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { apiService } from '../index';
import { Bank, OffChainType } from 'types/offchainTypes';
import Select from 'react-dropdown-select'
import { Button, CircularProgress } from '@mui/material';
import { addeventTnT, getDocument, getEventsOfType } from '../helpers/tntUtil';
import { EventType, InitShareReq, KYC_SHARED } from 'interfaces/utils.interface';
import { add_bank_event, getBankJwk, getBanks } from '../helpers/keysUtil';
import { encryptEncryptionKey } from '../helpers/encryptPublic';
import { ethers } from "ethers";
import ErrorDownloadAlert from '../components/ErrorDownloadAlert';
import SuccessAlert from '../components/SuccessAlert';

interface PropsShareDocs {
    walletModel: WalletModel;
}



const ShareDocs = ({walletModel}: PropsShareDocs) => {


  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offChainFiles, setOffChainFiles] = useState<Array<OffChainType> >([]);
  const [fileToShare, setFileToShare] = useState<OffChainType>();
  const [bankToShare, setBankToShare] = useState<Bank>();
  const [banks,setBanks] = useState<Array<Bank>>([])

  
  const toCloseErrorAlert = () => {
    setError(null);
  };

  const toCloseSuccessAlert = () => {
    setSuccess(null);
  };

  const getUploadedFiles = () => {

    const storeduploadedFiles = walletModel.getStoredOffChainFiles()
    ? (walletModel.getStoredOffChainFiles() as OffChainType[])
    : [];
   
     if (storeduploadedFiles.length > 0)
       setOffChainFiles(storeduploadedFiles);

  };

  const getBanksInfo = async () => {

    const banks = await getBanks()
    setBanks(banks)
 

  };

  useEffect(() => {

    getUploadedFiles();
    getBanksInfo();

  }, []);

 const setSelectedFile = (value: Array<OffChainType> ) => {
  value.map(d=>{
    console.log('selected file->'+d.offChainFilepath);
    setFileToShare(d);
  })
 }

 const setSelectedBank = (value: Array<Bank> ) => {
  value.map(d=>{
    console.log('selected bank->'+d.bankName);
    setBankToShare(d);
  })
 }

 const handleShare = async () => {

  if (!bankToShare) {
    setError('no bank selected')
    return;
  }
     const sharedForName = bankToShare.bankName
  //call init_share if documentid does not exist
  //add KYC_docs_shared event
  //add bank event

  const {preparedFileName,randomEncKeyHex,documentId, offChainFilepath} = fileToShare!

  setLoading(true);

  const {kycMeta} = await getDocument(documentId);
    if (kycMeta) {
      //kyc doc already exists.
      //check if already shared to this bank 
      //do nothing or give create access to bank

      console.log('kyc doc already exists->'+documentId);
      const eventsOftypeshare = await getEventsOfType(documentId,'KYC_docs_shared');
       const externalHash = `KYC_docs_shared to ${sharedForName}`
       if (eventsOftypeshare.some(event=> event.externalHash == externalHash)) {
        setLoading(false);
        setError(`doc has already been shared to bank ${sharedForName}`)
        return;
       }
      

    } else {

       const initSharereq = {
        documentHash: documentId,
        didKey: walletModel.getDIDes256k(),
        customerName: walletModel.getMyname(),
        vp_token: 'vptoken'

       } as InitShareReq

       //ask bank to create tnt doc
     //  const bankUrl = 'http://localhost:7002'
       const initShareResp = await apiService.initShare(bankToShare.bankUrl,initSharereq)
       if (initShareResp.success) {
        console.log('init_share success. docid->'+documentId)
       } else {
        console.log('error from init_share. docid->'+documentId);
        console.log(initShareResp);
        setLoading(false);
        setError('error from init_share')
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
        const publicKeyJwkBank = await getBankJwk(bankToShare.bankUrl);

        if ('success' in publicKeyJwkBank ) {
          setLoading(false);
          console.log('could not get bank publickey from its jwks api');
          setError('could not get bank publickey from its jwks api')
          return;
        }
        const encryptedEncHexKey= await encryptEncryptionKey(
          randomEncKeyHex, 
          publicKeyJwkBank, 
          privateKeyJwkWallet);

    
       const eventMetadata = 
       {
         eventType: "KYC_docs_shared",
         es256Did: walletModel.getDIDes256(),
         sharedForName,
         sharedForDID: bankToShare.bankDID,
         offchainFilepath: offChainFilepath,
         encryptedEncryptionKey: encryptedEncHexKey
       } as KYC_SHARED
    
       console.log('trying to add KYC_docs_shared event from web wallet');

     const externalHash = `KYC_docs_shared to ${sharedForName}`
     const privKeyHex = walletModel.getHexKey();
     if (!privKeyHex) {
      console.log('error getting privHexkey');
      setLoading(false);
      setError('error getting privHexkey');
      return;
     }
     const etherWallet= new ethers.Wallet(privKeyHex);
     const  result = await addeventTnT(documentId,eventMetadata,externalHash,etherWallet,walletModel);
    
     if (result?.success) {
      const eventId = ethers.utils.keccak256(Buffer.from(externalHash))
      setLoading(false);
      console.log('eventid->'+eventId);
      //add event to bank local db
      const bankEvent = {
        documentId,
        eventId,
        eventType: 'KYC_docs_shared',
        customerName: walletModel.getMyname()
      }

      const addeventresp = await add_bank_event(bankToShare.bankUrl, bankEvent)
      
      if (!addeventresp.success) {
        setLoading(false);
        setError(`error adding bank event ${addeventresp.errors}`);
        return;
      }

      setSuccess('TnT event added successfully')
      setLoading(false);
      return
     }
  
     setLoading(false);
    console.log('add tnt event result->'+JSON.stringify(result));

    setError('error from add TnT Event')

    } 

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


        <Box sx={
          {px: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'start',
            paddingInline: '5px'
          }}

        >
          <Typography
            sx={{textAlign: 'center'}}
            variant="h2"
            className="govcy-h2"
            fontWeight="fontWeightBold"
          >
            Share KYC docs to a bank 
          </Typography>

          <Typography sx={{textAlign: 'center'}} variant="h4" className="govcy-h4">
          select a bank and the encrypted file you wish to share to the bank
        </Typography>
       

         

          <div className='w-50 p-3 rounded'>
            <Select
              placeholder= "select an encrypted file"
              name="select an encrypted file"
              options={offChainFiles}
              labelField="preparedFileName"
              valueField='documentId'
              onChange={value => setSelectedFile(value)} 
              values={[]}>

              </Select>
          </div>

          <div className='w-50 p-3 rounded'>
            <Select
              placeholder= "select a bank"
              name="select a bank"
              options={banks}
              labelField="bankName"
              valueField='bankUrl'
              onChange={value => setSelectedBank(value)} 
              values={[]}>

              </Select>
          </div>
       

         <Button
            variant="contained"
            color="primary"
            onClick={handleShare}
            disabled={!fileToShare || !bankToShare }
            style={{marginTop: 20}}
          >
            Share
          </Button>

          {fileToShare && bankToShare && (
                <Typography sx={{textAlign: 'center'}} >
                this may take a min. please be patient
              </Typography>
          )}
        </Box>
      </Container>
    )

}

export default ShareDocs;