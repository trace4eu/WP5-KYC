import React, { useEffect, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Input from '@mui/material/Input';
import Radio from '@mui/material/Radio';

import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';

import Checkbox from '@mui/material/Checkbox';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { IPendingVCResponse } from '../screens/PendingVCs';
import {IEvent, IEventResponse} from '../screens/GetEvents'
// import { IIssuedVCResponse } from '../screens/IssuedVCs';
// import { ISubmittedVCResponse } from '../screens/SubmittedVCs';

import ErrorAlert from '../components/ErrorAlert';
import AdminApiService, { getVCsParamsType, metadaOrderType } from '../api/AdminApiService';

import Container from '@mui/material/Container';
import { CircularProgress, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { transformDataArray } from '../helpers/transformStringAndData';
import { checkedCellValue } from '../helpers/checkedCellValue';
import { serverErrorResponse } from '../api/ApiClient';
import EventModal from '../components/EventModal';
import VerifiedEventModal, { SubmittedDetails, VerifiedEventDetails } from '../components/VerifiedEventModal';
import { json } from 'stream/consumers';
import InfoAlert from './InfoAlert';
window.Buffer = window.Buffer || require('buffer').Buffer;

interface DataTableProps {
  
  onRefreshData: (
    
  ) =>
    | Promise<IEventResponse  >
    | Promise<typeof serverErrorResponse.TOKEN_REQUIRED>;
  navigateToVCDetails: (id: string) => void;

  header: string;
}

const metadaOrder = {
  OLDEST: 'oldest',
  NEWEST: 'newest',
};

const DataTable: React.FC<DataTableProps> = ({
 
  onRefreshData,
  navigateToVCDetails,

  header,
}) => {
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchValue, setSearchValue] = useState<string>('');
  const [sortByNewest, setSortByNewest] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [tableData, setTableData] = useState<Record<string, string>[]>([]); //IPendingVC[] | IIssuedVC[]
  const [events, setEvents] = useState<IEvent[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [totalCredentials, setTotalCredentials] = useState<number>(0);
  const [headCells, setHeadCells] = useState<string[]>([]);
  const [isShowDetails, setIsShowDetails] = useState<boolean>(false);
  const [event, setEvent] = useState<object|null>(null);
  const [personalData, setPersonalData] = useState<object|null>(null);
  const [isEventDetails, setIsEventDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
   const [alertSuccess, setAlertSuccess] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string>('Success!');
  //const [eventDetails, setEventDetails] = useState<SubmittedDetails | null>(null);

  const navigate = useNavigate();

  const onShowDetailsClose = () => {
    setIsShowDetails(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEventDetails(false);
    //setEventDetails(null);
    
  };

 

  const selectedRecord = () => {
    const selected= events.filter(item=> {
      return item._id == selectedItemId
    })[0];
    console.log('selected->'+selected);
    return selected
  }

  const selectedRecordById = (id: string) => {
    const selected= events.filter(item=> {
      return item._id == id
    })[0];
    console.log('selectedbyid->'+JSON.stringify(selected));
    return selected
  }

  const getEvent = async () => {
    try {

      const selected= selectedRecord();
      const eventParams= {documentId: selected.documentId, eventId:selected.eventId}
      const event= await AdminApiService.getTnTEvent(eventParams);
      setEvent(event);
      setPersonalData(null);
      setLoading(false);
      setModalTitle('TnT event details')
      setIsShowDetails(true);
     
    } catch (error) {
    
        console.error('Error on fetching event data:' + error);
        setError('Something went wrong.');
      
    } finally {
      setLoading(false);
    }
  };

  const getEncDoc = async () => {
    try {

      const selected= selectedRecord();
      const eventParams= {documentId: selected.documentId, eventId:selected.eventId}
      const cleartext=await AdminApiService.decryptdocfetch(eventParams);
      
      setLoading(false);
      if (cleartext) {
      const a = document.createElement('a');
      a.download = 'KYC-docs-decrypted.pdf';
 
      const blob = new Blob([cleartext],  {type : 'application/pdf'} );
      a.href = URL.createObjectURL(blob);  
      a.click();
      }
     
    } catch (error) {
    
        console.error('Error on decrypt doc:' + error);
        setError('Something went wrong.');
      
    } finally {
      setLoading(false);
    }
  };

  const getVerifiedData = async () => {
    try {

      const selected= selectedRecord();
      const eventParams= {documentId: selected.documentId, eventId:selected.eventId}
      const cleartext=await AdminApiService.getVerified(eventParams);
      
      setLoading(false);
      if (cleartext) {
        setEvent(null);
        setPersonalData(cleartext);
        setLoading(false);
        setModalTitle('verified data details')
        setIsShowDetails(true);
      }
     
    } catch (error) {
    
        console.error('Error on getverified:' + error);
        setError('Something went wrong.');
      
    } finally {
      setLoading(false);
    }
  };

  const getPersonalData = async () => {
    try {

      const selected= selectedRecord();
      const eventParams= {documentId: selected.documentId, eventId:selected.eventId}
      const cleartext=await AdminApiService.decryptPersonalData(eventParams);
      
      setLoading(false);
      if (cleartext) {
        setEvent(null);
        setPersonalData(cleartext);
        setLoading(false);
        setModalTitle('shared personal data details')
        setIsShowDetails(true);
      }
     
    } catch (error) {
    
        console.error('Error on getpersonaldata:' + error);
        setError('Something went wrong.');
      
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async () => {
    try {

      const selected= selectedRecord();
      const eventParams= {documentId: selected.documentId, eventId:selected.eventId, eventType:selectedEventType, status:"completed"}
      const response=await AdminApiService.updateEvent(eventParams);
      
      setLoading(false);
      onRefresh();
      setAlertMessage('event updated successfully');
      setAlertSuccess(true);
    } catch (e) {
      console.error('Error on update event' + error);
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }


  const addVerified = async (submittedDetails:SubmittedDetails) => {
    try {

    //  const submittedDetails = eventDetails;
      console.log(' submitted->'+submittedDetails);
      setIsModalOpen(false);
      setIsEventDetails(false);
      //setEventDetails(null);

      if (!submittedDetails) {
        setError('Please enter event details.');
        return;
      }

      setLoading(true);
      const selected= selectedRecord();
      const eventParams= {documentId: selected.documentId, eventId:selected.eventId, personalData: submittedDetails, customerName:selected.customerName}
      const response=await AdminApiService.addVerifyEvent(eventParams);
      if (response && !response.success) {
        setError(`something went wrong ${response.errors ?response.errors[0] :''}`)
      }
      
      setLoading(false);
      setAlertMessage('verified event added successfully');
      setAlertSuccess(true);
      
     
    } catch (error) {
    
        console.error('Error on add verify event:' + error);
        setError('Something went wrong.');
      
    } finally {
      setLoading(false);
    }
  };

  const manageTable = (
    serverResponse:  IEventResponse ,
    ignore: boolean
  ) => {
    const credentials = serverResponse.data;
    const events = serverResponse.data;
    const metadata = serverResponse.metadata;
    metadata && metadata.total && setTotalCredentials(metadata.total);

    if (!ignore) {
      const transformedData = transformDataArray(events);
      console.log('transformedData: ', transformedData);
      //  keys to exclude from headers of table
      const excludeKeys = ['documentId', 'eventId', '_id', 'randomEncKey'];

      //Get unique keys excluding specified keys
      const headers = Array.from(
        new Set(
          transformedData.flatMap((item) =>
            Object.keys(item).filter((key) => !excludeKeys.includes(key))
          )
        )
      );
      //const headers = Object.keys(transformedData[0] || {});
      setHeadCells(headers);
      setTableData(transformedData);
      setEvents(events);
    }
    console.log('Table metadata: ', metadata);
    console.log('table get data and data is: ', credentials);
  };

  useEffect(() => {
    let ignore = false;
    const getData = async () => {
      try {
        const serverResponse = await onRefreshData();
        console.log('serverResponse on load:', serverResponse);

        if (serverResponse === serverErrorResponse.TOKEN_REQUIRED) {
          navigate('/login');
        } else {
          typeof serverResponse !== 'string' && manageTable(serverResponse, ignore);
        }
      } catch (error) {
        if (error === serverErrorResponse.TOKEN_REQUIRED) {
          navigate('/login');
        } else {
          console.error('Error on fetching table data:' + error);
          setError('Something went wrong.');
        }
      } finally {
        setLoading(false);
      }
    };
    getData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const getData = async () => {
      const params: getVCsParamsType = {
        page: page + 1,
        limit: rowsPerPage,
        order: sortByNewest
          ? (metadaOrder.NEWEST as metadaOrderType)
          : (metadaOrder.OLDEST as metadaOrderType),
      };

      if (searchTerm.length > 0) {
        params.searchtext = searchTerm;
      }

      try {
        setLoading(true);
        const serverResponse = await onRefreshData();
        console.log('serverResponse on refresh:', serverResponse);
        if (serverResponse === serverErrorResponse.TOKEN_REQUIRED) {
          navigate('/login');
        } else {
       //   typeof serverResponse !== 'string' && manageTable(serverResponse, ignore);
        }
      } catch (error) {
        console.error('Error on fetching table data:' + error);
        setError('Something went wrong.');
      } finally {
        setLoading(false);
      }
    };
    getData();

    return () => {
      ignore = true;
    };
  }, [sortByNewest, searchTerm, page, rowsPerPage]);



  const handleChangePage = (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    event?.preventDefault();
    setPage(newPage);
  };

  const handleItemChange = (event: React.SyntheticEvent<Element, Event>) => {
    event?.preventDefault();
    const radioEvent = event as React.ChangeEvent<HTMLInputElement>;
    console.log('selectedItemId: ', radioEvent.target.value);
    setSelectedItemId(radioEvent.target.value);
    const selected= selectedRecordById(radioEvent.target.value);
    setSelectedEventType(selected.eventType);
    setSelectedStatus(selected.status)

  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    event?.preventDefault();
    console.log('RowsPerPage taget: ', parseInt(event.target.value, 10));
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const onRefresh = async () => {
    try {
      setLoading(true);

      const serverResponse = await onRefreshData();
      if (serverResponse === serverErrorResponse.TOKEN_REQUIRED) {
        throw new Error(serverErrorResponse.TOKEN_REQUIRED);
      } else if (typeof serverResponse !== 'string') {
         manageTable(serverResponse, false);
        setPage(0);
      }
    } catch (e) {
      if (e === serverErrorResponse.TOKEN_REQUIRED) {
        navigate('/login');
      }
      console.error(e);
      typeof e === 'string' ? setError(e) : setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onDetails = () => {
    setLoading(true);
    getEvent();
  };

  const onGetEncDocs = () => {
    setLoading(true);
    getEncDoc();
  };

  const onAddVerified = () => {
   setIsModalOpen(true);
   setIsEventDetails(true);
  // setEventDetails(null);
  };

  const onGetVerified = () => {
    setLoading(true);
    getVerifiedData();
   };

   const onGetPersonalData = () => {
    setLoading(true);
    getPersonalData();
   };

   const onMarkCompleted = () => {
    setLoading(true);
    updateEvent();
   };

  const onSendSearchTerm = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event?.preventDefault();
    setSearchTerm(searchValue);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      setSearchTerm(searchValue);
    }
  };

  const onErrorAlertClose = () => {
    setError('');
   // navigate('admin');
  };

  console.log('loading', loading);

  const onInfoAlertClose = () => {
    setAlertSuccess(false);
    //navigate('/issued-vc');
  };

  if (loading) {
    return (
      <Box
        sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress size="8vw" />
      </Box>
    );
  }

  return (
    
    <Container>
      
      <Typography variant={'h5'} paddingBottom={3} paddingLeft={3}>
        {header}
      </Typography>
      <ErrorAlert message={error} isErrorWindow={error.length > 0} onClose={onErrorAlertClose} />
      <InfoAlert message={alertMessage} open={alertSuccess} handleClose={onInfoAlertClose} />
      {tableData.length === 0 ? (
        <Typography py={3}>There are no events</Typography>
      ) : (
        <Box>
          <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={onRefresh}
              style={{ width: '150px', marginRight: '16px' }}
            >
              {' '}
              REFRESH{' '}
            </Button>

            <FormControlLabel
              control={
                <Checkbox
                  checked={sortByNewest}
                  onChange={(e) => {
                    e.preventDefault();
                    setSortByNewest(!sortByNewest);
                    setPage(0);
                  }}
                />
              }
              label="newest"
            />
            <Input
              placeholder="Search..."
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              value={searchValue}
              endAdornment={
                <IconButton onClick={onSendSearchTerm}>
                  <SearchIcon />
                </IconButton>
              }
            />

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalCredentials} //{tableData.length | 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              style={{ marginTop: '16px' }}
            />
          </Box>

          <Box display={'flex'}>
            {event && !personalData &&
            <EventModal onClose={onShowDetailsClose} jsonObject={event} open={isShowDetails} title={modalTitle} />}

            {!event && personalData &&
            <EventModal onClose={onShowDetailsClose} jsonObject={personalData} open={isShowDetails} title={modalTitle} />}

            {isEventDetails &&
            <VerifiedEventModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              
             // setEventDetails={setMyEventDetails}
              handleProceed={addVerified}
            />}

            <FormControl component="fieldset" style={{ marginTop: '16px' }}></FormControl>

            <TableContainer component={Paper} style={{ margin: '5vh 0' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ border: 'none' }}></TableCell>
                    {headCells.map((headCell, i) => {
                      const header = checkedCellValue(headCell);
                      return header && <TableCell key={headCell + i}>{header}</TableCell>;
                    })}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {tableData.map((item, i) => (
                    <TableRow key={'' + i}>
                      <TableCell>
                        <FormControlLabel
                          // style={{ paddingTop: '5px' }} padding-left: 20px
                          style={{ paddingLeft: '20px' }}
                          value={item._id}
                          control={
                            <Radio
                              checked={
                                selectedItemId === item._id
                            
                              }
                            />
                          }
                          label={''}
                          onChange={handleItemChange}
                        />
                      </TableCell>
                      {headCells.map((header) => {
                        const displayHeader = checkedCellValue(header);
                        return (
                          displayHeader && (
                            <TableCell key={header}
                                       sx={ (header=='Event Type') ? {fontStyle: "italic" , color: 'violet'} : {}}
                             >
                              {item[displayHeader as string]}
                            </TableCell>
                          )
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={onDetails}
            disabled={selectedItemId === null}
            style={{ width: '150px',textTransform: 'none' }}
          >
            {' '}
            TnT Event{' '}
          </Button>

          <Button
            
            variant="contained"
            color="primary"
            onClick={onGetEncDocs}
            disabled={selectedItemId === null}
           style={(selectedEventType==='KYC_docs_shared') ?{ width: '150px', marginLeft:'15px', display:'inline',textTransform: 'none' } : {display: 'none'}}
          >
            {' '}
            Get Enc docs{' '}
          </Button>

          <Button
            
            variant="contained"
            color="primary"
            onClick={onAddVerified}
            disabled={selectedItemId === null}
           style={(selectedEventType==='KYC_docs_shared' && selectedStatus=='pending') ?{ width: '180px', marginLeft:'15px', display:'inline',textTransform: 'none' } : {display: 'none'}}
          >
            {' '}
            Add Verified data{' '}
          </Button>

          <Button
            
            variant="contained"
            color="primary"
            onClick={onGetVerified}
            disabled={selectedItemId === null}
           style={(selectedEventType==='KYC_docs_verified') ?{ width: '190px', marginLeft:'15px', display:'inline',textTransform: 'none' } : {display: 'none'}}
          >
            {' '}
            Verified data{' '}
          </Button>

          <Button
            
            variant="contained"
            color="primary"
            onClick={onGetPersonalData}
            disabled={selectedItemId === null}
           style={(selectedEventType==='personal_data_shared') ?{ width: '190px', marginLeft:'15px', display:'inline',textTransform: 'none' } : {display: 'none'}}
          >
            {' '}
            Personal data{' '}
          </Button>
          <Button
            
            variant="contained"
            color="primary"
            onClick={onMarkCompleted}
            disabled={selectedItemId === null}
           style={(selectedStatus=='pending') ?{ width: '190px', marginLeft:'15px', display:'inline',textTransform: 'none' } : {display: 'none'}}
          >
            {' '}
            Mark completed{' '}
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default DataTable;
