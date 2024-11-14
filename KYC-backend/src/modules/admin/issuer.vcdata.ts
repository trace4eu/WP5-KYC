
import type { AxiosResponse } from 'axios';
import axios from 'axios';

import {  decodeJwt } from 'jose';
import type { Model } from 'mongoose';
//import Mustache from 'mustache';


import type { SharedVC, SharedVCDocument } from 'src/shared/models/sharedvcs.model.js';


export type SupportedVCType = 'CitizenId'|'bachelorDegree'|'LicenseToPractice';
export const SupportedVCTypesList = ['CitizenId','bachelorDegree','LicenseToPractice'];

//export type SupportedVCType = (typeof SupportedVCTypesList)[number];

const CitizenIDVC = `{

  "personalIdentifier": "{{personalIdentifier}}",
  "familyName": "{{familyName}}",
  "firstName": "{{firstName}}",
  "dateOfBirth": "{{dateOfBirth}}"
}`;

type CitizenIDtype = {
  id:string;
  personalIdentifier: string;
  familyName:string;
  firstName:string;
  dateOfBirth:string;
}

const CitizenIDdata = {
  _nametag:'CitizenId',
  personalIdentifier:'',
  familyName:'',
  firstName:'',
  dateOfBirth:''
}

const BachelorDegreeVC = `{
  "identifier": {"value":"{{identifierValue}}"},
  "familyName": "{{familyName}}",
  "firstName": "{{firstName}}",
  "achieved": [
    {
      "id":"urn:epass:learningAchievement:1",
      "title": "{{title}}",
      "wasDerivedFrom": [
        {
          "id": "urn:epass:assessment:1",
          "title": "Overall Diploma Assessment",
          "grade": "{{grade}}"
        }
      ]
    }
  ]
}`;

type bachelorDegreetype = {
  id:string;
  identifier: {value:string};
  familyName:string;
  firstName:string;
  achieved: Array<{title:string,wasDerivedFrom:Array<{title:string,grade:string}>}>
}

const BachelorDegreeData = {
  _nametag:'bachelorDegree',
  identifierValue:'',
  familyName:'',
  firstName:'',
  title:'',
  grade:''
};

const LicenceToPracticeVC = 
`{

  "registrationNumber": "{{registrationNumber}}",
  "familyName": "{{familyName}}",
  "firstName": "{{firstName}}",
  "licenseCode": "{{licenseCode}}",
  "licensedFor": [{{#licensedFor}}"{{.}}",{{/licensedFor}}]
}`;



type LicenseToPracticetype = {
  id:string;
  registrationNumber: string;
  familyName:string;
  firstName:string;
  licenseCode:string;
  licensedFor:Array<string>;
  
}

const LicenseToPracticeData = {
  _nametag:'LicenseToPractice',
  registrationNumber:'',
  familyName:'',
  firstName:'',
  licenseCode:'',
  licensedFor:([] as string[]),
 
}
// type VCdataType = CitizenIDdata | BachelorDegreeData;


// type VCdataTypesList = [CitizenIDdata,BachelorDegreeData];

// type VCtypeTodata = {
//   'CitizenId': CitizenIDdata;
//   'bachelorDegree': BachelorDegreeData;
// }

export type errortype = {error:string};

export type VCtype = {
    type:string;
    issuer:undefined|string;
    issuerDID:string;
    issuanceDate:string;
    expiryDate:string;
    userData:SubjectDataType;
    jwt: string;
};

export type VCtypeWithStatus = {
  status:string;
  type:string;
  issuerDID:string;
  issuanceDate:string;
  expiryDate:string;
  userData:SubjectDataType;
  jwt: string;
};

type VCTypeToTemplateMap = Record<SupportedVCType,string>;

export const vctypetotemplate:VCTypeToTemplateMap = {
  'CitizenId': CitizenIDVC,
  'bachelorDegree' : BachelorDegreeVC,
  'LicenseToPractice': LicenceToPracticeVC,
}




