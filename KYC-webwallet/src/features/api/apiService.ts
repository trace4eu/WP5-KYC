import qs from 'qs';
import jose from 'node-jose';
import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios';
import jwt_decode from 'jwt-decode';
import {JWK} from 'jose';
import {TokenParams, Payload, generateToken} from '../../helpers/generateToken';
import WalletModel from '../../models/WalletModel';
import codeChallenge, {codeVerifier} from '../../helpers/codeChallenge';

import {
  CredentialIssuerMetadata,
  CredentialResponse,
  OPMetadata,
  TokenResponse,
  walletKnownCard,
} from '../../types/typeCredential';
import {VCtype} from '../../screens/Wallet';
import {initBanchType, initBatchResponseType, ReqEventsRespType} from '../../types/newBatchTypes';

import {EventDetailsType, pendingTaskType} from '../../types/pendingTaskType';
import {presentationSubmission} from '../../helpers/presentationSubmission';
import getVerifiablePresentationJwt from '../../helpers/getVerifiablePresentationJwt';
import { InitShareReq } from 'interfaces/utils.interface';
import { IGetVCReqOptions } from 'features/credentialSlice';

axios.defaults.timeout = 35000;
const abortTimeout = 35000;

interface ValidationError {
  message: string;
  errors: Record<string, string[]>;
}

type DecodedJWT = {
  aud: string;
  client_id: string; // "http://testissuer.acgoldman.com:3005/v3/auth"
  iss: string; //"http://testissuer.acgoldman.com:3005/v3/auth"
  nonce: string; // "e91bcbc4-6f99-4a90-bf96-92af02e7c961"
  redirect_uri: string; // "http://testissuer.acgoldman.com:3005/v3/auth/direct_post"
  response_mode: string; // "direct_post"
  response_type: string; // "id_token"
  scope: string; //"openid"
  state: string; // "8402ab32-9293-4f72-9ff6-52738d8e7d12"
};

interface JWTHeader {
  typ: string;
  alg: string;
  kid: string;
}

export interface IPostCredentialReqOptions {
  method: string;
  headers: {
    Authorization: string;
    'Content-type': string;
  };
  data: {
    format: 'jwt_vc';
    types: [
      'VerifiableCredential',
      'VerifiableAttestation',
      walletKnownCard // e.g. "CitizenId"
    ];
    proof: {
      proof_type: 'jwt';
      jwt: string;
    };
  }; //qs.ParsedQs;
  url: string;
  // signal: AbortSignal;
}

type headersType = {
  'Content-Type': 'application/x-www-form-urlencoded';
  followRedirects: boolean;
  authorization?: string;
};

interface PostTokenPreAuthorizedCodeDto {
  grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code';
  'pre-authorized_code': string;
  user_pin: string;
}

type errorResponseData = {
  detail: string;

  status: number;
  title: string;
  type: string;
};

export default class ApiService {
  private token_endpoint: string | null;
  private issuerUrl: string | null;
  private issuerUrlCredential: string | null;
  private offerUrl: string | null;
  private types: string[];
  private headers: headersType;
  private walletinstance: WalletModel;
  private isLogin: boolean;

  constructor(walletinstance: WalletModel) {
    // super();
    this.walletinstance = walletinstance;
    this.token_endpoint = null;
    this.issuerUrl = null;
    this.issuerUrlCredential = null;
    this.offerUrl = null;
    this.types = [];
    this.headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      followRedirects: false,
    };
    this.isLogin = false;

