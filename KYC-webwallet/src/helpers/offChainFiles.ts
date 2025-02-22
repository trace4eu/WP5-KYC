import { OffChainType } from "../types/offchainTypes";
import WalletModel from '../models/WalletModel';
import { hexStringToCrypto } from "./encryptPublic";

export function storeOffChainFile(storeFormatFile: OffChainType, walletModel: WalletModel) {
    const offchainFilesFromLocalStorage = walletModel?.getStoredOffChainFiles();
    const offChainFiles: OffChainType[] =
    offchainFilesFromLocalStorage && offchainFilesFromLocalStorage.length
        ? offchainFilesFromLocalStorage
        : [];

  
    offChainFiles.push(storeFormatFile);
    walletModel?.storeOffChainFiles(JSON.stringify(offChainFiles));
  }

  
export async function download(downloadfile: string, hexKey: string) {
   
  if (downloadfile) {
    let result;
    let data;
    try {
    result=await fetch(`${process.env.REACT_APP_OFF_CHAIN_URL}/download?file=${downloadfile}`, );
     

    } catch (error) {
      console.log('fetch error->'+error);
      return {error: 'download error'}
    }

    if (result && !result.ok) {
     //console.log('fetch error->'+JSON.stringify(await result.json()));
      return {error: JSON.stringify(await result.json())}
    }
    if (result && result.ok ) {
    
      console.log('starting decryption');
      const enckey = await hexStringToCrypto(hexKey);
      data = await result.arrayBuffer();
      let cleartext;
      const iv = Buffer.from("KYC-encryption");
      const cipher = Buffer.from(data);
      try {
       cleartext = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          enckey,
          cipher,
        );
        console.log('downloaded decrypted doc');
      console.log('decrypted length->'+cleartext.byteLength);
    //  console.log('decrypted->'+cleartext);
      const a = document.createElement('a');
      a.download = 'my-KYC-docs.pdf';
 
      const blob = new Blob([cleartext],  {type : 'application/pdf'} );
      a.href = URL.createObjectURL(blob);
      a.click();
     // URL.revokeObjectURL(fileDownloadUrl);
     }   catch (err) {
      console.log('decryption error->'+err);
      return {error: 'decryption error'}
    }
  }  
} else {
  console.log('no file selected');
  return {error: 'no file specified'}
}
}

