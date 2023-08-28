/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */
/* exported handleEmailPreviewClick */

// TODO: Set client ID and API key from the Developer Console
const CLIENT_ID = '596552007023-58skkq39l41afk5brpui36bdpruee23r.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBFd7Han8kkn_wx20sn2nf_x82J2E8KNWw';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorize_button').style.visibility = 'hidden';
document.getElementById('signout_button').style.visibility = 'hidden';

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.visibility = 'visible';
    }
}

/**
 * Sign in the user upon button click.
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw resp;
        }
        document.getElementById('signout_button').style.visibility = 'visible';
        document.getElementById('authorize_button').innerText = 'Refresh';
        document.getElementById('navBar').classList.remove('hidden');
        await loadEmails(); // Load emails after successful authentication
        document.getElementById('navBar').classList.remove('hidden');
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

/**
 * Sign out the user upon button click.
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('email_previews').innerText = '';
        document.getElementById('authorize_button').innerText = 'Sign in with Google';
        document.getElementById('signout_button').style.visibility = 'hidden';
        document.getElementById('navBar').classList.add('hidden');
    }
}

// Load list gmails after sign in
async function loadEmails() {
    const response = await gapi.client.gmail.users.messages.list({
        userId: 'me',
    });

    const emails = response.result.messages;

    if (emails && emails.length > 0) {
        for (const email of emails) {
            var divContain = document.createElement('div');
            var emailPreview = document.createElement('div');
            emailPreview.className = 'email';
            emailPreview.id = email.id;
            emailPreview.style.border = "1px solid black";
            emailPreview.style.margin = "10px";
            emailPreview.addEventListener("click", function () {
                getEmailContent(email.id);
            });
            printEmailSnippet(email.id);
            divContain.appendChild(emailPreview);
            document.getElementById('email_previews').appendChild(divContain);
        }
    } else {
        document.getElementById('email_previews').textContent = 'No emails found.';
    }
}

//Get Content of gmail
function getEmailContent(emailId) {
    gapi.client.gmail.users.messages
        .get({
            userId: 'me',
            id: emailId,
            format: 'full'
        })
        .then(function (response) {
            var email = response.result;
            var parts = email.payload.parts;

            var htmlContent = '';

            if (parts && parts.length > 0) {
                htmlContent = extractHtmlContentFromParts(parts);
            } else {
                htmlContent = extractHtmlContentFromBody(email.payload);
            }
            document.getElementById(emailId).innerHTML = htmlContent;
            if (document.getElementById(emailId + 'button') == null) {
                var backButton = document.createElement('button');
                backButton.innerText = 'Back';
                backButton.id = emailId + 'button';
                backButton.style.marginBottom = '10px';
                backButton.style.backgroundColor = '#f44336';
                backButton.style.color = '#fff';
                backButton.style.border = 'none';
                backButton.style.padding = '10px 20px';
                backButton.style.borderRadius = '5px';
                backButton.style.cursor = 'pointer';
                var parentElement = document.getElementById(emailId).parentNode;

                backButton.onclick = function () {
                    printEmailSnippet(emailId);
                    var buttonId = emailId + 'button';
                    var buttonElement = document.getElementById(buttonId);
                    if (buttonElement) {
                        var parentElement = buttonElement.parentNode;
                        parentElement.removeChild(buttonElement);
                    }
                };

                // Add back button after entering content gmail
                parentElement.insertBefore(backButton, document.getElementById(emailId));
            }
        })
        .catch(function (error) {
            console.error('Error retrieving email:', error);
        });
}

function extractHtmlContentFromParts(parts) {
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part.body && part.body.data && part.mimeType === 'text/html') {
            var data = part.body.data;
            return decodeBase64(data);
        }
    }
    return '';
}

function extractHtmlContentFromBody(payload) {
    if (payload.body && payload.body.data && payload.mimeType === 'text/html') {
        var data = payload.body.data;
        return decodeBase64(data);
    }
    return '';
}

function decodeBase64(data) {
    var decodedData = window.atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    var dataArray = new Uint8Array(decodedData.length);
    for (var i = 0; i < decodedData.length; i++) {
        dataArray[i] = decodedData.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(dataArray);
}

//Print overview of each email
function printEmailSnippet(emailId) {
    gapi.client.gmail.users.messages
        .get({
            userId: 'me',
            id: emailId,
            format: 'full'
        })
        .then(function (response) {
            var email = response.result;
            var headers = email.payload.headers;
            var content = '';

            for (var i = 0; i < headers.length; i++) {
                if (headers[i].name === 'Subject') {
                    content += 'Subject: ' + headers[i].value + '<br>';
                } else if (headers[i].name === 'From') {
                    content += 'From: ' + headers[i].value + '<br>';
                }
            }

            content += '<br>' + email.snippet; // Add email snippet

            document.getElementById(emailId).innerHTML = content;
        })
        .catch(function (error) {
            console.error('Error retrieving email:', error);
        });
}
/**
 * Load and display the content of the selected email.
 */
