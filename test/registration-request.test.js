import axios from 'axios';
import adapter from 'axios/lib/adapters/http';
import { v4 } from 'uuid';
import { config } from '../config';
import { addRecordToEhrRepo } from '../utils/add-record-to-ehr-repo';
import { emisEhrRequestTemplate } from './data/emis-ehr-request';
// import { connectToQueueAndAssert } from '../utils/queue/handle-queue';
import fs from 'fs';
import https from 'https';

const httpsAgent = new https.Agent({
  cert: fs.readFileSync(`certs/${config.nhsEnvironment}/repo-client.crt`),
  key: fs.readFileSync(`certs/${config.nhsEnvironment}/repo-client.key`),
  ca: [
    fs.readFileSync(`certs/${config.nhsEnvironment}/repo-ca1.crt`),
    fs.readFileSync(`certs/${config.nhsEnvironment}/repo-ca2.crt`)
  ],
  // Turns off certificate name validation
  checkServerIdentity: () => {
    return null;
  }
});

describe('EMIS registration requests', () => {
  const RETRY_COUNT = 40;
  const POLLING_INTERVAL_MS = 500;
  const TEST_TIMEOUT = 3 * RETRY_COUNT * POLLING_INTERVAL_MS;

  it(
    'should capture a registration request',
    async done => {
      const testData = {
        dev: {
          odsCode: 'C81116',
          nhsNumber: '9693795822',
          fromPartyId: 'C81116-822653',
          toPartyId: 'B85002-822652'
        },
        test: {
          odsCode: 'N82668',
          nhsNumber: '9692295281',
          fromPartyId: '5XZ-821385',
          toPartyId: 'B86041-822103'
        }
      };

      // Setup: add an EHR to the repo
      const { nhsNumber, odsCode, fromPartyId, toPartyId } = testData[config.nhsEnvironment];
      // const EHR_EXTRACT_INTERACTION_ID = 'RCMR_IN030000UK06';

      try {
        await axios.get(`${config.ehrRepoUrl}/patients/${nhsNumber}`, {
          headers: { Authorization: config.ehrRepoAuthKeys },
          adapter
        });
        console.log('EHR found for patient:', nhsNumber);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          await addRecordToEhrRepo(nhsNumber);
        }
      }

      // Action: send an EHR request to MHS Adapter inbound
      const conversationId = v4();
      const messageId = v4();
      const ehrRequest = generateEhrRequest(
        conversationId,
        messageId,
        nhsNumber,
        odsCode,
        fromPartyId,
        toPartyId
      );

      const headers = {
        Soapaction: 'urn:nhs:names:services:gp2gp/RCMR_IN010000UK05',
        'Content-Type':
          'multipart/related;charset="UTF-8";type="text/xml";boundary="0adedbcc-ed0f-415d-8091-4e816bf9d86f";start="<ContentRoot>"'
      };

      await axios
        .post(config.mhsInboundUrl, ehrRequest, { headers: headers, adapter, httpsAgent })
        .catch(ex => {
          console.log('Failed to send to ehr request to MHS, Exception: ', ex);
        });

      console.log('ConversationId:', conversationId);

      let registrationStatus;
      const expectedStatus = 'sent_ehr';
      for (let i = 0; i < RETRY_COUNT; i++) {
        const registrationDetails = await getRegistrationDetails(conversationId);
        registrationStatus = registrationDetails.status;
        console.log(`try: ${i} - status: ${registrationStatus}`);

        if (registrationStatus === expectedStatus) {
          break;
        }
        await sleep(POLLING_INTERVAL_MS);
      }

      expect(registrationStatus).toEqual(expectedStatus);

      // if (config.useTestHarness) {
      //   connectToQueueAndAssert(body => {
      //     expect(body).toContain(nhsNumber);
      //     expect(body).toContain(EHR_EXTRACT_INTERACTION_ID);
      //     expect(body).toContain(conversationId);
      //     done();
      //   });
      // }
      done();
    },
    TEST_TIMEOUT
  );
});

const generateEhrRequest = (
  conversationId,
  messageId,
  nhsNumber,
  odsCode,
  fromPartyId,
  toPartyId
) => {
  return emisEhrRequestTemplate
    .replace(/\$\{conversationId\}/g, conversationId)
    .replace(/\$\{messageId\}/g, messageId)
    .replace(/\$\{nhsNumber\}/g, nhsNumber)
    .replace(/\$\{odsCode\}/g, odsCode)
    .replace(/\$\{fromPartyId\}/g, fromPartyId)
    .replace(/\$\{toPartyId\}/g, toPartyId);
};

const getRegistrationDetails = async conversationId => {
  try {
    const registrationDetailsResp = await axios.get(
      `${config.repoToGpUrl}/registration-requests/${conversationId}`,
      {
        headers: { Authorization: config.repoToGpAuthKeys },
        adapter
      }
    );
    return registrationDetailsResp.data.data.attributes;
  } catch (err) {
    console.log('Failed to get registration details, Status: ', err.response.status);
    return {};
  }
};

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
