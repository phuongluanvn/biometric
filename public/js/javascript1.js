// The Auth0 client, initialized in configureClient()
let auth0Client = null;

let TOKEN_ID_KEY = "@@auth0spajs@@::NhaFhctl0tKvd7m9Daz6nJau09FQyKfm::@@user@@"
let TOKEN_INFO_KEY = "@@auth0spajs@@::NhaFhctl0tKvd7m9Daz6nJau09FQyKfm::http://localhost:3000/::openid profile email offline_access"

let BK_TOKEN_ID = "BK_TOKEN_ID"
let BK_TOKEN_INFO = "BK_TOKEN_INFO"
let isRefreshTokens = false;

/**
 * Flutter/Mobile function
 */
function mobileFun_backupAuth0Cache() {
  backupAuth0Cache.postMessage("Backup Auth0 Cache");
  
}

/**
 * Flutter/Mobile function
 */
function mobileFun_restoreAuth0Cache() {
  restoreAuth0Cache.postMessage("Restore Auth0 Cache");
}

/**
 * Flutter/Mobile function
 */
async function mobileFun_handleBiometricLink() {
 await handleBiometricLink.postMessage("Handle Biometric Link");
}

function mobileFun_isUseRefreshTokens() {
  isUseRefreshTokens.postMessage("Update isRefreshToken");
}

function tokenFromLocalStorage() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_INFO_KEY)).body.access_token;
  } catch (error) {
    console.log(error);
  }
  return "";
}

/**
 * Starts the authentication flow
 */
function hello() {
  const header = document.querySelector('h2');
  const header1 = document.getElementsByClassName('');
  console.log("Hello from webview");
  header.innerText = 'Hello';
  testReceiveFromWeb.postMessage('1,2,3');
}

function checkLogin() {
  console.log("Check login success from web");
  testPushFromFlutter.postMessage('Login success');
}

function updateIsMobileApp(isMobile) {
  console.log("updateIsMobileApp = ", isMobile);
  localStorage.setItem('isMobileApp', isMobile); 
}

function getMobileData() {
  // const header = document.querySelector('h2');
  // header.innerText = 'Hello';
  let isMobileApp = localStorage.getItem('isMobileApp'); 
  console.log("getMobileData = ", isMobileApp);
}

const login = async (targetUrl) => {
  try {
    console.log("Logging in", targetUrl);

    const options = {
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    };

    if (targetUrl) {
      options.appState = { targetUrl };
    }

    await auth0Client.loginWithRedirect(options);
  } catch (err) {
    console.log("Log in failed", err);
  }
};

/**
 * Executes the logout flow
 */
const logout = async () => {
  try {
    // backup info
    mobileFun_backupAuth0Cache();

    
    console.log("Logging out");
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });

    console.log("Logged out");
  } catch (err) {
    console.log("Log out failed", err);
  }
};

/**
 * Retrieves the auth configuration from the server
 */
const fetchAuthConfig = () => fetch("/auth_config.json");

// can copy this file to public/js/ for SPA only
// const fetchAuthConfig = () => fetch("/js/auth_config.json");

/**
 * Initializes the Auth0 client
 */
const configureClient = async () => {
  const response = await fetchAuthConfig();
  const config = await response.json();
  isUseRefreshTokens();

  auth0Client = await auth0.createAuth0Client({
    domain: config.domain,
    clientId: config.clientId,
    authorizationParams: {
      audience: config.audience
    },
    cacheLocation: "localstorage",
    useRefreshTokens: isRefreshTokens,
  });
};

// /**
//  * Initializes the Auth0 client
//  */
// const configureClient = async () => {


//   auth0Client = await auth0.createAuth0Client({
//     domain: "zonar-dev.auth0.com",
//     clientId: "NhaFhctl0tKvd7m9Daz6nJau09FQyKfm",
//     authorizationParams: {
//       audience: "http://localhost:3000/"
//     },
//     cacheLocation: "localstorage",
//     useRefreshTokens: true,
//   });
// };

/**
 * Checks to see if the user is authenticated. If so, `fn` is executed. Otherwise, the user
 * is prompted to log in
 * @param {*} fn The function to execute if the user is logged in
 */
const requireAuth = async (fn, targetUrl) => {
  const isAuthenticated = await auth0Client.isAuthenticated();

  if (isAuthenticated) {
    return fn();
  }

  return login(targetUrl);
};

/**
 * Calls the API endpoint with an authorization token
 */
const callApi = async () => {
  try {
    // const token = await auth0Client.getTokenSilently();
    
    // use local token
    const token = tokenFromLocalStorage();
    console.log("> Call API with this token: " + token);

    const response = await fetch("/api/external", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const responseData = await response.json();
    const responseElement = document.getElementById("api-call-result");

    responseElement.innerText = JSON.stringify(responseData, {}, 2);

    document.querySelectorAll("pre code").forEach(hljs.highlightBlock);

    eachElement(".result-block", (c) => c.classList.add("show"));
    console.log("> Call API OK");
  } catch (e) {
    console.error(e);
  }
};

// Will run when page finishes loading
window.onload = async () => {
  await configureClient();

  const query = window.location.search;
  const shouldParseResult = query.includes("code=") && query.includes("state=");

  mobileFun_handleBiometricLink();

  // If unable to parse the history hash, default to the root URL
  if (!showContentFromUrl(window.location.pathname)) {
    showContentFromUrl("/");
    window.history.replaceState({ url: "/" }, {}, "/");
  }

  const bodyElement = document.getElementsByTagName("body")[0];

  // Listen out for clicks on any hyperlink that navigates to a #/ URL
  bodyElement.addEventListener("click", (e) => {
    if (isRouteLink(e.target)) {
      const url = e.target.getAttribute("href");

      if (showContentFromUrl(url)) {
        e.preventDefault();
        window.history.pushState({ url }, {}, url);
      }
    } else if (e.target.getAttribute("id") === "call-api") {
      e.preventDefault();
      callApi();
    }
  });

  const isAuthenticated = await auth0Client.isAuthenticated();

  if (isAuthenticated) {
    console.log("> User is authenticated");
    window.history.replaceState({}, document.title, window.location.pathname);
    updateUI();
    return;
  }

  console.log("> User not authenticated");
  if (shouldParseResult) {
    console.log("> Parsing redirect");
    try {
      const result = await auth0Client.handleRedirectCallback();

      if (result.appState && result.appState.targetUrl) {
        showContentFromUrl(result.appState.targetUrl);
      }

      console.log("Logged in!");
    } catch (err) {
      console.log("Error parsing redirect:", err);
    }

    window.history.replaceState({}, document.title, "/");
  }

  updateUI();
};
