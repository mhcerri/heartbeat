/*
 * Check client and notify if they are dead!
 */
function checkHeartbeatJob() {
  var now = new Date();
  var clients = Data.getAllClients();

  for (i = 0; i < clients.length; i++) {
    var client = clients[i];
    var lastBeat = new Date(client.lastBeat);

    if (isNaN(lastBeat)) {
      clientIsDead(client, "Never ran");
      continue;
    }

    var diff = now.getTime() - lastBeat.getTime();
    if (diff > (HEARTBEAT_MAX_SECS * 1000)) {
      var secs = Math.floor(diff / 1000)
      clientIsDead(client, `Last heartbeat was ${secs} seconds ago`);
      continue;
    }

    clientIsAlive(client);
  }
}

/*
 * Main entry point for the web app.
 */
function doGet(e) {
  try {
    Logger.log("Heartbeat: start: " + JSON.stringify(e));

    // Get client
    var client = Data.getClientByToken(e.parameter["token"]);
    if (!client) {
      invalidRequest();
    }

    // Update client
    client.lastBeat = new Date().toUTCString();
    Data.updateClient(client);
  } catch (err) {
    Logger.log("Heartbeat: error: " + JSON.stringify(e) + ": " + err);
    return ContentService.createTextOutput("error: " + err + "\n");
  }

  Logger.log("Heartbeat: done: " + JSON.stringify(e));
  return ContentService.createTextOutput("ok\n");
}

/*
 * It's ALIVE!
 */
function clientIsAlive(client) {
  // Notify the ressurection!
  if (client.errors > 0) {
    subject = `${client.name} is alive!`;
    msg = `Client ${client.name} is alive after ${client.errors} errors.`;
    sendEmail(subject, msg);
  }

  // Update status
  if (client.errors > 0) {
    client.errors = 0;
    Data.updateClient(client);
  }

  // Just log it
  Logger.log(`Client ${client.name} is alive!`);
}

/*
 * Notify of problems!
 */
function clientIsDead(client, reason) {
  // Update status
  client.errors += 1;
  Data.updateClient(client);

  // Log it
  var msg = `Client ${client.name} is dead! Reason: ${reason}`;
  Logger.log(msg);

  // Do not spam with rotten clients
  if (client.errors > 1) {
    Logger.log(`${client.name} was already dead. Skipping email`);
    return
  }

  // Send alert via email
  subject = `${client.name} has died!`;
  sendEmail(subject, msg);
}

/*
 * Send email.
 */
function sendEmail(subject, body) {
  to = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(to, subject, body);
}

/*
 * Stop the request with an generic error.
 */
function invalidRequest() {
  throw "Invalid request!";
}