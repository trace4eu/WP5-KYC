import React from 'react';

import Box from '@mui/material/Box';
import AdminApiService, { getEventsParmsType, getVCsParamsType, metadataType } from '../api/AdminApiService';
import DataTable from '../components/DataTable';
import { useNavigate } from 'react-router-dom';

export interface IEvent {
 [key: string]: string | undefined;
  _id:string;
  documentId: string;
  eventId:string;
  eventType:string;
  customerName:string;
  status:string;
  submittedDate: string;
}

export interface IEventResponse {
  metadata: metadataType;
  data: IEvent[];
}


interface PropsEvents {
    status: string;
  }

const GetEvents = ({ status }: PropsEvents) => {
  const navigate = useNavigate();
  const statusParm = {status}
  const getEvents = () =>
    AdminApiService.getEvents(statusParm) as Promise<IEventResponse>;

  const navigateToVCDetails = (id: string) => navigate(`/userdata/${id}`);

  const HEADER = `${status.toUpperCase()} Events`;

  return (
    <Box>
      <DataTable
        
        onRefreshData={getEvents}
        navigateToVCDetails={navigateToVCDetails}
        header={HEADER}
      />
    </Box>
  );
};

export default GetEvents;