import React, {useEffect, useState} from 'react';
import WalletModel from '../models/WalletModel';
import { ethers } from "ethers";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { Bank, OffChainType } from '../types/offchainTypes';
import { EventType, KYC_PERSONAL_SHARED, KYC_VERIFIED, KYCEvent } from '../interfaces/utils.interface';
import { addeventTnT, getDocument, getEvent, getEventsOfType, getPersonalData } from '../helpers/tntUtil';
import { add_bank_event, getBankJwk, getBankJwkFromSenderDID, getBanks } from '../helpers/keysUtil';
import Select from 'react-select'
import { Button, CircularProgress } from '@mui/material';
import { JWK } from '../helpers/verifiablePresentation';
import EventDetailsModal from '../components/EventDetailsModal';
import ErrorDownloadAlert from '../components/ErrorDownloadAlert';
import { decryptEncryptionKey, encryptEncryptionKey, toHexString } from '../helpers/encryptPublic';
import SuccessAlert from '../components/SuccessAlert';

interface PropsNewQRcode {
    walletModel: WalletModel;
}

const ShareMyData = ({walletModel}: PropsNewQRcode) => {

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [offChainFiles, setOffChainFiles] = useState<Array<OffChainType> >([]);
  const [offchainFile, setOffchainFile] = useState<OffChainType>();
  
  const [renderOption, setRenderOption] = useState(0);
  const [eventsOftype, setEventsOftype] = useState<Array<OffchainWithEvent> >([])
  const [eventOftype, setEventOfType] = useState<OffchainWithEvent>(null);
  const [eventToShow, setEventToShow] = useState<object|null>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTnTId, setModalTnTId] = useState('');
  const [modalTnTcreator, setModalTnTcreator] = useState('');
  const [bankToShare, setBankToShare] = useState<Bank|null>(null);
  const [banks,setBanks] = useState<Array<Bank>>([])

  type OffchainWithEvent = {offchainFile: OffChainType|undefined, kycevent: KYC_VERIFIED|undefined} | null

  // const onbankChange = (bank: Bank) => {
  //   if (bank) setBankToShare(bank)
  // }

  const getEvents = async (type: EventType) => {

    setEventsOftype([]);
    setLoading(true);

    const storeduploadedFiles = walletModel.getStoredOffChainFiles()
    ? (walletModel.getStoredOffChainFiles() as OffChainType[])
    : [];

    let eventsOfType: OffchainWithEvent[] = []
    await Promise.all(
      storeduploadedFiles.map(async offchainFile => {
        const kycevents= await getEventsOfType(offchainFile.documentId, type) as KYC_VERIFIED[];
        kycevents.map(kycevent=> {
          eventsOfType.push({offchainFile,kycevent})
        })
        
      }))

    setEventsOftype(eventsOfType);
    setOffchainFile(undefined); 
    setEventToShow(null);
   // setEventOfType(null)
    setLoading(false);

  };

  const getBanksInfo = async () => {

    const banks = await getBanks()
    setBanks(banks)
  };

  const showEvent = async () => {

    setLoading(true);
    if (eventOftype?.offchainFile && eventOftype.kycevent) {
      const tntEvent = await getEvent(eventOftype?.offchainFile?.documentId, eventOftype?.kycevent?.eventId);
      if (typeof tntEvent == 'string') {
        setLoading(false);
        setError(tntEvent);
        return
      }
      console.log('getevent->'+JSON.stringify(tntEvent));
      const {kycMeta} = await getDocument(eventOftype?.offchainFile?.documentId);
      setModalTitle('Event Details');
      setModalTnTId(eventOftype?.offchainFile?.documentId)
      setModalTnTcreator(kycMeta ? kycMeta : '')
      setEventToShow(tntEvent);
      setIsModalOpen(true);
    }
    setLoading(false);
  
  }

  const decryptShowVerified = async () => {

    setLoading(true);
    if (eventOftype?.offchainFile && eventOftype.kycevent) {
      const verifiedEvent = eventOftype.kycevent;
      const publicBankJwk = await getBankJwkFromSenderDID(verifiedEvent.sender);
      console.log('publicBankJwk->'+publicBankJwk);
      if ('success' in publicBankJwk ) {
        setLoading(false);
        setError(`could not get ${verifiedEvent.verifiedBy} public key`)
        return
      }
      const result = await getPersonalData(verifiedEvent,publicBankJwk as unknown as JWK);
      console.log('getevent->'+JSON.stringify(result));
      const {kycMeta} = await getDocument(eventOftype?.offchainFile?.documentId);
      setModalTitle('Verified personal data')
      setModalTnTId(eventOftype?.offchainFile?.documentId)
      setModalTnTcreator(kycMeta ? kycMeta : '')
      setEventToShow(result);
      setIsModalOpen(true);
    }
    setLoading(false);
  
  }

  // const setSelectedBank = (value: Array<Bank> ) => {
  //   value.map(d=>{
  //     console.log('selected bank->'+d.bankName);
  //     setBankToShare(d);
  //   })
  //  }

  const toCloseErrorAlert = () => {
    setError(null);
  };

  const toCloseSuccessAlert = () => {
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEventToShow(null);
  };


 
  useEffect(() => {

    getEvents('KYC_docs_verified');
    getBanksInfo();

  }, []);

  
 const handleShare = async () => {

      if (!bankToShare) {
        setError('no bank selected')
        return;
      }

      if (!eventOftype) {
        setError('no verified event selected')
        return;
      }

      const sharedForName = bankToShare.bankName
      
      const {kycevent:verifiedEvent} = eventOftype;

      if (!verifiedEvent) {
        setError('verified event is null')
        return;
      }

      if (sharedForName == verifiedEvent.verifiedBy) {
        setError('you must select a different bank to share to')
        return;
      }

      if (typeof(verifiedEvent.encryptedPersonalData) !='string') {
        setError('encryptedPersonalData not a string')
        return 
      }

      const {tntId:documentId} = verifiedEvent
      //const {preparedFileName,randomEncKeyHex,documentId, offChainFilepath} = fileToShare!

      setLoading(true);

 
      const eventsOftypespersonal = await getEventsOfType(documentId,'personal_data_shared');
       const externalHash = `personal_data_shared to ${sharedForName}`
       if (eventsOftypespersonal.some(event=> event.externalHash == externalHash)) {
        setLoading(false);
        setError(`personal data has already been shared to bank ${sharedForName}`)
        return;
       }
      

       //Decrypt encryptedEncryptionKey in KYC_docs_verified and and get sender bank’s random encryption key

       //encryptedEncryptionKey = bank’s random encryption key encrypted with selected bank’s publickey

       const publicBankJwk = await getBankJwkFromSenderDID(verifiedEvent.sender);
       console.log('publicBankJwk->'+publicBankJwk);
       if ('success' in publicBankJwk ) {
        setLoading(false);
        setError(`could not get sender ${verifiedEvent.verifiedBy} public key`)
        return
       }
        const privateKeyJwkWallet = walletModel.getKeysES256();
             
        const decryptionKeyBuf = await decryptEncryptionKey(
          verifiedEvent.encryptedEncryptionKey,
          publicBankJwk,
          privateKeyJwkWallet
        )

        const bankEncKeyHex =  toHexString(new Uint8Array(decryptionKeyBuf));
     
        const publicKeyJwkBankB = await getBankJwk(bankToShare.bankUrl)
        console.log('publicKeyJwkBankB->'+JSON.stringify(publicKeyJwkBankB));
        if ('success' in publicKeyJwkBankB ) {
         setLoading(false);
         setError(`could not get recipient ${bankToShare.bankName} public key`)
         return
        }

        const encryptedEncHexKey= await encryptEncryptionKey(
          bankEncKeyHex, 
          publicKeyJwkBankB, 
          privateKeyJwkWallet);

    
       const eventMetadata = 
       {
         eventType: "personal_data_shared",
         es256Did: walletModel.getDIDes256(),
         verifiedBy: verifiedEvent.verifiedBy,
         sharedForName,
         sharedForDID: bankToShare.bankDID,
         docsVerifedEventId: verifiedEvent.eventId,
         encryptedEncryptionKey: encryptedEncHexKey
       } as KYC_PERSONAL_SHARED
    
       console.log('trying to add personal_data_shared event from web wallet');

   
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
        eventType: 'personal_data_shared',
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

        <Box sx={{px: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'start',
              paddingInline: '5px'
        }}>
          <Typography
            sx={{textAlign: 'center'}}
            variant="h2"
            className="govcy-h2"
            fontWeight="fontWeightBold"
          >
            Share personal data to another bank
          </Typography>
          
          <Typography sx={{textAlign: 'center'}} >
          select the verified personal data you wish to share and a bank to share to
        </Typography>

        <div className='w-50 p-3 rounded'>
            <Select
              placeholder= "select verified data to share"
              name="select an encrypted file"
              options={eventsOftype}
           //   labelField="kycevent.verifiedBy"
              getOptionLabel={option => `personal data verified by ${option?.kycevent?.verifiedBy}`}
           //   valueField='offchainFile'
              onChange={option => setEventOfType(option)} 
              isOptionSelected={option => eventOftype === option ? true : false}
              value={eventsOftype.filter(function(option) {
                return option === eventOftype;
              })}
           //   values={[]}
           >

              </Select>
          </div>

          <div className='w-50 p-3 rounded'>
            <Select
              placeholder= "select a bank to share to"
              name="select a bank"
              options={banks}
              getOptionLabel={option => `share to ${option.bankName}`}
             // labelField="bankName"
           //   valueField='bankUrl'
              onChange={setBankToShare} 
            //  defaultValue={bankToShare}
              isOptionSelected={option => bankToShare === option ? true : false}
              value={banks.filter(function(option) {
                return option === bankToShare;
              })}
            //  values={[]}
              >

              </Select>
          </div>

          {eventOftype && bankToShare && (
          
             <Typography sx={{textAlign: 'center'}} variant="h4" className="govcy-h4">
            will share encrypted personal data verified by {eventOftype.kycevent?.verifiedBy} to {bankToShare.bankName}
           </Typography>
           )}

          {eventOftype && bankToShare && (
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
             event to share
           </Button>
 
           <Button variant="contained"
             size="small"
             onClick={decryptShowVerified}
             sx={{ mt: 2, marginLeft: 2 }} fullWidth
             disabled={eventOftype == null}
           >
             view personal data
           </Button>

           <Button variant="contained"
             size="small"
             onClick={handleShare}
             sx={{ mt: 2, marginLeft: 2 }} fullWidth
             disabled={eventOftype == null}
           >
             proceed
           </Button>
           </Box>
          )}
        </Box>

        { eventToShow && (
        <EventDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          event={eventToShow}
          title={modalTitle}
          tntId= {modalTnTId}
          tntcreator={modalTnTcreator}
         
        />
      )}
      </Container>
    )

}

export default ShareMyData;