    // axios.defaults.timeout = 13000;
    console.log('apiservice init->' + this.walletinstance);
  }

  // Centralized error handler
  private _handleError(error: unknown): never {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      const errorData = axiosError.response.data as errorResponseData;
      let errorDetails = errorData.detail;
      const parsedDetail = JSON.parse(errorData.detail);

      if (Array.isArray(parsedDetail)) {
        errorDetails = parsedDetail.join(', ');
      }
      const errorMessage = `${errorData.title || 'Request error '}: \n ${errorDetails}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    if (error instanceof Error) {
      throw new Error('Request error:  \n' + error.message);
    } else {
      console.error('Network or other error', error);
      throw new Error('An unexpected error occurred');
    }
  }

  // Reusable request method
  private async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const configWithSignal: AxiosRequestConfig = {
      ...config,
      signal: AbortSignal.timeout(abortTimeout),
    };

    try {
      return await axios(configWithSignal);
    } catch (error) {
      this._handleError(error);
    }
  }

  async getPayload(url: string) {
    sessionStorage.clear();
    const response = await axios.get(url, {signal: AbortSignal.timeout(abortTimeout)});
    this.types = response.data.credentials[0].types;
    this.isLogin =
      response.data.loginRequired === true || response.data.loginRequiredOpenID === true
        ? true
        : false;

    console.log('isLogin ===', this.isLogin);
    if (this.isLogin) {
      sessionStorage.setItem('codeVerifier', codeVerifier);
      sessionStorage.setItem('types', response.data.credentials[0].types);
    }

    return response.data;
  }

  async getAuth(issuerurl: string, types: string[], issuer_state: string) {
    let authresp;
    let authServer;
    let deferredEndpoint;

    try {
      const metadata = await axios.get(`${issuerurl}/.well-known/openid-credential-issuer`, {
        signal: AbortSignal.timeout(abortTimeout),
      });

      authServer = metadata.data?.authorization_server as unknown as string;
      deferredEndpoint = metadata.data?.deferred_credential_endpoint as unknown as string;
      this.issuerUrl = issuerurl; //metadata.data?.credential_endpoint;
      console.log('=================');
      console.log('issuerUrl received by getAuth:', issuerurl);
      this.issuerUrlCredential = metadata.data?.credential_endpoint;
      console.log('issuerUrlCredential: ', metadata.data?.credential_endpoint);

      if (this.isLogin) {
        sessionStorage.setItem('issuerUrlMeta', metadata.data?.credential_endpoint);
        sessionStorage.setItem('issuerUrl', issuerurl);
        sessionStorage.setItem('deferredEndpoint', deferredEndpoint);
      }

      const openidmetadata = await axios.get(`${authServer}/.well-known/openid-configuration`, {
        signal: AbortSignal.timeout(abortTimeout),
      });
      this.token_endpoint = openidmetadata.data.token_endpoint;

      this.isLogin && sessionStorage.setItem('token_endpoint', openidmetadata.data.token_endpoint);

      const redirect_uri = `${process.env.REACT_APP_URL}/openid-code`;

      authresp = await axios.get(openidmetadata.data.authorization_endpoint, {
        params: {
          response_type: 'code',
          scope: 'openid',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          client_id: this.walletinstance.getDIDes256(), // 'did.key.xxxxxxx',
          redirect_uri: redirect_uri,
          authorization_details: JSON.stringify([
            {
              type: 'openid_credential',
              format: 'jwt_vc',

              types: types,
              locations: [issuerurl],
            },
          ]),
          issuer_state, //: offerPayload?.grants.authorization_code?.issuer_state,
        },
        signal: AbortSignal.timeout(abortTimeout),
      });
    } catch (error) {
      console.log('error->' + error);
      throw new Error(JSON.stringify(error));
      //const e = error as unknown as AxiosError;
      //  TODO
      // if (e.response!.statusCode === 302) {
      //   requestUriRespData = e.response!.headers.value('location');
      // }
      // throw new Error('Error:' + JSON.stringify(e.response?.data));
      //return error;
    }

    // openid://?state=52b02b01-a5b6-4a0e-b394-15f36ef2befa&client_id=http%3A%2F%2Ftestissuer.acgoldman.com%3A3005%2Fv3%2Fauth&redirect_uri=http%3A%2F%2Ftestissuer.acgoldman.com%3A3005%2Fv3%2Fauth%2Fdirect_post&response_type=id_token&response_mode=direct_post&scope=openid&nonce=849e4484-b34c-4f2b-be4e-f31ed5e3172a&request_uri=http%3A%2F%2Ftestissuer.acgoldman.com%3A3005%2Fv3%2Fauth%2Frequest_uri%2Fe29de1d8-32f7-4a6a-85f7-3d14f3a45e7d
    const authReqResp = qs.parse(authresp.data.toString());

    if (authReqResp['error']) {
      console.error(authReqResp['error_description']);
      throw new Error(authReqResp['error_description'] as string);
    }
    const requestUri = authReqResp['request_uri'] as string;

    const redirectUri = authReqResp['redirect_uri'] as string;

    const authRespState = authReqResp['openid://?state'];
    const authRespTokenType = authReqResp['response_type'];
    const nonce = authReqResp['nonce'] as string;
    const client_id = authReqResp['client_id'] as string;
    const presentation_definition =
      authReqResp['presentation_definition'] &&
      JSON.parse(authReqResp['presentation_definition'] as string);

    const request = authReqResp['request'];
    let requestUriRespData;

    // if response is too long app needs to get data from request_uri
    if (requestUri) {
      const requestUriResp = await axios.get(requestUri, {
        signal: AbortSignal.timeout(abortTimeout),
      });
      requestUriRespData = requestUriResp.data;
      // if server sends request data directly app accepts request
    } else if (authReqResp.request) {
      requestUriRespData = authReqResp.request as string;
    } else {
      console.error('there neither request nor request_uri');
      throw new Error('there neither request nor request_uri');
    }
    // app gets server key
    const serverKey = await axios.get(`${authServer}/jwks`, {
      signal: AbortSignal.timeout(abortTimeout),
    });
    const decodedJwt: DecodedJWT = jwt_decode(requestUriRespData);

    const decodedJwtHeader: JWTHeader = jwt_decode(requestUriRespData, {
      header: true,
    });

    const serverJwk = serverKey.data['keys'][0];

    if (decodedJwtHeader['kid'] !== serverJwk['kid']) {
      console.error('Server kid is invalid');
      throw new Error('Server kid is invalid');
    }

    // verify
    // create a JsonWebKey for verifying the signature
    const privateKey = await jose.JWK.asKey(serverJwk, 'json');
    // create keysStore and add jwk
    const keystore = jose.JWK.createKeyStore();
    await keystore.add(privateKey);
    // create a JsonWebSignature verifier from the encoded string
    const verifier = jose.JWS.createVerify(keystore);
    const verified = await verifier.verify(requestUriRespData).catch((e: Error) => {
      console.error('Error during verify ', e);
      throw new Error('Error during verify ' + e);
    });

    if (!verified) {
      console.error('invalid ID or VP Token request signature');
      throw new Error('invalid ID or VP Token request signature');
    }

    return {
      authResp: authReqResp,
      decodedJwt: decodedJwt,
      codeVerifier,
      verifiedKey: verified,
      deferredEndpoint,
      state: authRespState,
      client_id,
      nonce,
      redirect_uri: redirectUri,
      presentation_definition,
      request,
    };
  }

  async getDirectPost(
    vpOrIdTokenData:
      | {
          vp_token: string;
          state?: string;
          presentation_submission?: string;
          verifier_email?: string;
          validity_period?: string;
        }
      | {
          id_token: jose.JWS.CreateSignResult;
          state: string;
        },
    redirect_uri: string
  ) {
    const directPostOptions = {
      method: 'POST',
      headers: this.headers,
      data: qs.stringify(vpOrIdTokenData),
      url: redirect_uri as string,
      signal: AbortSignal.timeout(abortTimeout),
    };

    console.log('directPostOptions =>', directPostOptions);
    try {
      const directPostResp = await axios(directPostOptions);
      console.log('api service directPostResp:', directPostResp);
      // let openidCode_redirect_uri;
      // if (this.isLogin) {
      //   openidCode_redirect_uri = `${process.env.REACT_APP_URL}/openid-code`;
      //   return {redirectUri: directPostResp.data};
      // }
      if ((directPostResp?.data as string).split('error=')[1]) {
        console.error(
          'direct post error',
          qs.parse((directPostResp?.data as string).split('error_description=')[1])
        );
        throw new Error(
          ' Direct post error: ' +
            qs.parse((directPostResp?.data as string).split('error_description=')[1])
        );
      } else {
        const directPostRespData = qs.parse((directPostResp?.data as string).split('?')[1]);

        console.log('directPostRespData string =>', directPostResp?.data);
        if (directPostResp?.data.includes('openid-code')) {
          return directPostRespData;
        } else {
          directPostRespData.redirect = 'redirect';
          return {redirectUri: directPostResp.data};
        }
      }
    } catch (error) {
      if (axios.isAxiosError<ValidationError, Record<string, unknown>>(error)) {
        console.log(error.status);
        console.error(error.response);
      } else {
        console.error(error);
      }
    }
  }

  async getAccessTokenData(authCode: string) {
    const postTokenData = {
      grant_type: 'authorization_code',
      client_id: this.walletinstance.getDIDes256(),
      code: authCode,
      code_verifier: sessionStorage.getItem('codeVerifier') || codeVerifier,
    };

    const postTokenOpts = {
      method: 'POST',
      headers: this.headers,
      url:
        this.token_endpoint !== null
          ? (this.token_endpoint as string)
          : (sessionStorage.getItem('token_endpoint') as string),
      data: postTokenData,
      signal: AbortSignal.timeout(abortTimeout),
    };

    try {
      const accessTokenResp = await axios(postTokenOpts);
      console.log('accessTokenResp : ', accessTokenResp);
      return accessTokenResp.data;
    } catch (e) {
      console.error('Error in getting Access Token Data:', e);
      throw new Error('Error in getting Access Token Data:' + JSON.stringify(e));
    }
  }

  async getCredentialEndPointAndOptions(accessTokenRespData: {
    access_token: string;
    c_nonce: string;
    id_token: string;
  }) {
    const accessToken: string = accessTokenRespData['access_token'];
    const cNonce = accessTokenRespData['c_nonce'];

    const proofJwtPayload: Payload = {
      nonce: cNonce, //c_nonce from token response
      aud: sessionStorage.getItem('codeVerifier')
        ? (sessionStorage.getItem('issuerUrl') as string) // (sessionStorage.getItem('issuerUrl') as string)
        : (this.issuerUrl as string), //this.offerUrl as string, // "https://issuer-url",
      iat: new Date().getTime() / 1000,
      iss: this.walletinstance.getDIDes256() as string,
    };

    const issuerTokenParameters: TokenParams = {
      didKey: this.walletinstance.getDIDes256() as string,
      alg: 'ES256',
      privateKey: this.walletinstance.getKeysES256(),
    };
    try {
      const proofJwt = await generateToken(
        proofJwtPayload,
        issuerTokenParameters,
        'openid4vci-proof+jwt'
      );

      const offerTypesArray = sessionStorage.getItem('types')?.split(',');

      const postCredentialReqData = qs.stringify({
        format: 'jwt_vc',
        types: offerTypesArray ? offerTypesArray : this.types,
        proof: {
          proof_type: 'jwt',
          jwt: proofJwt,
        },
      });

      const postCredentialReqOptions: IPostCredentialReqOptions = {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-type': 'application/json; charset=utf-8',
        },
        data: qs.parse(postCredentialReqData) as IPostCredentialReqOptions['data'],
        url: sessionStorage.getItem('codeVerifier')
          ? (sessionStorage.getItem('issuerUrlMeta') as string)
          : (this.issuerUrlCredential as string),
        // signal: AbortSignal.timeout(20000),
      };
      console.log('postCredentialReq Options: ', postCredentialReqOptions);
      // The response from POST will be a new vc (IN_TIME) or an acceptance_token (DEFERRED)

      return postCredentialReqOptions;
    } catch (e) {
      console.error('Error in getting Credential EndPoint And Options:', e);
      throw new Error('Error in getting Credential EndPoint And Options:' + JSON.stringify(e));
    }
  }

  async getDeferredCredential({url, acceptance_token}: IGetVCReqOptions) {
    console.log('url credential_endpoint  / credential', url);
    const getDCOptions = {
      url,
      method: 'POST',
      headers: {
        authorization: `Bearer ${acceptance_token}`,
      },
    };
    const vc = await axios(getDCOptions);
    return vc.data;
  }

  async getWalletCardStatus(jwt: string, holderDID: string) {
    const walletDID = this.walletinstance.getDIDes256();
    if (holderDID !== walletDID) {
      console.error('Wrong Holder DID');
      throw new Error('Wrong Holder DID');
    }

    const getStatusOptions = {
      url: `${process.env.REACT_APP_PDO_BACKEND_URL}/v3/verifier/verifyVC`,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      data: {
        jwtvc: '' + jwt,
      },
      // timeout: 7000,
      signal: AbortSignal.timeout(abortTimeout),
    };

    let statusResp = null;

    try {
      statusResp = await axios(getStatusOptions);
    } catch (error) {
      console.error('Card status request error: ', error);
      throw new Error('card status error' as string);
    }

    if (statusResp?.data['error']) {
      console.error('Axios error: ', statusResp.data['error_description']);
      throw new Error(statusResp.data['error_description'] as string);
    }

    return statusResp?.data.status;
  }


  async upload(formdata: FormData) {
  

    const config: AxiosRequestConfig = {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data' },
      url: `${process.env.REACT_APP_OFF_CHAIN_URL}/upload`,
      data: formdata
    };

    const uploadResponse = await this.request(config);
    console.log('uploadResponse: ', uploadResponse);

    return uploadResponse.data;
  }

  async initShare(bankUrl: string, initShareReq: InitShareReq) {
  

    const config: AxiosRequestConfig = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      url: `${bankUrl}/init_KYC_share`,
      data: initShareReq
    };

    const initShareResponse = await this.request(config);
    console.log('initShareResponse: ', initShareResponse);

    return initShareResponse.data as initBatchResponseType;
  }


}
