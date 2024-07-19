console.log('Testing for console log');

// Endpoint URL
const backendEndpoint = 'https://b905-114-10-75-48.ngrok-free.app/conversions';
const appendEndpoint = 'https://b905-114-10-75-48.ngrok-free.app/append-conversions';
const cookieEndpoint = 'https://b905-114-10-75-48.ngrok-free.app/cookie';

// DocumentId resolve (MongoDB)
// Akan diubah disesuaikan dengan database nantinya
let inputId;
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

      console.log('Raw postAdditionalData response:', response);

      // Check if the response status is OK
      if (response.ok) {
        // Attempt to parse the response as JSON
        try {
          const responseData = await response;
          return responseData
        } catch (error) {
          console.error('Failed get response:', error);
        }
        console.log('postAdditionalData response:',responseData);
      } else {
        // Handle non-OK response
        console.error('Server Error:', response.statusText);
        throw new Error('Server responded with an error');
      }
      
    } catch (error) {
      console.error('Error in postAdditionalData:', error);
      throw error;
    }
  },

  async get3rdCookies(url){
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      })
      console.log('Raw response get3rdCookies:', response);

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
      console.error('Error in get3rdCookies:', error);
      throw error;
    }
  }

};

const processDefaultHeader = async () => {
  // get default header
  const defaultHeaderData = await HttpConnector.getDefaultHeader();
  console.log('Request data:', defaultHeaderData)

  // post default header to database
  const postDefaultHeaderResponse = await HttpConnector.postDefaultHeader(backendEndpoint, defaultHeaderData);
  console.log('postDefaultHeader response:', postDefaultHeaderResponse);
 
  inputId = postDefaultHeaderResponse.documentId;
  console.log('DocumentID after postDefaultHeader:', inputId);
  documentIdPromiseResolve(); // Resolve the promise when documentId is set
}

// Make the POST request when the page loads
document.addEventListener('DOMContentLoaded', () => {
  processDefaultHeader();
});

const checkCookieConsentAndRun = async (consentVarName, cookieVarName) => {
  // Wait for documentId to be set
  await documentIdPromise;

  //check if consent is accepted
  const cookieAccepted = localStorage.getItem(consentVarName);
  console.log('cookieAccepted:', cookieAccepted);

  if (cookieAccepted) {
    console.log('Kue === Acc');

    const firstPartyCookies = localStorage.getItem(cookieVarName);
    const webGLParams = getWebGLParams();

    console.log('1st Party Cookies:', firstPartyCookies);

    if (firstPartyCookies) {
      const additionalData = { 
        documentId: inputId, 
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

      try {
        const postAdditionalDataResponse = await HttpConnector.postAdditionalData(appendEndpoint, additionalData);
        console.log('postAdditionalDataResponse:', postAdditionalDataResponse);
      } catch (error) {
        console.error('Error posting additional data:', error);
      }

      // try {
      //   // Set third-party cookie if consent is accepted
      //   const get3rdCookiesResponse = await HttpConnector.get3rdCookies(cookieEndpoint);
      //   console.log('get3rdCookies response:', get3rdCookiesResponse)
      // } catch (error) {
      //   console.error('error in get3rdCookiesResponse', error);
      // }

    } else {
      console.log('First Party Cookies not found');
    }
  } else {
    console.log('Kue === Dec');
  }
};

// function to check cookie consent variable and get cookie var
async function checkCookieConsentAndObserve(consentVarName, cookieVarName) {
  // Initial check on page load
  await checkCookieConsentAndRun(consentVarName, cookieVarName);

  // Observe changes to the consentVarName item in localStorage within the same document
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key === consentVarName) {
      console.log('cookieConsent changed within the same document, checking condition');
      checkCookieConsentAndRun(consentVarName, cookieVarName);
    }
  };
}