async function handleEmailPreviewClick(emailId) {
    const response = await gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: emailId,
    });

    const emailContent = response.result.snippet;
    document.getElementById('content').textContent = emailContent;
}



// Handle UI Send Email form
function goToSendMessage() {
    var formDiv = document.querySelector('.send-email')
    formDiv.style.display = 'flex'
}

//Handle UI Close form
var closeFormBtn = document.querySelector("#closeForm")
closeFormBtn.onclick = () => {
    var formDiv = document.querySelector('.send-email')
    formDiv.style.display = 'none'
}

//Create Request Email Raw
function createEmailRaw(email) {
    const boundary = 'boundary';

    const headers = [
        'Content-Type: multipart/mixed; boundary="' + boundary + '"',
        'MIME-Version: 1.0',
        'To: ' + email.to,
        'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent(email.subject))) + '?=',
        'From: me',
    ];

    const messageParts = [
        '--' + boundary,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        '',
        unescape(encodeURIComponent(email.message)),
    ];

    if (email.attachment) {
        const attachmentParts = [
            '--' + boundary,
            'Content-Type: ' + email.attachment.type,
            'MIME-Version: 1.0',
            'Content-Disposition: attachment; filename="' + email.attachment.name + '"',
            'Content-Transfer-Encoding: base64',
            '',
            email.attachment.data,
        ];

        messageParts.push(...attachmentParts);
    }

    const rawEmail = headers.concat('', ...messageParts, '', '--' + boundary + '--').join('\r\n');

    return btoa(rawEmail).replace(/\+/g, '-').replace(/\//g, '_');
}


// Handle when sending email with attachment
function sendEmailAttachment(recipientEmail, subject, message, attachment) {
    const email = {
        to: recipientEmail,
        subject: subject,
        message: message,
        attachment: attachment,
    };

    const reader = new FileReader();

    reader.onload = function (event) {
        const fileData = event.target.result.split(',')[1]; // Get base64-encoded file data

        email.attachment = {
            name: attachment.name,
            type: attachment.type,
            data: fileData,
        };

        const request = gapi.client.gmail.users.messages.send({
            userId: 'me',
            resource: {
                raw: createEmailRaw(email),
            },
        });

        request.execute(function (response) {
            if (response.error) {
                alert('Failed to send gmail: ' + response.error.message);
            } else {
                alert('Send gmail successfully!!!');
            }
        });
    };

    reader.readAsDataURL(attachment);
}

// Handle when sending email with no attachment
function sendEmailNoAttachment(recipientEmail, subject, message) {
    const email = {
        to: recipientEmail,
        subject: subject,
        message: message,
    };

    const request = gapi.client.gmail.users.messages.send({
        userId: 'me',
        resource: {
            raw: createEmailRaw(email),
        },
    });

    request.execute(function (response) {
        if (response.error) {
            alert('Failed to send gmail: ' + response.error.message);
        } else {
            alert('Send gmail successfully!!!');
        }
    });
}

function submitMessageForm(event) {
    event.preventDefault();
    // Get value of form
    const recipientEmail = document.getElementById('recipient_email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;
    const attachment = document.getElementById('attachment').files[0];

    if (attachment) {
        sendEmailAttachment(recipientEmail, subject, message, attachment);
    } else {
        sendEmailNoAttachment(recipientEmail, subject, message);
    }
}
