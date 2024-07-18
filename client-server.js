console.log('Testing for console log');

// Endpoint URL
const backendEndpoint = 'https://936b-114-10-25-143.ngrok-free.app/conversions';
const appendEndpoint = 'https://936b-114-10-25-143.ngrok-free.app/append-conversions';
const cookieEndpoint = 'https://936b-114-10-25-143.ngrok-free.app/cookie';

// DocumentId resolve (MongoDB)
// Akan diubah disesuaikan dengan database nantinya
let documentId;
let documentIdPromiseResolve;
const documentIdPromise = new Promise((resolve) => {
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

const HttpConnector = {
  // Function to get default header from browser
  async getDefaultHeader() {
    try {
      const host = window.location.host;
      const fullURL = window.location.href;
      const xAccessTime = new Date().toString();
      const userAgent = navigator.userAgent;
      const utmParams = getUTMParams();
  
      // tambahkan promise resolve jika ingin benar benar di await
      return {
        host: host,
        full_url: fullURL,
        access_time: xAccessTime,
        user_agent: userAgent,
        utmParams: utmParams
      };
    } catch (error) {
      console.error('Error in getDefaultHeader:', error);
    }
  },

  async postDefaultHeader(url, data) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
  
      // Log the response to debug
      console.log('Raw response postDefaultHeader:', response);
      console.log('Data yg dikirim:', data);
  
      // Check if the response status is OK
      if (response.ok) {
        // Attempt to parse the response as JSON
        try {
          return await response.json();
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
      console.error('Error postDefaultHeader:', error);
    }
  },

  async postAdditionalData(url, data){
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
    } catch (error) {
      console.error('Error in postAdditionalData:', error);
      throw error;
    }
  },

  async get3rdCookies(url){
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Error in get3rdCookies:', error);
      throw error;
    }
  }

};

const processDefaultHeader = async () => {
  // get default header
  const defaultHeaderData = HttpConnector.getDefaultHeader();
  console.log('Request data:', defaultHeaderData)

  // post default header to database
  const postDefaultHeaderResponse = await HttpConnector.postDefaultHeader(backendEndpoint, defaultHeaderData);
 
  documentId = postDefaultHeaderResponse.documentId;;
  console.log('DocumentID after postDefaultHeader:', documentId);
  documentIdPromiseResolve(); // Resolve the promise when documentId is set
}

// Make the POST request when the page loads
document.addEventListener('DOMContentLoaded', () => {
  processDefaultHeader();
});

const checkCookieConsentAndRun = async () => {
  // Wait for documentId to be set
  await documentIdPromise;

  //check if consent is accepted
  const cookieAccepted = localStorage.getItem(consentVarName);
  console.log('cookieAccepted:', cookieAccepted);
  if (cookieAccepted) {
    console.log('Kue === Acc');

    const firstPartyCookies = localStorage.getItem(userUUID);
    const webGLParams = getWebGLParams();

    console.log('1st Party Cookies:', firstPartyCookies);

    // Set third-party cookie if consent is accepted
    // bisa dikelompokan untuk kategori http connector
    HttpConnector.get3rdCookies(cookieEndpoint);

    if (firstPartyCookies) {
      const additionalData = { 
        documentId: documentId, 
        firstPartyCookies: firstPartyCookies,
        webgl_renderer: webGLParams ? (webGLParams.unmaskedRenderer || webGLParams.renderer) : '',
        webgl_vendor: webGLParams ? (webGLParams.unmaskedVendor || webGLParams.vendor) : '',
        screen_width: webGLParams.screenResolution.width,
        screen_height: webGLParams.screenResolution.height,
        avail_width: webGLParams.screenResolution.availWidth,
        avail_height: webGLParams.screenResolution.availHeight,
        color_depth: webGLParams.screenResolution.colorDepth,
        pixel_depth: webGLParams.screenResolution.pixelDepth
      };
      console.log('additionalData:', additionalData);

      // fetch additional data to append endpoint
      fetch(appendEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',      
            'X-WebGL-Renderer': (webGLParams?.unmaskedRenderer || webGLParams?.renderer || ''),
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
      console.log('First Party Cookies not found');
    }
  } else {
    console.log('Kue === Dec');
  }
};

// function to check cookie consent variable and get cookie var
async function checkCookieConsentAndObserve(consentVarName, firstPartyCookies) {
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