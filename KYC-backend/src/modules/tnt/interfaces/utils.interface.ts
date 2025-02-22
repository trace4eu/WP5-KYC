export type Alg = "ES256K" | "ES256" | "RS256" | "EdDSA";

export interface TrustedApp {
  privateKey: string;
  name: string;
  kid: string;
  publicKeyPem?: string;
  publicKeyPemBase64?: string;
}

export interface BuildParamResponse {
  info: {
    title: string;
    data: unknown;
  };
  param: {
    [x: string]: unknown;
  };
  method?: string;
}

export interface UnknownObject {
  [x: string]: unknown;
}

export interface TnTtimestamp {
  datetime: string;

}

export interface RequiredEvent {
  type: string;
  from: string;
  fromName:string;
  notesToActor: string;
  lastInChain?: boolean;
}

export interface PDOdocument {
  createdOnBehalfOfdid: string;
  createdOnBehalfOfName: string;
  batchId: string;
  requiredEvents: RequiredEvent[];
}

export interface TnTDocument {
  metadata: string;
  timestamp: TnTtimestamp;
  events: string[];
}

export interface PDOEvent {
  type: string;
  from: string;
  fromName: string;
  lastInChain: boolean;
  vcJwt: string;
  eventDetails: object;
  createdAt: string;
}

export type EventType = 'KYC_docs_shared' | 'KYC_docs_verified' | 'personal_data_shared' 

export interface KYCEvent_CORE  {
  externalHash: string;
  eventType: EventType;
  eventId: string;
  es256Did?:string|undefined;
  createdAt: string;
  
}

export interface KYC_SHARED extends KYCEvent_CORE {
  sharedForName: string;
  sharedForDID: string;
  offchainFilepath: string;
  encryptedEncryptionKey: string;
}

export interface KYC_VERIFIED extends KYCEvent_CORE {
  verifiedBy: string;
  encryptedEncryptionKey: string;
  encryptedPersonalData: string;
}

export interface KYC_PERSONAL_SHARED extends KYCEvent_CORE {
  verifiedBy: string;
  sharedForName: string;
  sharedForDID: string;
  docsVerifedEventId: string;
  encryptedEncryptionKey: string;
}

export type KYCEvent = KYC_SHARED | KYC_VERIFIED | KYC_PERSONAL_SHARED




export interface TnTEvent {
  externalHash:string;
  hash:string;
  sender: string;
  metadata: string;
  timestamp: TnTtimestamp;
}

export interface BatchAll {
  documentId: string;
  createdAt: string;
  batchId: string;
  createdOnBehalfOfName: string;
  requiredEvents: RequiredEvent[];
  pdoEvents: PDOEvent[]
  
}

export interface PendingBatchAll {
  documentId: string;
  createdAt: string;
  batchId: string;
  createdOnBehalfOfName: string;
  requiredEvents: RequiredEvent[];
  pdoEvents: PDOEvent[]
  
}

export interface PendingBatch {
  documentId: string;
  createdAt: string;
  batchId: string;
  createdOnBehalfOfName: string;
  requiredEvents: RequiredEvent[];
  pendingRequiredEvents: string[]
  
}

export interface PendingTask {
  documentId: string;
  createdAt: string;
  batchId: string;
  createdOnBehalfOfName: string;
  type: string;
  notesToActor: string;
  
}

export interface CompletedBatch {
  documentId: string;
  createdAt: string;
  batchId: string;
  createdOnBehalfOfName: string;
  completedEvents: PDOEvent[]
  
}

export interface CompletedTask {
  documentId: string;
  createdAt: string;
  batchId: string;
  createdOnBehalfOfName: string;
  type: string;
  eventDetails: object;
  batchCompleted: boolean
 // notesToActor: string;
  
}