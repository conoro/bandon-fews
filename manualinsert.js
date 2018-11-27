#!/usr/bin/env node
/**
 * Copyright 2015 Conor O'Neill, cwjoneill@gmail.com
 * Portions copyright Google Inc. All Rights Reserved.
 * Bandon FEWS (Bandon Flood Early Warning System)
 * Manually insert levels when http://www.bandonfloodwarning.ie/ is being unreliable
 * and save it in Google Fusion Tables at https://www.google.com/fusiontables/DataSource?docid=103YIcARoxuaWT7NfZ8mVBzY554sF_3ONYC1N3DE#rows:id=1
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var fs = require('fs');
var google = require('googleapis');
var moment = require("moment");

var OAuth2Client = google.auth.OAuth2;
var fusion = google.fusiontables('v2');

var config = {};
var oTokens = {};
var client_id;
var client_secret;
var redirect_url;
var fewsUrl;
var fusiontables_id;

config = require(__dirname + '/config.json');
oTokens = require(__dirname + '/tokens.json');


var oauth2Client = new OAuth2Client(config.client_id, config.client_secret, config.redirect_url);

function getAccessToken(oauth2Client, callback) {
 // TO-DO - Handle Token expiry and refresh
  if (oTokens.access_token){
    oauth2Client.setCredentials(oTokens);
    callback();
  } else {
    // generate consent page url
    var url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // will return a refresh token
      scope: 'https://www.googleapis.com/auth/fusiontables' // can be a space-delimited string or an array of scopes
    });
    console.log('Visit the url: ', url);
    rl.question('Enter the code here:', function(code) {
      // request access token
      oauth2Client.getToken(code, function(err, tokens) {
        // set tokens to the client
        oauth2Client.setCredentials(tokens);
        fs.writeFile(__dirname + "/tokens.json", JSON.stringify(tokens, null, 4), function(err) {
          if(err) {
            console.log(err);
          } else {
            console.log("new tokens saved to tokens.json");
          }
        });
        callback();
      });
    });
  }
}

// Main code. Retrieve a Google OAuth access token, get latest water level. Save to Google Fusion Tables
getAccessToken(oauth2Client, function() {

  // Take date and water level from command line
  // "DD-MMM-YYYY HH:mm"
  var fusionDate = process.argv[2];
  var waterLevel = process.argv[3];

  var checkLast = "SELECT * FROM " + config.fusiontables_id + " WHERE datetime='" + fusionDate + "'";

  // See if that level/time is already in Fusion Tables
  fusion.query.sqlGet({auth: oauth2Client, sql: checkLast}, function(err, response) {
    if (err) {
      console.log('A query error occured', err);
      return;
    }

    // if not in Fusion Tables then insert
    if(!(response.rows)){
      var insertNew = "INSERT INTO " + config.fusiontables_id + " (riverlevel, datetime) VALUES ('" + waterLevel + "', '" + fusionDate + "')";
      fusion.query.sql({auth: oauth2Client, sql: insertNew}, function(err, response) {
        if (err) {
          console.log('An insert error occured', err);
          return;
        }
        console.log('inserted new row', response.rows[0]);
        return;
      });
    } else {
      console.log("no new updates");
      return;
    }
  });
});
