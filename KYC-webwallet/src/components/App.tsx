import {useEffect, useState} from 'react';
import {Routes, Route, BrowserRouter as Router, Navigate} from 'react-router-dom';
import WalletModel from 'models/WalletModel';
// import OfferPage from '../screens/CredentialOffer';
import Terms from '../screens/Terms';
import {Welcome} from '../screens/Welcome';
// import ImportWallet from '../screens/ImportWallet';
import Login from '../screens/Login';
import Signup from '../screens/Signup';
import useAutoLogout from '../components/useAutoLogout';


import RequireLogin from './RequireLogin';
import SelfSovereignIdentity from '../screens/SelfSovereignIdentity';

import Layout from '../components/Layout';

import PrivacyPolicy from '../screens/PrivacyPolicy';
import AccessibilityStatement from '../screens/AccessibilityStatement';
import CookiePolicy from '../screens/CookiePolicy';
import './govcy.uds.min.css';
import {CredentialStoredType} from '../types/typeCredential';
import {credentialsAddAll, selectedCredential} from '../features/credentialSlice';
import {useAppDispatch} from '../features/hooks';
import { array } from 'joi';
import MyName from '../screens/MyName';
import MyActivity from '../screens/MyActivity';
import PrepareDocs from '../screens/PrepareDocs';
import UploadDocs from '../screens/UploadDocs';
import ShareDocs from '../screens/ShareDocs';
import ShareMyData from '../screens/ShareMyData';

window.Buffer = window.Buffer || require('buffer').Buffer;

interface PropsApp {
  walletModel: WalletModel;
}

const App = ({walletModel}: PropsApp) => {
  // if not T&C then Terms
  // if T&C then opens Welcome screen to choose method of wallet
  const [terms, setTerms] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isWalletExists, setIsWalletExists] = useState(false);

  useAutoLogout(setIsLoggedIn);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const isTermsAccepted = walletModel.getTerms();
    setTerms(isTermsAccepted);
    const areNotKeys = walletModel.keysNotExist();
    if (!areNotKeys) {
      setIsWalletExists(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const storedCredentialst = walletModel.getStoredCredentials();
      const storedCredentials = storedCredentialst ? storedCredentialst as CredentialStoredType[] : [] ;
      console.log('all VCs at log in', storedCredentials);
      if (storedCredentials && Array.isArray(storedCredentials) && storedCredentials.length !== 0) {
        dispatch(credentialsAddAll(storedCredentials));
        const existingVC: CredentialStoredType = walletModel.getStoredCredentials()[0];

        dispatch(selectedCredential(existingVC.jwt));
      }
    }
  }, [isLoggedIn]);

  const onTermsAccepted = () => {
    walletModel.storeTerms(true);
    setTerms(true);
  };

  return (
    <>
      <> {console.log('loggedin->' + isLoggedIn)}</>
      <> {console.log('walletexists->' + isWalletExists)}</>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              !terms ? (
                <Terms onTermsAccepted={onTermsAccepted} />
              ) : (
                terms && <Welcome walletModel={walletModel} />
              )
            }
          />
          {/* <Route path="/import" element={<ImportWallet walletModel={walletModel} />} /> */}
          <Route
            path="/login"
            element={
              isWalletExists ? (
                <Login walletModel={walletModel} setWalletOpen={setIsLoggedIn} />
              ) : (
                <Navigate to={'/'} />
              )
            }
          />

          <Route
            path="/signup"
            element={<Signup walletModel={walletModel} setIsLoggedIn={setIsLoggedIn} />}
          />
          <Route path="/" element={<Layout />}>
            <Route element={<RequireLogin isLoggedIn={isLoggedIn} />}>
              <Route path="/wallet" element={<SelfSovereignIdentity walletModel={walletModel} />} />
              <Route path="/myname" element={<MyName walletModel={walletModel} />} />
              <Route path="/myactivity" element={<MyActivity walletModel={walletModel} />} />
              <Route path="/preparekycdocs" element={<PrepareDocs walletModel={walletModel} />} />
              <Route path="/uploadkycdocs" element={<UploadDocs walletModel={walletModel} />} />
              <Route
                path="/sharekycdocs"
                element={<ShareDocs walletModel={walletModel} />}
              />
              <Route path="/sharemydata" element={<ShareMyData walletModel={walletModel} />} />
              {/* <Route path="/cards/:id" element={<Card walletModel={walletModel} />} /> */}
              {/* <Route path="/reset" element={<Reset walletModel={walletModel} />} /> */}
              <Route path="/cookie" element={<CookiePolicy />} />
              <Route path="/accessibility" element={<AccessibilityStatement />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />

              {/* <Route
                path="/deferred-credentials"
                element={<DeferredCredentials walletModel={walletModel} />}
              />

              <Route
                path="/presentation-definition"
                element={<PresentationDefinition walletModel={walletModel} />}
              />

              <Route
                path="/self-sovereign-identity"
                element={<SelfSovereignIdentity walletModel={walletModel} />}
              />

              <Route path="/backup" element={<Backup walletModel={walletModel} />} />
              <Route path="/restore" element={<Restore walletModel={walletModel} />} />

              <Route path="share" element={<Share walletModel={walletModel} />} />
              <Route path="discover" element={<Discover />} />
              <Route path="/issuers/:type" element={<Issuers />} />

              <Route
                path="/openid-credential-offer"
                element={<OfferPage walletModel={walletModel} />}
              />

              <Route path="openid-code" element={<OpenIdCode walletModel={walletModel} />} /> */}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to={'/'} />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
