import axios from 'axios';
import { config } from '../config';
import adapter from 'axios/lib/adapters/http';
import { v4 as uuid } from 'uuid';

const getPatientPdsDetails = async nhsNumber => {
  try {
    const pdsResponse = await axios.get(
      `${config.gp2gpMessengerUrl}/patient-demographics/${nhsNumber}/`,
      {
        headers: {
          Authorization: config.gp2gpMessengerAuthKeys
        },
        adapter
      }
    );

    return pdsResponse.data;
  } catch (err) {
    console.log(`Getting patient details failed with status: ${err.response.status}`);
    throw err;
  }
};

const assignPatientToOdsCode = async (nhsNumber, odsCode) => {
  try {
    // Get the PDS info
    const pdsResponse = await getPatientPdsDetails(nhsNumber);

    // Update PDS
    const patchResponse = await axios.patch(
      `${config.gp2gpMessengerUrl}/patient-demographics/${nhsNumber}`,
      {
        pdsId: pdsResponse.data.patientPdsId,
        serialChangeNumber: pdsResponse.data.serialChangeNumber,
        newOdsCode: odsCode,
        conversationId: uuid()
      },
      {
        headers: {
          Authorization: config.gp2gpMessengerAuthKeys
        },
        adapter
      }
    );
    expect(patchResponse.status).toBe(204);
  } catch (err) {
    console.log(
      `Assigning patient ${nhsNumber} to ODS code ${odsCode} failed with ${err.response.status} status code`
    );
  }
};

export { getPatientPdsDetails, assignPatientToOdsCode };
