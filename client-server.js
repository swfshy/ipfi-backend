// Update the URL accordingly
const backendEndpoint = 'https://cd70-114-4-100-19.ngrok-free.app/conversions';

// Function to extract domain from the host
function getDomainFromHost(host) {
  const parts = host.split('.');
  if (parts.length > 2) {
    parts.shift(); // remove the subdomain part
  }
  return parts.join('.');
}

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
  const domain = getDomainFromHost(host);

  // Initialize xAccessTime with current date and time in Asia/Jakarta timezone
  const jakartaOptions = { timeZone: 'Asia/Jakarta', hour12: false };
  const xAccessTime = new Date().toLocaleString('en-US', jakartaOptions).replace(',', '');

  const userAgent = navigator.userAgent;
  const webGLParams = getWebGLParams();
  const utmParams = getUTMParams();
  
  return {
    host: host,
    domain: domain,
    access_time: xAccessTime,
    user_agent: userAgent,
    webGLParams: webGLParams,
    utmParams: utmParams
  };
}

// Make the POST request when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  const requestData = await captureData();
  console.log('host', requestData.host);
  console.log('domain', requestData.domain);
  console.log('utm', requestData.utmParams);
  postData(backendEndpoint, requestData)
    .then(response => {
      // Handle the response if needed
      // console.log('Response:', response);
    });
});

// Function to make a POST request
function postData(url, data) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Host': data.host,
      'X-Client-Domain': data.domain,
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
  })
  .then(response => response.json())
  .catch(error => console.error('Error:', error));
}
