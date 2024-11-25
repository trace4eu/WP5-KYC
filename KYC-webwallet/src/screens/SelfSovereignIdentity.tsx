import {useState} from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import WalletModel from '../models/WalletModel';
import Paper from '@mui/material/Paper';
import FileCopyRoundedIcon from '@mui/icons-material/FileCopyRounded';
import IconButton from '@mui/material/IconButton';
import LockIcon from '@mui/icons-material/Lock';
import Divider from '@mui/material/Divider';
import CopiedDIDAlert from '../components/SuccessAlert';
import DIDShareWarningModal from '../components/DIDShareWarningModal';
import DecentralizedIDKey from '../components/DecentralizedIDKey';

interface ISelfSovereignIdProps {
  walletModel: WalletModel;
}

// Display DID and privatekey JWT

const SelfSovereignIdentity = ({walletModel}: ISelfSovereignIdProps) => {
  const [onRevealKeyOpen, setOnRevealKeyOpen] = useState(false);
  const [isCopyAlertOpen, setIsCopyAlertOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  const did256 = walletModel.getDIDes256();
  const did256k = walletModel.getDIDes256k();

  const copyToClipboard = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    navigator.clipboard.writeText(did256);
    setIsCopyAlertOpen(true);
  };

  const onAlertClose = () => setIsCopyAlertOpen(false);

  const onWarningModalClose = () => {
    setIsWarningModalOpen(false);
  };

  const onShowKey = () => {
    setIsWarningModalOpen(false);
    setOnRevealKeyOpen(true);
  };

  const didPrivateKey = walletModel.getHexKey();

  const ALERT_TEXT = 'Copied to clipboard!';

  return onRevealKeyOpen ? (
    <DecentralizedIDKey
      didPrivateKey={didPrivateKey? didPrivateKey : ''}
      setOnRevealKeyOpen={setOnRevealKeyOpen}
    />
  ) : (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        height: '100%',
        marginTop: '-20px',
      }}
    >
      <Typography variant="h2" className="govcy-h2" gutterBottom>
        EBSI Decentralized IDs
      </Typography>
      <Paper
        elevation={3}
        sx={{
          p: 5,
          marginTop: '3vh',
          width: '70vw',
          maxWidth: 1000,
          maxHeight: 600,
          textAlign: 'center',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'normal',
          alignItems: 'center',
          height: '70vh',
          backgroundColor: '#ebf1f3',
        }}
      >
        <Typography
          fontWeight={500}
          //fontSize={'2rem'}
          variant="body1"
          sx={{wordBreak: 'break-all'}}
          textAlign={'center'}
        >
          DID ES256
        </Typography>
        <Typography variant="body2" sx={{wordBreak: 'break-all', marginBottom: 2}}>
          {did256}
        </Typography>
        <IconButton onClick={copyToClipboard} sx={{width: 100,marginBottom: 2}}>
          <FileCopyRoundedIcon sx={{color: 'orange'}} />
          <Typography fontWeight={500} variant="body1" textAlign={'center'} paddingLeft={1}>
            Copy
          </Typography>
        </IconButton>
        <Typography
          fontWeight={500}
          //fontSize={'2rem'}
          variant="body2"
          sx={{wordBreak: 'break-all'}}
          textAlign={'center'}
        >
          DID ES256K
        </Typography>
        <Typography variant="body2" sx={{wordBreak: 'break-all', marginBottom: 2}}>
          {did256k}
        </Typography>
        <IconButton onClick={copyToClipboard} sx={{width: 100}}>
          <FileCopyRoundedIcon sx={{color: 'orange'}} />
          <Typography fontWeight={500} variant="body1" textAlign={'center'} paddingLeft={1}>
            Copy
          </Typography>
        </IconButton>
        <Divider color="#000" sx={{width: '100%'}} />

        <Typography fontWeight={500} variant="body1" sx={{marginTop: 2}} textAlign={'center'}>
          Private key
        </Typography>
        <Typography variant="body2" sx={{marginTop: 2}}>
          Please be very careful with your private keys, because they control access to your
          credentials information.
        </Typography>
        <Button
          variant="contained"
          color="info"
          sx={{marginTop: 1}}
          style={{backgroundColor: '#624f64'}}
          onClick={(e) => {
            e.preventDefault();
            setIsWarningModalOpen(true);
          }}
        >
          <LockIcon />
          Reveal
        </Button>
        <DIDShareWarningModal
          isOpen={isWarningModalOpen}
          handleCloseModal={onWarningModalClose}
          handleContinue={onShowKey}
        />
      </Paper>

      <CopiedDIDAlert isOpen={isCopyAlertOpen} onClose={onAlertClose} alertText={ALERT_TEXT} />
    </Box>
  );
};

export default SelfSovereignIdentity;
