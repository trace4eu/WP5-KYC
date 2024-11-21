import { OffChainType } from "../types/offchainTypes";
import WalletModel from '../models/WalletModel';

export function storeOffChainFile(storeFormatFile: OffChainType, walletModel: WalletModel) {
    const offchainFilesFromLocalStorage = walletModel?.getStoredOffChainFiles();
    const offChainFiles: OffChainType[] =
    offchainFilesFromLocalStorage && offchainFilesFromLocalStorage.length
        ? offchainFilesFromLocalStorage
        : [];

  
    offChainFiles.push(storeFormatFile);
    walletModel?.storeOffChainFiles(JSON.stringify(offChainFiles));
  }

  //to check and replace any existing vc
  // with the same productName and allowedEvent as the new vc

//   export function updateVC(newVC: CredentialStoredType, walletModel: WalletModel) {
//     const storedCredentials = walletModel?.getStoredCredentials() as CredentialStoredType[];
//     const updatedCredentials = storedCredentials.map((vc) => {
//       const details = vc.vcDetails as issuanceCertificateCardDetails;
//       if (
//         details.productName === (newVC.vcDetails as issuanceCertificateCardDetails).productName &&
//         details.allowedEvent === (newVC.vcDetails as issuanceCertificateCardDetails).allowedEvent
//       ) {
//         // Replace the existing VC with newVC
//         return newVC;
//       }
//       return vc;
//     });
//     walletModel?.storeVerifiedCredentials(JSON.stringify(updatedCredentials));
//   }