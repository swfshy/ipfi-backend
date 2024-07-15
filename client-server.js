console.log('Testing for console log');

// Update the URL accordingly
const backendEndpoint = 'https://343e-120-188-33-255.ngrok-free.app/conversions';
const appendEndpoint = 'https://343e-120-188-33-255.ngrok-free.app/append-conversions';
const cookieEndpoint = 'https://343e-120-188-33-255.ngrok-free.app/set-cookie';

let documentId;
let documentIdPromiseResolve;
const documentIdPromise = new Promise(resolve => {
  documentIdPromiseResolve = resolve;
});

// Function to get WebGL parameters
function getWebGLParams() {
  let canvas = document.createElement('canvas');
  let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) {
    console.log('WebGL not supported');
    return null;
  }

  let params = {
    renderer: gl.getParameter(gl.RENDERER),
    vendor: gl.getParameter(gl.VENDOR),
    version: gl.getParameter(gl.VERSION),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    extensions: gl.getSupportedExtensions(),
  };

  // Attempt to get more detailed GPU information
  let debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    params.unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    params.unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
  }

  // Add screen resolution information
  params.screenResolution = {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    colorDepth: window.screen.colorDepth,
    pixelDepth: window.screen.pixelDepth
  };

  return params;
}

// Function to extract UTM parameters from URL
function getUTMParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const utmParams = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
    if (urlParams.has(param)) {
      utmParams[param] = urlParams.get(param);
    }
  });
  return utmParams;
}

// Capture the necessary data
async function captureData() {
  const host = window.location.host;
  const fullURL = window.location.href;
  const xAccessTime = new Date().toString();
  const userAgent = navigator.userAgent;
  const utmParams = getUTMParams();
  
  return {
    host: host,
    full_url: fullURL,
    access_time: xAccessTime,
    user_agent: userAgent,
    utmParams: utmParams
  };
}

// Make the POST request when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  const requestData = await captureData();
  console.log('Req data:', requestData)
  const initialResponse = await postData(backendEndpoint, requestData);
  console.log('Initial Response:', initialResponse);
  // Extract documentId from initialResponse
  const documentId = initialResponse.documentId;
  console.log('doc:', documentId);
  setDocumentId(documentId);
});

function setDocumentId(id) {
  documentId = id;
  console.log('doc in setfunction:', documentId);
  documentIdPromiseResolve(); // Resolve the promise when documentId is set
}

async function checkCookieConsentAndObserve(consentVarName, userUUID) {
  const checkCookieConsentAndRun = async () => {
    // Wait for documentId to be set
    await documentIdPromise;

    const cookieAccepted = localStorage.getItem(consentVarName);
    console.log('cookieAccepted:', cookieAccepted);
    if (cookieAccepted) {
      console.log('Kue === Acc');

      const userUUIDvalue = localStorage.getItem(userUUID);
      const webGLParams = getWebGLParams();

      console.log(webGLParams);

      console.log('userUUIDvalue:', userUUIDvalue);

      // Set third-party cookie if consent is accepted
      (function() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', cookieEndpoint, true);
        xhr.withCredentials = true; // Important to include cookies in cross-origin requests
        xhr.send();
      })();

      if (userUUIDvalue) {
        console.log('Saved UUID:', userUUIDvalue);

        const uuidData = { documentId: documentId, user_uuid: userUUIDvalue };
        console.log('uuidData:', uuidData);

        if (webGLParams && webGLParams.screenResolution) {
          console.log('Screen Resolution:', webGLParams.screenResolution);
        } else {
          console.error('clientInfo or screenResolution is undefined');
        }

        fetch(appendEndpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',      
              'X-WebGL-Renderer': webGLParams ? (webGLParams.unmaskedRenderer || webGLParams.renderer) : '',
              'X-WebGL-Vendor': webGLParams ? (webGLParams.unmaskedVendor || webGLParams.vendor) : '',
              'X-Screen-Width': webGLParams.screenResolution.width,
              'X-Screen-Height': webGLParams.screenResolution.height,
              'X-Avail-Screen-Width': webGLParams.screenResolution.availWidth,
              'X-Avail-Screen-Height': webGLParams.screenResolution.availHeight,
              'X-Color-Depth': webGLParams.screenResolution.colorDepth,
              'X-Pixel-Depth': webGLParams.screenResolution.pixelDepth
          },
          body: JSON.stringify(uuidData)
        })
        .then(response => response.text())
        .then(data => {
          console.log('Response from server:', data);
          // Handle response as needed
          })
      .catch(error => console.error('Error:', error));

      } else {
        console.log('Saved UUID not found');
      }
    } else {
      console.log('Kue === Dec');
    }
  };

  // Initial check on page load
  await checkCookieConsentAndRun();

  // Observe changes to the consentVarName item in localStorage within the same document
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key === consentVarName) {
      console.log('cookieConsent changed within the same document, checking condition');
      checkCookieConsentAndRun();
    }
  };
}

// Function to make a POST request
async function postData(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Host': data.host,
        'X-Access-Time': data.access_time,
        'User-Agent': data.user_agent
      },
      body: JSON.stringify(data)
    });
    console.log(response.body);

    // Log the response to debug
    console.log('Raw Response:', response);

    // Check if the response status is OK
    if (response.ok) {
      // Attempt to parse the response as JSON
      try {
        const jsonResponse = await response.json();
        return jsonResponse;
      } catch (jsonError) {
        console.error('Failed to parse JSON:', jsonError);
        throw new Error('Response is not valid JSON');
      }
    } else {
      // Handle non-OK response
      console.error('Server Error:', response.statusText);
      throw new Error('Server responded with an error');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}