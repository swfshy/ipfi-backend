console.log('Testing for console log');

// Update the URL accordingly
const backendEndpoint = 'https://d1e8-114-10-119-153.ngrok-free.app/conversions';
const appendEndpoint = 'https://d1e8-114-10-119-153.ngrok-free.app/append-conversions';

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
  const webGLParams = getWebGLParams();
  const utmParams = getUTMParams();
  
  return {
    host: host,
    full_url: fullURL,
    access_time: xAccessTime,
    user_agent: userAgent,
    webGLParams: webGLParams,
    utmParams: utmParams
  };
}

// Make the POST request when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  const requestData = await captureData();
  console.log('Req data:', requestData)
  postData(backendEndpoint, requestData)
    .then(response => {
      console.log('Response:', response);
    });
});

async function checkCookieConsentAndObserve(consentVarName, userUUID) {
  const checkCookieConsentAndRun = async () => {
    const cookieAccepted = localStorage.getItem(consentVarName);
    if (cookieAccepted) {
      console.log('Kue === Acc');
      const userUUIDvalue = localStorage.getItem(userUUID);
      if (userUUIDvalue) {
        console.log('Saved UUID:', userUUIDvalue);

        const uuidData = { user_uuid: userUUIDvalue };
        
        const postUUIDData = async (retryCount = 3) => {
          try {
            const response = await fetch(appendEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(uuidData)
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Network response was not ok: ${response.statusText}. Error details: ${errorText}`);
            }

            console.log('Saved UUID data posted successfully');
          } catch (error) {
            console.error('Error posting saved UUID data:', error);

            if (retryCount > 0) {
              console.log(`Retrying... (${3 - retryCount + 1})`);
              await postUUIDData(retryCount - 1);
            } else {
              console.error('Failed to post saved UUID data after multiple attempts');
            }
          }
        };

        await postUUIDData();
      } else {
        console.log('Saved UUID not found');
      }
    } else {
      console.log('Kue === Dec');
    }
  };

  // Initial check on page load
  checkCookieConsentAndRun();

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
        'User-Agent': data.user_agent,
        'X-WebGL-Renderer': data.webGLParams ? (data.webGLParams.unmaskedRenderer || data.webGLParams.renderer) : '',
        'X-WebGL-Vendor': data.webGLParams ? (data.webGLParams.unmaskedVendor || data.webGLParams.vendor) : '',
        'X-Screen-Width': data.webGLParams.screenResolution.width,
        'X-Screen-Height': data.webGLParams.screenResolution.height,
        'X-Avail-Screen-Width': data.webGLParams.screenResolution.availWidth,
        'X-Avail-Screen-Height': data.webGLParams.screenResolution.availHeight,
        'X-Color-Depth': data.webGLParams.screenResolution.colorDepth,
        'X-Pixel-Depth': data.webGLParams.screenResolution.pixelDepth
      },
      body: JSON.stringify(data)
    });

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