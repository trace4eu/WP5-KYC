import DateConverter from '../helpers/DateConverter';

export const transformString = (initinput: string): string => {
  const input = initinput.includes('userData.')
    ? initinput.replace('userData.', '').trim()
    : initinput.trim();

  switch (input) {
    case 'userid':
      return 'User ID';
    case 'eventType':
      return 'Event Type';
    case 'submittedDate':
      return 'Submitted Date';
    case 'customerName':
      return 'Customer Name';
    case 'reqDate':
      return 'Request Date';
    case 'issuanceDate':
      return 'Issuance Date';
    case 'expiryDate':
      return 'Expiry Date';
    case 'issuer':
      return 'Issuer';
    case 'issuerDID':
      return 'Issuer DID';
    case 'vctype':
      return 'VC Type';
    case 'type':
      return 'VC Type';
    case 'status':
      return 'Status';
    case 'firstName':
      return 'First Name';
    case 'familyName':
      return 'Family Name';
    case 'dateOfBirth':
      return 'Date Of Birth';
    case 'personalIdentifier':
      return 'Personal Identifier';
    case 'downloaded':
      return 'Downloaded';
    case 'title':
      return 'Title';
    case 'grade':
      return 'Grade';
    case 'identifierValue':
      return 'Identifier Value';
    case 'acceptancetoken':
      return 'Acceptance Token';
    case 'validityPeriod':
      return 'Validity Period';
    case 'bachelorDegree':
      return 'Bachelor Degree';
    case 'CitizenId':
      return 'Citizen ID';
    case 'registrationNumber':
      return 'Registration Number';
    case 'licenseCode':
      return 'License Code';
    case 'licensedFor':
      return 'Licensed For. Please separate by comma.';
    case 'LicenseToPractice':
      return 'License To Practice';
    default:
      return input;
  }
};

const isValidDate = (dateString: string) => {
  const dateObject = new Date(dateString);
  return !isNaN(dateObject.getTime());
};

export const transformDataArray = (dataArray: Record<string, unknown>[]) =>
  dataArray.map((obj) => {
    const transformedObj: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase() === 'downloaded') {
        if (value === false) {
          transformedObj[transformString(key)] = 'no';
        } else {
          transformedObj[transformString(key)] = 'yes';
        }
      } else if (typeof value === 'string' && typeof value !== 'object') {
        if (
          key !== 'issued_id' &&
          key !== 'submitted_id' &&
          key !== 'deferred_id' &&
          key.toLowerCase() !== 'acceptancetoken' &&
          key.toLowerCase() !== 'jwt' &&
          !key.includes('nametag')
        ) {
          const tableValue = (key.toLocaleLowerCase().includes('date') && isValidDate(value)) ? DateConverter.dateToString(value) : value;
          transformedObj[transformString(key)] = tableValue;
        } else {
          transformedObj[key] = value;
        }
      }
    }
    return transformedObj;
  });

export const transformTableValue = (itemKey: string, value: string | boolean) => {
  let tableValue = value;

  if (itemKey.toLowerCase() === 'downloaded') {
    if (value === false) {
      tableValue = 'no';
    } else {
      tableValue = 'yes';
    }
  }

  if (
    typeof value === 'string' &&
    itemKey.toLocaleLowerCase().includes('date') &&
    isValidDate(value)
    //  &&
    // !itemKey.includes('identifierValue') &&
    // !itemKey.includes('personalIdentifier') && 
    // !itemKey.includes('statusListIndex')
  ) {
    tableValue = DateConverter.dateToString(value);
  }
  if (typeof value !== 'string' || (typeof value === 'string' && itemKey.includes('nametag'))) {
    return null;
  }

  return tableValue;
};
