var Data = {
  /*
   * Number of rows in the header.
   */
  _headerRows: 1,

  /*
   * Current sheet.
   */
  _sheet: null,

  /*
   * Time to wait for the lock in ms.
   */
  _lockTime: 3000,

  /*
   * Lock hjelper.
   */
  _withLock: function (fn) {
    var ret = null;
    var lock = LockService.getScriptLock();
    lock.waitLock(this._lockTime);
    try {
      ret = fn();
    } finally {
      SpreadsheetApp.flush();
      lock.releaseLock();
    }
    return ret
  },

  /*
   * Return the client sheet.
   */
  _getClientSheet: function () {
    if (!this._sheet) {
      var ss = SpreadsheetApp.openByUrl(SS_URL);
      this._sheet = ss.getSheetByName("clients");
    }
    return this._sheet;
  },

  /*
   * Convert row to client object.
   */
  _clientToObj: function (row) {
    return {
      name: row[0],
      token: row[1],
      lastBeat: row[2],
      errors: row[3],
    };
  },

  /*
   * Convert client object to row.
   */
  _clientToRow: function (client) {
    return [
      client.name,
      client.token,
      client.lastBeat,
      client.errors,
    ];
  },

  /*
   * Return an arrays of client objects.
   */
  getAllClients: function () {
    return this._withLock(() => {
      return this._getAllClients();
    });
  },

  /*
   * Internal implementation of getAllClients().
   */
  _getAllClients: function () {
    var results = [];
    var sheet = this._getClientSheet();

    // Skip header
    var cols = this._clientToRow({}).length;
    var rawData = sheet.getSheetValues(1 + this._headerRows, 1, -1, cols);

    for (var i = 0; i < rawData.length; i++) {
      var client = this._clientToObj(rawData[i]);
      results.push(client);
    }

    return results;
  },

  /*
   * Add a new row to the end of the client spreadsheet,.
   */
  appendClient: function (client) {
    this._withLock(() => {
      return this._appendClient(client);
    });
  },

  /*
    * Internal implementation of appendClient().
    */
  _appendClient: function (client) {
    if (!client.name || !client.token) {
      // TODO: error!
      return false;
    }

    var sheet = this._getClientSheet();
    sheet.appendRow(this._clientToRow(client));
    return true;
  },

  /*
   * Return a client object for the token or Nil.
   */
  getClientByToken: function (token) {
    return this._withLock(() => {
      var clients = this._getAllClients();

      for (var i = 0; i < clients.length; i++) {
        if (clients[i].token == token)
          return clients[i];
      }
      return null;
    });
  },

  /*
   * Update spreadshet by token.
   */
  updateClient: function (client) {
    return this._withLock(() => {
      return this._updateClient(client);
    });
  },

  /*
   * Internal implementation of updateClient().
   */
  _updateClient: function (client, create = false) {
    var clients = this._getAllClients();
    var sheet = this._getClientSheet();

    for (var i = 0; i < clients.length; i++) {
      if (clients[i].token == client.token) {
        // Raw row data
        var rawData = this._clientToRow(client);
        // Skip header and rows start at 1
        var row = i + 1 + this._headerRows;
        // getRange(row, column, numRows, numColumns)
        var range = sheet.getRange(row, 1, 1, rawData.length);
        // Update data
        range.setValues([rawData]);
        return true;
      }
    }
    return false;
  },

  updateOrCreateClient: function (client) {
    return this._withLock(() => {
      var exists = this._updateClient(client);
      if (!exists) {
        this._appendClient(client);
      }
      return exists;
    });
  },
};