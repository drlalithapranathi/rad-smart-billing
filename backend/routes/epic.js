const express = require('express');
const axios = require('axios');
const router = express.Router();
const epicConfig = require('../config/epic');

router.get('/launch', (req, res) => {
  const { iss, launch, patient } = req.query;
  const issValue = iss || epicConfig.fhirBaseUrl;

  if (iss) req.session.iss = iss;
  if (launch) req.session.launch = launch;
  if (patient) req.session.ehrLaunchPatientId = patient;

  const params = {
    response_type: 'code',
    client_id: epicConfig.clientId,
    redirect_uri: epicConfig.redirectUri,
    scope: epicConfig.scope,
    state: Math.random().toString(36).substring(7),
    aud: issValue
  };

  if (launch) params.launch = launch;

  const authorizeUrl = `${epicConfig.authorizeUrl}?${new URLSearchParams(params).toString()}`;
  res.redirect(authorizeUrl);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const tokenResponse = await axios.post(
      epicConfig.tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: epicConfig.redirectUri,
        client_id: epicConfig.clientId
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, patient, refresh_token, expires_in } = tokenResponse.data;
    const finalPatientId = patient || req.session.ehrLaunchPatientId || null;

    req.session.accessToken = access_token;
    req.session.patientId = finalPatientId;
    req.session.refreshToken = refresh_token;
    req.session.expiresIn = expires_in;

    res.redirect(epicConfig.frontendUrl);
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(500).send('OAuth failed: ' + (error.response?.data?.error_description || error.message));
  }
});

// API endpoint to get list of patients (with OAuth)
router.get('/api/patients', async (req, res) => {
  const { accessToken } = req.session;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const response = await axios.get(`${epicConfig.fhirBaseUrl}/Patient`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      },
      params: {
        _count: 20 // Limit to 20 patients
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Patient list fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// API endpoint to get patient data
router.get('/api/patient', async (req, res) => {
  const { accessToken, patientId } = req.session;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!patientId) {
    return res.status(400).json({ error: 'No patient selected', needsPatientSelection: true });
  }

  try {
    const patientResponse = await axios.get(
      `${epicConfig.fhirBaseUrl}/Patient/${patientId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        }
      }
    );

    res.json(patientResponse.data);
  } catch (error) {
    console.error('FHIR request error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch patient data' });
  }
});

// API endpoint to get ANY patient data (with OAuth token)
router.get('/api/patient/:patientId', async (req, res) => {
  const { accessToken } = req.session;
  const { patientId } = req.params;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const patientResponse = await axios.get(
      `${epicConfig.fhirBaseUrl}/Patient/${patientId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        }
      }
    );

    res.json(patientResponse.data);
  } catch (error) {
    console.error('FHIR request error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch patient data' });
  }
});

// API endpoint to search for resources (session patient)
router.get('/api/fhir/:resourceType', async (req, res) => {
  const { accessToken, patientId } = req.session;
  const { resourceType } = req.params;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const searchUrl = `${epicConfig.fhirBaseUrl}/${resourceType}?patient=${patientId}`;
    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('FHIR search error:', error.response?.data || error.message);
    res.status(500).json({ error: `Failed to fetch ${resourceType}` });
  }
});

// API endpoint to search for resources for ANY patient (with OAuth token)
router.get('/api/patient/:patientId/fhir/:resourceType', async (req, res) => {
  const { accessToken } = req.session;
  const { patientId, resourceType } = req.params;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const searchUrl = `${epicConfig.fhirBaseUrl}/${resourceType}?patient=${patientId}`;
    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('FHIR search error:', error.response?.data || error.message);
    res.status(500).json({ error: `Failed to fetch ${resourceType}` });
  }
});

// ============ TEST MODE ENDPOINTS (No Auth Required) ============

// Get list of test patients
router.get('/test/patients', async (req, res) => {
  try {
    const response = await axios.get(`${epicConfig.fhirBaseUrl}/Patient`, {
      headers: {
        Accept: 'application/fhir+json'
      },
      params: {
        _count: 20 // Limit to 20 patients
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Test mode patient fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch test patients' });
  }
});

// Get specific test patient
router.get('/test/patient/:patientId', async (req, res) => {
  const { patientId } = req.params;

  try {
    const response = await axios.get(`${epicConfig.fhirBaseUrl}/Patient/${patientId}`, {
      headers: {
        Accept: 'application/fhir+json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Test mode patient fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Get FHIR resources for test patient
router.get('/test/patient/:patientId/:resourceType', async (req, res) => {
  const { patientId, resourceType } = req.params;

  try {
    const searchUrl = `${epicConfig.fhirBaseUrl}/${resourceType}?patient=${patientId}`;
    const response = await axios.get(searchUrl, {
      headers: {
        Accept: 'application/fhir+json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Test mode FHIR search error:', error.response?.data || error.message);
    res.status(500).json({ error: `Failed to fetch ${resourceType}` });
  }
});

module.exports = router;