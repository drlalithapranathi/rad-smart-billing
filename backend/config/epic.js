module.exports = {
  clientId: process.env.EPIC_CLIENT_ID,
  clientSecret: process.env.EPIC_CLIENT_SECRET || '',

  fhirBaseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
  authorizeUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
  tokenUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',

  scope: 'launch patient/Patient.Read patient/Observation.Read patient/Condition.Read',

  redirectUri: process.env.EPIC_REDIRECT_URI || 'http://localhost:3000/epic/callback',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000/frontend/epic/index.html'
};