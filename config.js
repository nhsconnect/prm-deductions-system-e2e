export const config = {
  nhsEnvironment: process.env.NHS_ENVIRONMENT,
  mhsInboundUrl: process.env.MHS_INBOUND_URL,
  repoToGpUrl: process.env.REPO_TO_GP_URL,
  repoToGpAuthKeys: process.env.REPO_TO_GP_AUTHORIZATION_KEYS,
  gpToRepoUrl: process.env.GP_TO_REPO_URL,
  gpToRepoAuthKeys: process.env.GP_TO_REPO_AUTHORIZATION_KEYS,
  gp2gpMessengerUrl: process.env.GP2GP_MESSENGER_URL,
  gp2gpMessengerAuthKeys: process.env.GP2GP_MESSENGER_AUTHORIZATION_KEYS,
  ehrRepoUrl: process.env.EHR_REPO_URL,
  ehrRepoAuthKeys: process.env.EHR_REPO_AUTHORIZATION_KEYS,
  amqQueueUrl: process.env.AMQP_QUEUE_URL,
  queueUsername: process.env.QUEUE_USERNAME,
  queuePassword: process.env.QUEUE_PASSWORD,
  useTestHarness: process.env.USE_TEST_HARNESS === "true"
};