export type SubjectDataType = null|(typeof  CitizenIDdata)|(typeof BachelorDegreeData)|(typeof LicenseToPracticeData);
export type SubjectObjectType = null|CitizenIDtype|bachelorDegreetype|LicenseToPracticetype;

export function getVCdata(
  vcjwt: string,
  vctype: SupportedVCType,
  walletdid:string,
):VCtype|errortype {

  try {
  const jwtdecoded = decodeJwt(vcjwt);
  
  const vc = jwtdecoded['vc'] as {credentialSubject: SubjectObjectType, type: Array<string>, issuer:string| {id:string;legalName:string},issuanceDate:string;expirationDate:string;};
  
 
 
  if ( vc) {
  const type = vc.type[2];
  if (type!=vctype) {
    
    return {error: 'mismatched vc type'};
  }

  if (vc.credentialSubject && vc.credentialSubject.id != walletdid) {
    return {error: 'mismatched walletdid'};
  }
  const userData = getCredSubjectData(vctype, vc.credentialSubject as SubjectObjectType );
  
  const issuer = (typeof vc.issuer === "object") ? vc.issuer.legalName : undefined;
  const issuerDID = (typeof vc.issuer === "string") ? vc.issuer : vc.issuer.id;
  const issuanceDate = vc.issuanceDate;
  const expiryDate = vc.expirationDate;
  console.log('userDataInVc->',JSON.stringify(userData));
  //delete (userData as any).name;
  return {
    type,
    issuer,
    issuerDID,
    issuanceDate,
    expiryDate,
    userData:userData,
    jwt: vcjwt,
  };
  } else 
    return {error: 'invalid vc format'};
  } catch (e) {
    console.log('error decoding vc->'+e);
    return {error: `${e}`};
  }
    
}


export function getCredSubjectData(vctype:SupportedVCType, vcobj:SubjectObjectType):SubjectDataType {
  if (vctype == 'CitizenId') {
   //let datak: CitizenIDdata2;
   console.log('keys->'+Object.keys(CitizenIDdata));
   //const data = getValues(vcobj,['personalIdentifier','familyName','firstName','dateOfBirth']) as CitizenIDdata;
   const objdata = vcobj as CitizenIDtype;
   const data = {...CitizenIDdata};
   if (vctype!= data._nametag)
     return null;
   data.personalIdentifier = objdata.personalIdentifier;
   data.familyName = objdata.familyName;
   data.firstName = objdata.firstName;
   data.dateOfBirth = objdata.dateOfBirth;
   return data;

  } else if (vctype == 'bachelorDegree') {
    console.log('keys->'+Object.keys(BachelorDegreeData));
    const objdata = vcobj as bachelorDegreetype;
    const data = {...BachelorDegreeData};
    if (vctype!= data._nametag)
    return null;
    data.identifierValue = objdata.identifier.value;
    data.familyName = objdata.familyName;
    data.firstName = objdata.firstName;
    data.title = (objdata.achieved[0]) ? objdata.achieved[0]?.title : '';
    data.grade = (objdata.achieved[0]?.wasDerivedFrom[0]) ? objdata.achieved[0]?.wasDerivedFrom[0].grade : '';
    return data;

  } else if (vctype == 'LicenseToPractice') {
    console.log('keys->'+Object.keys(LicenseToPracticeData));
    const objdata = vcobj as LicenseToPracticetype;
    const data = {...LicenseToPracticeData};
    if (vctype!= data._nametag)
    return null;
    data.registrationNumber = objdata.registrationNumber;
    data.familyName = objdata.familyName;
    data.firstName = objdata.firstName;
    data.licenseCode = objdata.licenseCode;
    data.licensedFor = objdata.licensedFor.length>0 ? [...objdata.licensedFor] : [];
    return data;
  }
  else return null
  
}



